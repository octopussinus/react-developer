"""The mobile port, in parallel: waves of headless workers, landed one by one.

`react-dev dispatch` in a react-native project. The unit of work is a FILE the
copier (`npm run port`) says must be translated, and the order comes from the
copier too: `npm run port -- --plan` lists the frontier -- files whose every
import is already native. Frontier files never depend on each other, so they
can go to separate agents at the same time; when a wave lands, the port runs,
and the next frontier opens.

Each wave:

1. Slice the frontier by area of the app (a module, a component layer), at
   most ``files_per_worker`` per slice, at most ``limit`` slices at once.
2. Give each slice a git worktree branched from HEAD, install it, point its
   copier at the web app, and start one headless agent in it -- the same
   `runner.py` workers `dispatch` uses for web features, so the agent is a
   flag, not a code path.
3. Land each finished worker by COPYING ITS FILES ONLY: the files it was
   given and their native tests. Generated files (barrels, PORT.md, routes)
   are never taken from a worker -- they are regenerated here, from all the
   landed work together, which is what makes parallel workers merge-free.
4. After each worker: `npm run port` and `npm run typecheck`. Red -> that
   worker's files are taken back out, and the reason is kept in its log.
5. After the wave: lint and tests. Red -> the whole wave is undone and the run
   stops, because something only visible in combination broke.
6. Commit the wave, so the next wave's worktrees (branched from HEAD) see it.

Nothing here names a vendor: `runner.headless_command` builds the argv.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import threading
from dataclasses import dataclass, field
from pathlib import Path

from .agents import Agent
from .runner import (
    BLOCKED,
    FAILED,
    OK,
    Worker,
    add_worktree,
    run_batch,
    worktree_for,
)

#: Files a worker may change besides its own: everything the copier regenerates.
#: They are never landed from a worker, so a worker running `npm run port` to
#: check itself is fine -- and expected.
GENERATED = (
    "PORT.md",
    ".react-dev-port.json",
    ".react-dev-port.ignore",
    ".env.development",
    ".env.example",
    "src/config/env.ts",
    "src/styles/",
    "src/platform/icons.ts",
    "src/app/",
    "src/uniwind-types.d.ts",
    "package-lock.json",
)


@dataclass
class Slice:
    """One worker's share of a wave: files from one area of the app."""

    group: str
    items: list[dict] = field(default_factory=list)

    @property
    def lines(self) -> int:
        return sum(int(item.get("lines", 0)) for item in self.items)

    @property
    def natives(self) -> list[str]:
        return [item["native"] for item in self.items]


# --------------------------------------------------------------------------- #
# planning
# --------------------------------------------------------------------------- #

