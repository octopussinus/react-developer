"""Unattended agent workers: spawn, stream, log, report.

One worker is one agent CLI, running headless in its own git worktree, building
one roadmap feature. The orchestrator never sees the worker's reasoning -- it
sees a status line while it runs and a verdict when it stops -- but every byte
is on disk, which is the point.

Why a real process per worker rather than an in-conversation subagent:

* **It works whichever agent you use.** A Claude Code subagent is a Claude Code
  feature. `claude -p`, `codex exec` and `gemini --prompt` are three commands
  with three flag sets and three event streams, and this module is where those
  three differences end. Everything above it is the same pipeline.
* **The history survives the conversation.** A subagent's transcript lives in
  the parent session and is gone when the window is. `.ai/runs/` outlives it.
* **A failure has a cause you can read.** Exit code, stderr, the last tool call
  before it died, the model's own last words -- rather than "the subagent did
  not finish".

The three documented ways parallel agent runs go wrong are all handled here:
a worker that stops to ask a question (nobody is there -- approval is
pre-granted per agent), a worker silently rate-limited (the event is captured
and shown), and a worker that hangs (every run has a deadline).

`stream.jsonl` is written raw, before any parsing. If a CLI changes its event
shape, the transcript degrades to "unrecognised event" lines but the ground
truth is still complete -- a log you cannot trust is worse than no log.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import threading
import time
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .agents import AGENTS, Agent

RUNS_DIR = ".ai/runs"
WORKTREES_DIR = ".worktrees"

#: What a worker is doing, for the live table and for `result.json`.
PENDING, RUNNING, OK, BLOCKED, FAILED, TIMEOUT = (
    "pending", "running", "ok", "blocked", "failed", "timeout",
)


# --------------------------------------------------------------------------- #
# events
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class Event:
    """One thing that happened, in terms every agent has."""

    kind: str  # init | text | thinking | tool | tool-result | note | error | result
    title: str
    body: str = ""
    #: Only where the CLI reports it (Claude does, on the result event).
    cost_usd: float | None = None


def _clip(text: str, limit: int = 400) -> str:
    text = " ".join(str(text).split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _parse_claude(data: dict) -> Iterator[Event]:
    kind = data.get("type")
    if kind == "system" and data.get("subtype") == "init":
        yield Event("init", f"session {data.get('session_id', '?')}",
                    f"model {data.get('model', '?')}, "
                    f"{len(data.get('tools') or [])} tools")
    elif kind == "assistant":
        for block in (data.get("message") or {}).get("content") or []:
            if block.get("type") == "text" and block.get("text", "").strip():
                yield Event("text", _clip(block["text"], 2000))
            elif block.get("type") == "thinking" and block.get("thinking", "").strip():
                yield Event("thinking", _clip(block["thinking"], 600))
            elif block.get("type") == "tool_use":
                yield Event("tool", str(block.get("name", "?")),
                            _clip(json.dumps(block.get("input", {}), ensure_ascii=False)))
    elif kind == "user":
        for block in (data.get("message") or {}).get("content") or []:
            if block.get("type") == "tool_result":
                content = block.get("content")
                text = content if isinstance(content, str) else json.dumps(content)
                yield Event("tool-result", "", _clip(text))
    elif kind == "rate_limit_event":
        info = data.get("rate_limit_info") or {}
        # Worth surfacing: a rate-limited worker looks identical to a slow one.
        if info.get("status") != "allowed":
            yield Event("note", f"rate limit: {info.get('status')}", _clip(json.dumps(info)))
    elif kind == "result":
        cost = data.get("total_cost_usd")
        yield Event("result", "error" if data.get("is_error") else "success",
                    _clip(str(data.get("result", "")), 4000),
                    cost_usd=float(cost) if isinstance(cost, (int, float)) else None)


#: Top-level event types each parser understands, including the ones it
#: deliberately shows nothing for. Anything outside these sets is logged
#: verbatim -- see `parse_line`.
CLAUDE_TYPES = {"system", "assistant", "user", "result", "rate_limit_event",
                "stream_event", "control_request", "control_response"}
CODEX_TYPES = {"thread.started", "turn.started", "turn.completed", "turn.failed",
               "item.started", "item.updated", "item.completed", "error"}
GEMINI_TYPES = {"init", "message", "tool_use", "tool_result", "error", "result"}


def _parse_codex(data: dict) -> Iterator[Event]:
    kind = data.get("type") or ""
    if kind == "thread.started":
        yield Event("init", f"thread {data.get('thread_id', '?')}")
    elif kind == "error":
        yield Event("error", _clip(str(data.get("message") or data)))
    elif kind == "turn.failed":
        yield Event("result", "error", _clip(json.dumps(data.get("error") or data)))
    elif kind == "turn.completed":
        yield Event("result", "success", _clip(json.dumps(data.get("usage") or {})))
    elif kind in {"item.started", "item.completed"}:
        item = data.get("item") or {}
        itype = str(item.get("type") or item.get("item_type") or "item")
        if itype in {"assistant_message", "agent_message"}:
            yield Event("text", _clip(str(item.get("text") or item.get("content") or ""), 2000))
        elif itype == "reasoning":
            yield Event("thinking", _clip(str(item.get("text") or ""), 600))
        elif kind == "item.started":
            yield Event("tool", itype, _clip(json.dumps(item, ensure_ascii=False)))


def _parse_gemini(data: dict) -> Iterator[Event]:
    kind = data.get("type") or ""
    if kind == "init":
        yield Event("init", _clip(json.dumps(data), 200))
    elif kind == "message":
        text = data.get("content") or data.get("text") or ""
        if str(text).strip():
            yield Event("text" if data.get("role") != "user" else "tool-result",
                        _clip(str(text), 2000))
    elif kind == "tool_use":
        yield Event("tool", str(data.get("name", "?")),
                    _clip(json.dumps(data.get("input") or data.get("args") or {})))
    elif kind == "tool_result":
        yield Event("tool-result", "", _clip(json.dumps(data.get("result") or data)))
    elif kind == "error":
        yield Event("error", _clip(str(data.get("message") or data)))
    elif kind == "result":
        failed = bool(data.get("error"))
        yield Event("result", "error" if failed else "success",
                    _clip(str(data.get("response") or data.get("error") or ""), 4000))


PARSERS: dict[str, tuple[Callable[[dict], Iterator[Event]], set[str]]] = {
    "claude": (_parse_claude, CLAUDE_TYPES),
    "codex": (_parse_codex, CODEX_TYPES),
    "gemini": (_parse_gemini, GEMINI_TYPES),
}


def parse_line(stream: str, line: str) -> list[Event]:
    """Turn one stdout line into events, never raising.

    A line of a type the parser does not know becomes a `raw` event rather
    than nothing: the promise of the log is that it is complete, and a parser
    that quietly drops what it has not seen before breaks that promise on
    exactly the day a CLI adds an event.

    A KNOWN type that has nothing to show -- a token counter, an allowed
    rate-limit ping, an empty thinking block -- yields nothing at all. Dumping
    those as "unrecognised" buries the three lines that matter under forty
    that do not, which is its own way of losing the history.
    """
    line = line.strip()
    if not line:
        return []
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        return [Event("raw", _clip(line, 500))]
    if not isinstance(data, dict):
        return [Event("raw", _clip(line, 500))]

    parser, known = PARSERS.get(stream, (None, set()))
    if parser is None:
        return [Event("raw", _clip(line, 300))]
    events = list(parser(data))
    if events:
        return events
    return [] if str(data.get("type")) in known else [Event("raw", _clip(line, 300))]


# --------------------------------------------------------------------------- #
# the command
# --------------------------------------------------------------------------- #

def headless_command(
    agent: Agent,
    prompt: str,
    *,
    model: str | None = None,
    effort: str | None = None,
) -> list[str]:
    """The exact argv for one unattended run of ``agent``."""
    headless = agent.headless
    if headless is None or not agent.cli_bin:
        raise ValueError(f"{agent.name} cannot run unattended")

    argv = [agent.cli_bin, *headless.base]
    chosen_model = model or headless.default_model
    if headless.model_flag and chosen_model:
        argv += [headless.model_flag, chosen_model]
    chosen_effort = effort or headless.default_effort
    if headless.effort_flag and chosen_effort:
        argv += [headless.effort_flag, chosen_effort]

    if headless.prompt_flag:
        argv += [headless.prompt_flag, prompt]
    else:
        argv.append(prompt)
    return argv


# --------------------------------------------------------------------------- #
# worktrees
# --------------------------------------------------------------------------- #

def _git(project: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args], cwd=project, capture_output=True, text=True,
        timeout=120, check=check,
    )


def ensure_ignored(project: Path) -> bool:
    """Make sure worktrees and run logs stay out of git. Returns True if added.

    Not tidiness. An un-ignored worktree directory puts a second copy of the
    whole project inside `git status`, and the first worker that runs `git add`
    commits the other workers' checkouts into its own branch.

    Anchored (`/.worktrees/`), because the unanchored form would also match a
    `.worktrees` anywhere below `src/`.
    """
    gitignore = project / ".gitignore"
    existing = gitignore.read_text(encoding="utf-8") if gitignore.is_file() else ""
    wanted = [f"/{WORKTREES_DIR}/", f"/{RUNS_DIR}/"]
    missing = [rule for rule in wanted if rule not in existing.split()]
    if not missing:
        return False
    block = "\n# Parallel worker checkouts and their logs (local history).\n"
    gitignore.write_text(
        existing.rstrip("\n") + "\n" + block + "\n".join(missing) + "\n",
        encoding="utf-8",
    )
    return True


def worktree_for(project: Path, branch: str) -> Path:
    return project / WORKTREES_DIR / branch.replace("/", "-")


def add_worktree(project: Path, branch: str, base: str = "HEAD") -> Path:
    """A fresh checkout on a new branch, reusing one that is already there."""
    path = worktree_for(project, branch)
    if path.is_dir():
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    existing = _git(project, "branch", "--list", branch, check=False).stdout.strip()
    args = ["worktree", "add", str(path)]
    args += [branch] if existing else ["-b", branch, base]
    _git(project, *args)
    return path


# --------------------------------------------------------------------------- #
# one worker
# --------------------------------------------------------------------------- #

@dataclass
class Worker:
    """One feature, one worktree, one process."""

    number: str
    slug: str
    prompt: str
    branch: str = ""
    status: str = PENDING
    activity: str = ""
    exit_code: int | None = None
    reason: str = ""
    summary: str = ""
    cost_usd: float | None = None
    started: float = 0.0
    finished: float = 0.0
    log_dir: Path | None = None
    argv: list[str] = field(default_factory=list)

    @property
    def elapsed(self) -> float:
        if not self.started:
            return 0.0
        return (self.finished or time.time()) - self.started


BLOCKER = re.compile(r"\[NEEDS CLARIFICATION", re.IGNORECASE)

TRANSCRIPT_HEAD = """\
# {slug} — {agent}