def read_plan(project: Path, web_root: Path | None = None) -> dict:
    """The copier's frontier, as JSON. Read-only."""
    argv = ["node", "tools/port/index.mjs", "--plan"]
    if web_root is not None:
        argv += ["--from", str(web_root)]
    result = subprocess.run(argv, cwd=project, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(
            "`npm run port -- --plan` failed: "
            + (result.stderr.strip() or result.stdout.strip())[:500]
        )
    return json.loads(result.stdout)


def slice_frontier(frontier: list[dict], *, files_per_worker: int, limit: int) -> list[Slice]:
    """Pack the frontier into at most ``limit`` slices, by area of the app.

    Areas holding back the most first, each split into chunks of ``files_per_worker``; small
    areas are topped up together so no worker gets one 20-line file. Areas are
    kept whole where they fit, because the files of one area read the same
    neighbours and the same web module.
    """
    groups: dict[str, list[dict]] = {}
    for item in frontier:
        groups.setdefault(item.get("group") or "misc", []).append(item)

    # What a file holds back (`unlocks`, from the plan) decides the order: one
    # locale helper can free hundreds of copies, a leaf screen frees none.
    def weight(items: list[dict]) -> int:
        return max((int(i.get("unlocks", 0)) for i in items), default=0)

    chunks: list[Slice] = []
    for group, items in sorted(groups.items(), key=lambda kv: (-weight(kv[1]), -len(kv[1]), kv[0])):
        items = sorted(items, key=lambda item: (-int(item.get("unlocks", 0)), item["native"]))
        for start in range(0, len(items), files_per_worker):
            chunks.append(Slice(group, items[start:start + files_per_worker]))

    # Top up: merge small chunks into earlier ones that still have room.
    packed: list[Slice] = []
    for chunk in chunks:
        home = next(
            (s for s in packed if len(s.items) + len(chunk.items) <= files_per_worker),
            None,
        )
        if home is None:
            packed.append(Slice(chunk.group, list(chunk.items)))
        else:
            home.items.extend(chunk.items)
            if chunk.group not in home.group.split(" + "):
                home.group = f"{home.group} + {chunk.group}"
    return packed[:limit]


# --------------------------------------------------------------------------- #
# the worker's brief
# --------------------------------------------------------------------------- #

PORT_PROMPT = """\
Translate these files of a web React app to React Native (Expo), in this
checkout. You are an unattended worker: nobody can answer a question, and
other workers are translating other files of the same app right now.

## Your files

The web app is at `{web_root}` -- READ ONLY, never write there.

{files}

## How

1. Read `.agents/skills/react-native-port/references/translate.md` once, and
   the house style in `src/components/atoms/button.tsx`. Use the
   `{port_skill}` skill's rules; do NOT run its loop -- you have a fixed list.
2. For each file: read the web file, write the native one at the native path.
   Same exports, prop names, translation keys and Tailwind classes; change only
   what React Native cannot do. Icons from `@/platform/icons`.
3. A component you write gets a test beside it, `<name>.native.test.tsx`
   (React Native Testing Library 14: `await render(...)`).
4. Check your work -- all three must pass for your files:
   `npm run port` (it must list every file above as done, none "in progress"),
   `npm run typecheck`, `npm run lint`.

## Rules

- Write ONLY the native files listed above and their `.native.test.tsx`
  files. Nothing else you change is kept: not copied files, not barrels, not
  package.json. Install nothing.
- Do not commit, push or switch branches.
- If a file truly cannot be done without a decision -- a package Expo Go does
  not ship, behaviour the web file does not define -- skip it and end your
  answer with `[NEEDS CLARIFICATION: <file>: <the decision>]`. Do the others.

## Finish with

Each file and whether it is done, and the result of the three checks.
"""


def port_prompt(agent: Agent, web_root: Path, chunk: Slice) -> str:
    """The brief, in the invocation syntax the chosen agent uses."""
    name = "react-native-port"
    skill = name.removeprefix("react-") if agent.strips_prefix else name
    files = "\n".join(
        f"- `{item['native']}` <- `{item['web']}`"
        + (" (stale: port the web change into the existing native file)"
           if item.get("state") == "stale" else "")
        for item in chunk.items
    )
    return PORT_PROMPT.format(
        web_root=web_root, files=files, port_skill=f"{agent.invoke_prefix}{skill}"
    )


# --------------------------------------------------------------------------- #
# git and npm, in the main checkout and the worktrees
# --------------------------------------------------------------------------- #

def _run(argv: list[str], cwd: Path, timeout: int = 900) -> subprocess.CompletedProcess[str]:
    return subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=timeout)


def _npm(cwd: Path, *args: str, timeout: int = 900) -> subprocess.CompletedProcess[str]:
    return _run(["npm", *args], cwd, timeout)


def has_commit(project: Path) -> bool:
    return _run(["git", "rev-parse", "--verify", "HEAD"], project).returncode == 0


def dirty_files(project: Path) -> list[str]:
    out = _run(["git", "status", "--porcelain"], project).stdout
    return [line[3:] for line in out.splitlines() if line.strip()]


def prepare_worktree(project: Path, branch: str, web_root: Path) -> tuple[Path, str]:
    """A worktree ready for an agent: dependencies installed, copier aimed.

    Installing HERE, not in the agent's prompt: some agents' sandboxes have no
    network, and an install that fails inside the agent fails every check it
    runs after it -- for a reason that has nothing to do with its files.
    """
    tree = add_worktree(project, branch)
    install = _npm(tree, "ci", "--prefer-offline", "--no-audit", "--no-fund")
    if install.returncode != 0:
        return tree, (install.stderr or install.stdout).strip()[-400:]
    # The recorded web app is relative to the main checkout; from inside
    # `.worktrees/<branch>` it would point nowhere.
    manifest = tree / ".react-dev-port.json"
    data = json.loads(manifest.read_text(encoding="utf-8")) if manifest.is_file() else {"files": {}}
    data["from"] = str(web_root)
    manifest.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return tree, ""


def remove_worktree(project: Path, branch: str) -> None:
    tree = worktree_for(project, branch)
    _run(["git", "worktree", "remove", "--force", str(tree)], project)
    _run(["git", "branch", "-D", branch], project)


def allowed(native: str, owned: set[str]) -> bool:
    """A worker's own file, or the native test of one."""
    if native in owned:
        return True
    if native.endswith(".native.test.tsx"):
        stem = native.removesuffix(".native.test.tsx")
        return any(own.rsplit(".", 1)[0] == stem for own in owned)
    return False


def changed_in(tree: Path) -> list[str]:
    """Every path the worker touched, new files included."""
    out = _run(["git", "status", "--porcelain", "--untracked-files=all"], tree).stdout
    return [line[3:].strip() for line in out.splitlines() if line.strip()]


# --------------------------------------------------------------------------- #
# landing
# --------------------------------------------------------------------------- #

@dataclass
class Landing:
    landed: list[str] = field(default_factory=list)
    ignored: list[str] = field(default_factory=list)


def stage(tree: Path, chunk: Slice, staging: Path) -> Landing:
    """Copy one worker's own files out of its worktree, and list the rest.

    Staged rather than landed straight away: every worktree has to be gone
    before the main checkout is type-checked, or `tsc` and the linters sweep
    up the other workers' half-finished copies under `.worktrees/`.
    """
    owned = set(chunk.natives)
    result = Landing()
    for rel in changed_in(tree):
        if allowed(rel, owned):
            source = tree / rel
            if source.is_file():
                target = staging / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
                result.landed.append(rel)
        elif not rel.startswith(GENERATED) and not rel.startswith("node_modules"):
            result.ignored.append(rel)
    return result


def land(project: Path, staging: Path, files: list[str]) -> None:
    for rel in files:
        target = project / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(staging / rel, target)


def take_back(project: Path, files: list[str]) -> None:
    """Undo landed files: tracked ones from HEAD, new ones deleted."""
    for rel in files:
        if _run(["git", "cat-file", "-e", f"HEAD:{rel}"], project).returncode == 0:
            _run(["git", "checkout", "HEAD", "--", rel], project)
        else:
            (project / rel).unlink(missing_ok=True)


FAILING_FILE = re.compile(r"^\s*FAIL\s+(\S+\.(?:test|native\.test)\.[jt]sx?)", re.MULTILINE)


def failing_tests(project: Path) -> tuple[bool, set[str]]:
    """Run the whole test suite; the test FILES that fail.

    Compared against the same list from before a wave, never against zero: a
    web app can carry failing tests of its own (they fail on the web side too,
    and the port copies them faithfully), and a gate that demands zero would
    undo every wave for a bug no worker touched.
    """
    result = _npm(project, "test", timeout=3600)
    output = result.stdout + result.stderr
    return result.returncode == 0, set(FAILING_FILE.findall(output))


def preflight(project: Path) -> tuple[bool, str, set[str]]:
    """Is the base worth spending agent time on? And which tests already fail.

    Type errors or lint errors in the base would reject every worker's files
    on landing, whatever their quality -- so they stop the run before a single
    agent starts.
    """
    green, reason = gate(project, "port", "typecheck", "lint")
    if not green:
        return False, reason, set()
    _ok, failing = failing_tests(project)
    return True, "", failing


def gate(project: Path, *scripts: str) -> tuple[bool, str]:
    """Run npm scripts in order; the first red one's output is the reason."""
    for script in scripts:
        result = _npm(project, "run", script, timeout=1800)
        if result.returncode != 0:
            text = (result.stdout + result.stderr).strip().splitlines()
            errors = [line for line in text if "error" in line.lower()] or text
            return False, f"{script}: " + " | ".join(errors[:4])[:600]
    return True, ""


# --------------------------------------------------------------------------- #
# one wave
# --------------------------------------------------------------------------- #

@dataclass
class WaveResult:
    workers: list[Worker]
    landed: list[str]
    rejected: dict[str, str]
    undone: str = ""
    #: Web tests that came across in this wave and fail. Not the workers'
    #: doing -- the port copied them faithfully -- so reported, not undone.
    new_red_tests: list[str] = field(default_factory=list)


def test_files(project: Path) -> set[str]:
    out = _run(["git", "ls-files", "*.test.ts", "*.test.tsx"], project).stdout
    return {line.strip() for line in out.splitlines() if line.strip()}