* **started** {started}
* **worktree** `{worktree}`
* **branch** `{branch}`
* **command** `{command}`

The raw event stream is in `stream.jsonl`; this file is the readable view of it.

---

"""


def _render(event: Event) -> str:
    """One event as a transcript line."""
    if event.kind == "tool":
        return f"- **{event.title}** — `{event.body}`\n"
    if event.kind == "tool-result":
        return f"  ↳ {event.body}\n"
    if event.kind == "thinking":
        return f"<!-- thinking: {event.body} -->\n"
    if event.kind == "text":
        return f"\n{event.title}\n\n"
    if event.kind == "result":
        return f"\n---\n\n**{event.title}**\n\n{event.body}\n"
    if event.kind == "raw":
        return f"<!-- unrecognised event: {event.title} -->\n"
    return f"> _{event.kind}_ {event.title} {event.body}\n".rstrip() + "\n"


def run_worker(
    project: Path,
    worker: Worker,
    agent: Agent,
    run_dir: Path,
    *,
    model: str | None = None,
    effort: str | None = None,
    timeout: int = 3600,
    on_event: Callable[[Worker, Event], None] | None = None,
) -> Worker:
    """Spawn one agent CLI and record everything it does."""
    worker.log_dir = run_dir / worker.slug
    worker.log_dir.mkdir(parents=True, exist_ok=True)
    worker.started = time.time()
    worker.status = RUNNING

    try:
        tree = add_worktree(project, worker.branch)
    except subprocess.CalledProcessError as error:
        worker.status = FAILED
        worker.reason = f"worktree: {(error.stderr or '').strip()[:300]}"
        worker.finished = time.time()
        _write_result(worker, agent)
        return worker

    worker.argv = headless_command(agent, worker.prompt, model=model, effort=effort)
    (worker.log_dir / "prompt.md").write_text(worker.prompt, encoding="utf-8")
    # The argv, quoted, so a failed run can be reproduced by hand without
    # reconstructing it from this file.
    (worker.log_dir / "command.txt").write_text(
        " ".join(_quote(part) for part in worker.argv) + f"\n\n# cwd: {tree}\n",
        encoding="utf-8",
    )

    stream_path = worker.log_dir / "stream.jsonl"
    transcript_path = worker.log_dir / "transcript.md"
    transcript_path.write_text(
        TRANSCRIPT_HEAD.format(
            slug=worker.slug,
            agent=agent.name,
            started=datetime.now(timezone.utc).isoformat(timespec="seconds"),
            worktree=tree,
            branch=worker.branch,
            command=" ".join(_quote(part) for part in worker.argv),
        ),
        encoding="utf-8",
    )

    last_result: Event | None = None
    try:
        with (
            open(stream_path, "w", encoding="utf-8") as raw,
            open(transcript_path, "a", encoding="utf-8") as readable,
            open(worker.log_dir / "stderr.log", "w", encoding="utf-8") as errors,
        ):
            process = subprocess.Popen(
                worker.argv,
                cwd=tree,
                stdout=subprocess.PIPE,
                stderr=errors,
                text=True,
                bufsize=1,
                env={**os.environ, "CI": "1", "NO_COLOR": "1"},
            )
            deadline = time.time() + timeout
            assert process.stdout is not None
            for line in process.stdout:
                raw.write(line)
                raw.flush()
                for event in parse_line(agent.headless.stream, line):
                    readable.write(_render(event))
                    if event.kind == "result":
                        last_result = event
                        if event.cost_usd is not None:
                            worker.cost_usd = round(
                                (worker.cost_usd or 0.0) + event.cost_usd, 6
                            )
                    elif event.kind in {"tool", "text", "note", "error"}:
                        worker.activity = _clip(f"{event.title} {event.body}", 60)
                    if on_event:
                        on_event(worker, event)
                readable.flush()
                if time.time() > deadline:
                    process.kill()
                    worker.status = TIMEOUT
                    worker.reason = f"no result within {timeout}s"
                    break
            worker.exit_code = process.wait(timeout=30)
    except FileNotFoundError:
        worker.status = FAILED
        worker.reason = f"{agent.cli_bin} is not installed"
    except Exception as error:  # noqa: BLE001 - a worker must never take the batch down
        worker.status = FAILED
        worker.reason = f"{type(error).__name__}: {error}"

    worker.finished = time.time()
    _classify(worker, last_result)
    _write_result(worker, agent)
    return worker


def _quote(part: str) -> str:
    return part if re.fullmatch(r"[\w@%+=:,./-]+", part) else "'" + part.replace("'", "'\\''") + "'"


def _classify(worker: Worker, result: Event | None) -> None:
    """Decide what actually happened, preferring the most specific evidence.

    A zero exit code is NOT success on its own: an agent that stopped because it
    hit a question it may not answer also exits 0, and treating that as green is
    how a guess reaches `main`.
    """
    if worker.status in {TIMEOUT, FAILED}:
        return
    if result is not None:
        worker.summary = result.body
    if result is not None and BLOCKER.search(result.body):
        worker.status = BLOCKED
        worker.reason = "stopped on a [NEEDS CLARIFICATION] it may not answer"
    elif worker.exit_code not in (0, None):
        worker.status = FAILED
        worker.reason = worker.reason or f"exit code {worker.exit_code}"
        if worker.log_dir:
            tail = _tail(worker.log_dir / "stderr.log")
            if tail:
                worker.reason += f" — {tail}"
    elif result is not None and result.title == "error":
        worker.status = FAILED
        worker.reason = _clip(result.body, 200) or "the agent reported an error"
    elif result is None:
        worker.status = FAILED
        worker.reason = "the agent exited without reporting a result"
    else:
        worker.status = OK


def _tail(path: Path, lines: int = 3) -> str:
    if not path.is_file():
        return ""
    text = [line for line in path.read_text(encoding="utf-8", errors="replace").splitlines() if line.strip()]
    return _clip(" ".join(text[-lines:]), 200)


def _write_result(worker: Worker, agent: Agent) -> None:
    if worker.log_dir is None:
        return
    (worker.log_dir / "result.json").write_text(
        json.dumps(
            {
                "feature": worker.number,
                "slug": worker.slug,
                "branch": worker.branch,
                "agent": agent.key,
                "status": worker.status,
                "reason": worker.reason,
                "exitCode": worker.exit_code,
                "startedAt": _iso(worker.started),
                "finishedAt": _iso(worker.finished),
                "durationSeconds": round(worker.elapsed, 1),
                "costUsd": worker.cost_usd,
                "summary": worker.summary,
                "command": worker.argv,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def _iso(stamp: float) -> str | None:
    if not stamp:
        return None
    return datetime.fromtimestamp(stamp, tz=timezone.utc).isoformat(timespec="seconds")


# --------------------------------------------------------------------------- #
# the batch
# --------------------------------------------------------------------------- #

def new_run_dir(project: Path) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
    path = project / RUNS_DIR / stamp
    path.mkdir(parents=True, exist_ok=True)
    return path


def run_batch(
    project: Path,
    workers: list[Worker],
    agent: Agent,
    run_dir: Path,
    *,
    model: str | None = None,
    effort: str | None = None,
    timeout: int = 3600,
    on_event: Callable[[Worker, Event], None] | None = None,
) -> list[Worker]:
    """Run every worker at once and wait for all of them.

    A thread each rather than a pool: the threads are blocked on I/O from a
    subprocess, and the whole point of the batch is that they overlap.
    """
    threads = [
        threading.Thread(
            target=run_worker,
            args=(project, worker, agent, run_dir),
            kwargs={"model": model, "effort": effort, "timeout": timeout,
                    "on_event": on_event},
            daemon=True,
        )
        for worker in workers
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    write_manifest(run_dir, workers, agent)
    return workers


def write_manifest(run_dir: Path, workers: list[Worker], agent: Agent) -> None:
    (run_dir / "run.json").write_text(
        json.dumps(
            {
                "agent": agent.key,
                "agentName": agent.name,
                "finishedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "workers": [
                    {
                        "feature": worker.number,
                        "slug": worker.slug,
                        "branch": worker.branch,
                        "status": worker.status,
                        "reason": worker.reason,
                        "durationSeconds": round(worker.elapsed, 1),
                        "log": str(worker.log_dir) if worker.log_dir else None,
                    }
                    for worker in workers
                ],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def past_runs(project: Path) -> list[dict]:
    """Every recorded batch, newest first."""
    root = project / RUNS_DIR
    if not root.is_dir():
        return []
    runs: list[dict] = []
    for entry in sorted(root.iterdir(), reverse=True):
        manifest = entry / "run.json"
        if not manifest.is_file():
            # A run that is still going, or one that died before it finished.
            runs.append({"id": entry.name, "agent": "?", "workers": [], "partial": True})
            continue
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        data["id"] = entry.name
        runs.append(data)
    return runs


# --------------------------------------------------------------------------- #
# the prompt
# --------------------------------------------------------------------------- #

WORKER_PROMPT = """\
Build roadmap feature {number} ({slug}) end to end, by yourself, in this checkout.