def run_wave(
    project: Path,
    web_root: Path,
    agent: Agent,
    slices: list[Slice],
    run_dir: Path,
    wave: int,
    *,
    model: str | None,
    effort: str | None,
    timeout: int,
    baseline: set[str] | None = None,
    on_event=None,
    on_status=None,
) -> WaveResult:
    say = on_status or (lambda _message: None)
    tests_before = test_files(project)
    workers = [
        Worker(
            number=f"{wave}.{index + 1}",
            slug=f"wave{wave}-{index + 1}",
            branch=f"port/wave{wave}-{index + 1}",
            prompt=port_prompt(agent, web_root, chunk),
        )
        for index, chunk in enumerate(slices)
    ]

    # Worktrees and installs in parallel: npm is the slow part of a small slice.
    say(f"wave {wave}: preparing {len(workers)} worktree(s)")
    problems: dict[str, str] = {}

    def prepare(worker: Worker) -> None:
        _tree, error = prepare_worktree(project, worker.branch, web_root)
        if error:
            problems[worker.slug] = error

    threads = [threading.Thread(target=prepare, args=(w,)) for w in workers]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    ready = [w for w in workers if w.slug not in problems]
    for worker in workers:
        if worker.slug in problems:
            worker.status, worker.reason = FAILED, f"npm ci: {problems[worker.slug]}"

    say(f"wave {wave}: {len(ready)} worker(s) translating")
    run_batch(project, ready, agent, run_dir, model=model, effort=effort,
              timeout=timeout, on_event=on_event)

    # Stage every worker's own files, THEN remove every worktree, THEN land.
    staged: list[tuple[Worker, Landing, Path]] = []
    for worker, chunk in zip(workers, slices):
        # A blocked worker still did the files it could; those are kept.
        if worker.status not in (OK, BLOCKED):
            continue
        staging = run_dir / worker.slug / "files"
        landing = stage(worktree_for(project, worker.branch), chunk, staging)
        if landing.ignored and worker.log_dir:
            (worker.log_dir / "ignored.txt").write_text(
                "Changed by the worker, outside its files, and NOT landed:\n"
                + "\n".join(landing.ignored) + "\n",
                encoding="utf-8",
            )
        if landing.landed:
            staged.append((worker, landing, staging))
    for worker in workers:
        remove_worktree(project, worker.branch)

    landed: list[str] = []
    rejected: dict[str, str] = {}
    for worker, landing, staging in staged:
        say(f"wave {wave}: landing {worker.slug} ({len(landing.landed)} file(s))")
        land(project, staging, landing.landed)
        green, reason = gate(project, "port", "typecheck")
        if not green:
            take_back(project, landing.landed)
            _npm(project, "run", "port")
            rejected[worker.slug] = reason
            worker.status, worker.reason = FAILED, f"rejected on landing -- {reason}"
            if worker.log_dir:
                (worker.log_dir / "landing.txt").write_text(reason + "\n", encoding="utf-8")
            continue
        landed.extend(landing.landed)

    if not landed:
        return WaveResult(workers, landed, rejected)

    say(f"wave {wave}: lint and tests on {len(landed)} landed file(s)")
    green, reason = gate(project, "port", "lint")
    arrived_red: list[str] = []
    if green:
        _ok, failing = failing_tests(project)
        fresh = failing - (baseline or set())
        # A test that existed and passed before the wave and fails now: the
        # wave broke it. A web test the port only copied in THIS wave and that
        # fails: a finding about the web app (or the port), not the workers.
        broken = sorted(test for test in fresh if test in tests_before)
        arrived_red = sorted(test for test in fresh if test not in tests_before)
        native_broken = sorted(t for t in arrived_red if ".native.test." in t)
        if broken or native_broken:
            green, reason = False, "tests the wave broke: " + ", ".join((broken + native_broken)[:6])
            arrived_red = [t for t in arrived_red if t not in native_broken]
    if not green:
        # Something only broke in combination. Undo the whole wave.
        take_back(project, landed)
        _npm(project, "run", "port")
        return WaveResult(workers, [], rejected, undone=reason)

    _run(["git", "add", "-A"], project)
    _run(
        ["git", "commit", "-q", "-m",
         f"port: wave {wave} -- {len(landed)} file(s) translated by "
         f"{len(staged) - len(rejected)} worker(s)"],
        project,
    )
    return WaveResult(workers, landed, rejected, new_red_tests=arrived_red)