You are an unattended worker. There is no terminal, nobody is watching, and you
cannot ask anything. Everything you need is in this repository.

## Run the pipeline, in order

1. {feature_cmd}
2. {spec_cmd}
3. {implement_cmd}

`react-implement` already chains verify, analyze and review. When it reports
green, you are done.

## First command, before any of that: `npm ci`

This is a fresh git worktree and `node_modules` is gitignored, so there is none.
Without it every gate fails on `prettier: not found` before reaching anything
real. `npm ci` installs exactly the lockfile and errors if `package.json` and
the lock disagree, which is itself worth knowing first.

## Never guess

If the spec produces a `[NEEDS CLARIFICATION]`, or you hit anything the spec
does not cover, **stop and say so as your final answer** with that exact marker
in it. A guess made in an isolated worktree is a guess nobody sees until it is
merged, which is the most expensive place to find one. Stopping with a question
is a successful run.

## Stay inside your own module

You were given one feature: one page of one module. Do not touch another
module's files and do not promote anything into a shared layer — another worker
may be editing it right now, and git will merge both cleanly into something that
does not build. If the feature genuinely needs a shared component changed, stop
and say which.

## You do not land anything

Never run {ship_cmd} or {merge_cmd}, and never push. Branches land one at a
time, in the order they finish, from the session that started you — each of you
passed a gate against the base as it was when you began, which is not the base
you would be landing on. Your job ends at a green branch.

## Finish with

The branch name, what you built, the gate results, and either
"green, ready to land" or the one thing that stopped you.
"""


def worker_prompt(agent: Agent, number: str, slug: str) -> str:
    """The brief, in the invocation syntax the chosen agent actually uses."""

    def command(skill: str) -> str:
        name = skill.removeprefix("react-") if agent.strips_prefix else skill
        return f"`{agent.invoke_prefix}{name}`"

    return WORKER_PROMPT.format(
        number=number,
        slug=slug,
        feature_cmd=command("react-feature"),
        spec_cmd=command("react-spec"),
        implement_cmd=command("react-implement"),
        ship_cmd=command("react-ship"),
        merge_cmd=command("react-merge"),
    )


def branch_for(number: str, slug: str) -> str:
    clean = re.sub(r"[^a-z0-9-]+", "-", slug.lower()).strip("-")
    return f"feature/{int(number):03d}-{clean}" if number.isdigit() else f"feature/{clean}"


def available_agents() -> list[Agent]:
    """Agents that can run unattended AND are actually installed."""
    return [
        agent
        for agent in AGENTS.values()
        if agent.headless is not None and agent.cli_bin and shutil.which(agent.cli_bin)
    ]
