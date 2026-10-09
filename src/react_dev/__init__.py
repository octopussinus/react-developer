#!/usr/bin/env python3
"""React Developer CLI.

Bootstraps a feature-sliced React (Vite) project wired for Claude Code, Codex
and Gemini CLI, with a verification gate and a feedback loop that closes.

    react-dev init my-app
    react-dev init my-app --agent claude --agent codex
    react-dev doctor
    react-dev sync
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import typer
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from typer.core import TyperGroup

from .agents import (
    AGENTS,
    CANONICAL_SKILLS_DIR,
    DEFAULT_AGENTS,
    emit_for_agent,
    prune_stale_wiring,
    read_skill_frontmatter,
)
from .project import (
    MANIFEST,
    STAGES,
    classify_drift,
    diagnose,
    file_hashes,
    current_branch,
    FeatureStatus,
    parallel_batch,
    pipeline_status,
    prerequisite_status,
    read_manifest,
    restamp,
    template_fingerprint,
    write_manifest,
)
from .runner import (
    OK,
    RUNNING,
    Worker,
    available_agents,
    branch_for,
    ensure_ignored,
    headless_command,
    new_run_dir,
    past_runs,
    run_batch,
    worker_prompt,
    worktree_for,
    write_manifest as write_run_manifest,
)
from .porting import (
    dirty_files,
    has_commit,
    port_prompt,
    preflight,
    read_plan,
    run_wave,
    slice_frontier,
)
from .ui import StepTracker, console, select_with_arrows, show_banner

__version__ = "1.1.0"

PROJECT_TYPES = {
    "react": "React (Vite) — web, feature-sliced, TanStack Query + Zod",
    "react-native": "React Native (Expo SDK 57, Expo Go) — the mobile app of a react-dev web app",
}

#: Skills that belong to the mobile app. Every other skill is the web pipeline,
#: and the web pipeline's commands (`npm run gen`, Playwright, Storybook) do not
#: exist in a mobile project -- an agent offered them runs commands that fail.
NATIVE_SKILLS = ("react-native-port", "react-native-parallel", "react-native-verify")

#: Order the workflow is meant to be used in. Drives the Next Steps panel.
WORKFLOW_ORDER = [
    "react-constitution",
    "react-roadmap",
    "react-prerequisites",
    "react-feature",
    "react-spec",
    "react-clarify",
    "react-implement",
    "react-component",
    "react-publish",
    "react-parallel",
    "react-verify",
    "react-analyze",
    "react-review",
    "react-ship",
    "react-merge",
    "react-feedback",
    "react-update",
    "react-i18n",
    "react-theme",
    "react-mobile",
    "react-native-port",
    "react-native-parallel",
    "react-native-verify",
]


class _Group(TyperGroup):
    def invoke(self, ctx):  # noqa: D102
        show_banner()
        return super().invoke(ctx)


app = typer.Typer(
    name="react-dev",
    help="Agent-agnostic React workflow with real verification.",
    add_completion=False,
    cls=_Group,
    no_args_is_help=True,
)


# --------------------------------------------------------------------------- #
# asset resolution
# --------------------------------------------------------------------------- #

def _asset_root(name: str) -> Path:
    """Locate bundled assets, installed or in a source checkout."""
    candidates = [
        Path(sys.prefix) / "share" / "react-developer" / name,
        Path(__file__).resolve().parent.parent.parent / name,
    ]
    for path in candidates:
        if path.is_dir():
            return path
    raise FileNotFoundError(
        f"could not locate bundled '{name}'. Looked in: "
        + ", ".join(str(c) for c in candidates)
    )


def _skill_names(skills_root: Path, project_type: str | None = None) -> list[str]:
    """The skills a project of this type gets; every skill when no type is given."""
    found = {p.parent.name for p in skills_root.glob("*/SKILL.md")}
    if project_type == "react-native":
        found &= set(NATIVE_SKILLS)
    elif project_type is not None:
        found -= set(NATIVE_SKILLS)
    ordered = [n for n in WORKFLOW_ORDER if n in found]
    return ordered + sorted(found - set(ordered))


def _template_roots(template_source: Path, project_type: str) -> tuple[Path, ...]:
    """The template directories a project of this type is made from, in copy order.

    The web app is its own template plus the shared scaffolding (CI, the web
    pipeline's subagents, GUIDE.md). The mobile app is self-contained: the
    shared files describe the web pipeline, and a mobile project wired with
    them would offer subagents for gates it does not have.

    The LAST root is the one holding the agent wiring (`.claude/agents`).
    """
    if project_type == "react-native":
        return (template_source / "react-native",)
    return (template_source / project_type, template_source / "shared")


def _copy_tree(src: Path, dest: Path) -> int:
    """Copy a directory tree, skipping build artefacts. Returns item count."""
    skip = {"node_modules", "dist", ".expo", "__pycache__", ".turbo"}
    count = 0
    for item in src.rglob("*"):
        if any(part in skip for part in item.parts):
            continue
        target = dest / item.relative_to(src)
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target)
            count += 1
    return count



def _invocation(agent, skill: str) -> str:
    """How the user types this skill in that agent."""
    name = skill.removeprefix("react-") if agent.strips_prefix else skill
    return f"{agent.invoke_prefix}{name}"


def _first_sentence(text: str, limit: int = 58) -> str:
    """First sentence, cut on word boundaries.

    Splitting on "." alone truncates at abbreviations like "AGENTS.md", so only
    a period followed by whitespace ends a sentence.
    """
    import re

    sentence = re.split(r"\.\s", text.strip(), maxsplit=1)[0].rstrip(".")
    if len(sentence) <= limit:
        return sentence
    return sentence[:limit].rsplit(" ", 1)[0] + "…"



#: One backup directory per sync run, so a run is reversible as a unit.
_BACKUP_STAMP = __import__("datetime").datetime.now().strftime("%Y%m%d-%H%M%S")


def _add_missing_template_files(
    project: Path,
    template_root: Path,
    user_owned: set[str],
    *,
    force: bool = False,
    removed: frozenset[str] = frozenset(),
    updatable: frozenset[str] | None = None,
) -> tuple[list[str], list[str]]:
    """Copy template files the project lacks.

    Create-only by default: anything that exists and differs is reported, not
    touched -- it may be the user's edit or a template change they still need,
    and only they can tell which. Silently discarding work is worse than
    leaving a known gap.

    With ``force``, differing files ARE overwritten -- but every original is
    copied into ``.react-dev-backup/<timestamp>/`` first, so the operation is
    always reversible.

    Returns (added, differing-or-overwritten).
    """
    skip = {"node_modules", "dist", "coverage", "playwright-report",
            "test-results", "storybook-static", "__pycache__"}
    # Build artefacts and lockfiles always differ and mean nothing here.
    skip_suffix = (".tsbuildinfo",)
    # package.json is merged, not copied -- see _merge_package_json. Overwriting
    # it drops dependencies the user's own code imports.
    skip_names = {"package-lock.json", "package.json"}
    added: list[str] = []
    differing: list[str] = []

    if not template_root.is_dir():
        return added, differing

    for source in sorted(p for p in template_root.rglob("*") if p.is_file()):
        relative = source.relative_to(template_root)
        if any(part in skip for part in relative.parts):
            continue
        if relative.name.endswith(skip_suffix) or relative.name in skip_names:
            continue
        if str(relative) in user_owned:
            continue
        # The project deliberately deleted this; do not resurrect it.
        if str(relative) in removed:
            continue

        target = project / relative
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            added.append(str(relative))
        elif target.read_bytes() != source.read_bytes():
            differing.append(str(relative))
            may_write = force or (updatable is not None and str(relative) in updatable)
            if may_write:
                backup = project / ".react-dev-backup" / _BACKUP_STAMP / relative
                backup.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(target, backup)
                shutil.copy2(source, target)

    return added, differing



def _merge_package_json(project: Path, template_pkg: Path) -> list[str]:
    """Merge the template's scripts and dependencies into the project's package.json.

    package.json is the one file that ALWAYS accumulates the user's own
    additions -- every `npm install` and every `shadcn add` writes to it. A
    straight overwrite silently removes dependencies their code imports, which
    is exactly how a force-sync once broke a working feature by dropping
    lucide-react.

    So: the template wins on the things it owns (scripts are the gates, and its
    dependency versions are the tested ones), and everything the user added is
    kept. Returns a list of what changed, for reporting.
    """
    target = project / "package.json"
    if not target.is_file() or not template_pkg.is_file():
        return []

    project_data = json.loads(target.read_text(encoding="utf-8"))
    template_data = json.loads(template_pkg.read_text(encoding="utf-8"))
    changes: list[str] = []

    # Scripts the template defines are the gates; keep any the user added.
    for name, command in template_data.get("scripts", {}).items():
        if project_data.setdefault("scripts", {}).get(name) != command:
            changes.append(f"script {name}")
            project_data["scripts"][name] = command

    # Union the dependency maps, template version winning on shared keys.
    for field in ("dependencies", "devDependencies"):
        merged = dict(project_data.get(field, {}))
        for name, version in template_data.get(field, {}).items():
            if merged.get(name) != version:
                changes.append(f"{field[:-12] or field} {name}@{version}")
                merged[name] = version
        if merged:
            project_data[field] = dict(sorted(merged.items()))

    for field in ("engines", "type", "private"):
        if field in template_data and project_data.get(field) != template_data[field]:
            changes.append(field)
            project_data[field] = template_data[field]

    if changes:
        target.write_text(json.dumps(project_data, indent=2) + "\n", encoding="utf-8")
    return changes


def _tool_exists(name: str) -> bool:
    return shutil.which(name) is not None


# --------------------------------------------------------------------------- #
# commands
# --------------------------------------------------------------------------- #

@app.command()
def init(
    name: str = typer.Argument(None, help="Project directory. Use '.' for the current one."),
    project_type: str = typer.Option(None, "--type", "-t", help="react | react-native"),
    port_from: Path = typer.Option(
        None, "--from",
        help="react-native only: the react-dev web app this mobile app is ported from.",
    ),
    agent: list[str] = typer.Option(None, "--agent", "-a",
                                    help="claude | codex | gemini. Repeatable. Default: all three."),
    here: bool = typer.Option(False, "--here", help="Initialize in the current directory."),
    force: bool = typer.Option(False, "--force", help="Merge into a non-empty directory."),
    no_git: bool = typer.Option(False, "--no-git", help="Skip git init."),
):
    """Create a project wired for your agents, with verification on from commit one."""
    if here or name == ".":
        project = Path.cwd()
        name = project.name
    elif name:
        project = Path.cwd() / name
    else:
        console.print("[red]Error:[/red] give a project name, or pass --here.")
        raise typer.Exit(2)

    existing = [p for p in project.iterdir() if p.name != ".git"] if project.is_dir() else []
    if existing and not force:
        console.print(Panel(
            f"[yellow]{project}[/yellow] already contains {len(existing)} entries.\n"
            "Re-run with [cyan]--force[/cyan] to merge into it.",
            title="[yellow]Directory not empty[/yellow]", border_style="yellow", padding=(1, 2)))
        raise typer.Exit(1)

    if project_type is None:
        # `--from` only means something for a mobile app, so it answers the
        # question. Otherwise ask -- but only a person: a script or a test has
        # no terminal to answer on, and gets the web app it always got.
        if port_from is not None:
            project_type = "react-native"
        elif len(PROJECT_TYPES) == 1 or not sys.stdin.isatty():
            project_type = "react"
        else:
            project_type = select_with_arrows(PROJECT_TYPES, "Project type", "react")
    if project_type not in PROJECT_TYPES:
        console.print(f"[red]Error:[/red] unknown --type '{project_type}'. "
                      f"Choose from: {', '.join(PROJECT_TYPES)}")
        raise typer.Exit(2)

    # The web app a mobile app ports from. Stored RELATIVE to the new project,
    # so the pair of repositories can move together (or be cloned side by side
    # on another machine) without the link breaking.
    port_from_rel: str | None = None
    if port_from is not None:
        if project_type != "react-native":
            console.print("[red]Error:[/red] --from only applies to --type react-native.")
            raise typer.Exit(2)
        source = port_from.resolve()
        if not (source / "src").is_dir() or not (source / "package.json").is_file():
            console.print(f"[red]Error:[/red] {source} is not a web app (no src/ or "
                          "package.json). Point --from at the react-dev web app.")
            raise typer.Exit(2)
        if source == project.resolve() or source in project.resolve().parents:
            console.print("[red]Error:[/red] the mobile app must be its own repository, "
                          "not inside the web app. Create it next to it, e.g. "
                          f"[cyan]react-dev init ../{source.name}-mobile --type react-native "
                          "--from .[/cyan]")
            raise typer.Exit(2)
        port_from_rel = os.path.relpath(source, project.resolve())

    selected = list(dict.fromkeys(agent or DEFAULT_AGENTS))
    unknown = [a for a in selected if a not in AGENTS]
    if unknown:
        console.print(f"[red]Error:[/red] unknown agent(s): {', '.join(unknown)}. "
                      f"Choose from: {', '.join(AGENTS)}")
        raise typer.Exit(2)

    skills_root = _asset_root("skills")
    template_root = _asset_root("templates")
    roots = _template_roots(template_root, project_type)
    skills = _skill_names(skills_root, project_type)

    tracker = StepTracker(f"Initialize {name}")
    for key, label in [
        ("dirs", "Create project directory"),
        ("template", f"Copy {project_type} template"),
        *([("shared", "Copy shared scaffolding")] if len(roots) > 1 else []),
        ("skills", "Install canonical skills"),
        *[(f"agent:{a}", f"Wire {AGENTS[a].name}") for a in selected],
        ("manifest", "Write .react-dev.json"),
        ("git", "Initialize git"),
    ]:
        tracker.add(key, label)

    agent_actions: dict[str, list[str]] = {}
    git_error: str | None = None

    with Live(tracker.render(), console=console, transient=True, refresh_per_second=8) as live:
        tracker.attach_refresh(lambda: live.update(tracker.render()))
        try:
            tracker.start("dirs")
            project.mkdir(parents=True, exist_ok=True)
            tracker.complete("dirs", str(project))

            tracker.start("template")
            n = _copy_tree(roots[0], project)
            tracker.complete("template", f"{n} files")

            if len(roots) > 1:
                tracker.start("shared")
                n = _copy_tree(roots[1], project)
                tracker.complete("shared", f"{n} files")

            tracker.start("skills")
            dest = project / CANONICAL_SKILLS_DIR
            dest.mkdir(parents=True, exist_ok=True)
            for skill in skills:
                _copy_tree(skills_root / skill, dest / skill)
            tracker.complete("skills", f"{len(skills)} skills")

            for key in selected:
                tracker.start(f"agent:{key}")
                agent_actions[key] = emit_for_agent(project, AGENTS[key], skills)
                tracker.complete(f"agent:{key}", f"{len(agent_actions[key])} artifacts")

            tracker.start("manifest")
            write_manifest(project, cli_version=__version__, project_type=project_type,
                           agents=selected, skills=skills,
                           fingerprint=template_fingerprint(*roots),
                           hashes=file_hashes(*roots),
                           port_from=port_from_rel)
            tracker.complete("manifest", MANIFEST)

            if no_git:
                tracker.skip("git", "--no-git")
            elif not _tool_exists("git"):
                tracker.skip("git", "git not installed")
            elif (project / ".git").is_dir():
                tracker.complete("git", "existing repo")
            else:
                tracker.start("git")
                result = subprocess.run(["git", "init", "-q"], cwd=project,
                                        capture_output=True, text=True)
                if result.returncode == 0:
                    subprocess.run(["git", "add", "-A"], cwd=project, capture_output=True)
                    tracker.complete("git", "initialized, files staged")
                else:
                    git_error = (result.stderr or "").strip()
                    tracker.error("git", "init failed")
        except Exception as exc:  # noqa: BLE001
            tracker.error("dirs", str(exc))
            live.update(tracker.render())
            console.print(tracker.render())
            console.print(Panel(str(exc), title="[red]Initialization failed[/red]",
                                border_style="red", padding=(1, 2)))
            raise typer.Exit(1) from exc

    console.print(tracker.render())

    if git_error:
        console.print(Panel(git_error, title="[yellow]git init failed[/yellow]",
                            border_style="yellow", padding=(1, 2)))

    # ---- per-agent wiring report ----
    table = Table.grid(padding=(0, 2))
    table.add_column(style="bold")
    table.add_column()
    for key in selected:
        a = AGENTS[key]
        table.add_row(a.name, "\n".join(agent_actions[key]))
        for note in a.notes:
            table.add_row("", f"[bright_black]{note}[/bright_black]")
        table.add_row("", "")
    console.print(Panel(table, title="Agent wiring", border_style="cyan", padding=(1, 2)))

    # ---- next steps, derived from what was actually written (never hardcoded) ----
    lines: list[str] = []
    step = 1
    if project != Path.cwd():
        lines.append(f"{step}. [cyan]cd {name}[/cyan]")
        step += 1
    lines.append(f"{step}. [cyan]npm install[/cyan]")
    step += 1
    if project_type == "react-native" and port_from_rel:
        lines.append(f"{step}. [cyan]npm run port[/cyan]  "
                     f"[bright_black]# copy {port_from_rel} across, write PORT.md[/bright_black]")
        step += 1
        lines.append(f"{step}. [cyan]npm install[/cyan]  "
                     "[bright_black]# the port aligns versions with the web app[/bright_black]")
        step += 1
    lines.append(f"{step}. [cyan]npm run verify[/cyan]  "
                 "[bright_black]# confirm the floor is green before you build[/bright_black]")
    step += 1
    if project_type == "react-native":
        lines.append(f"{step}. [cyan]npm start[/cyan]  "
                     "[bright_black]# scan the QR code with Expo Go (SDK 57)[/bright_black]")
        step += 1
    lines.append(f"{step}. Open your agent and start the workflow:")
    lines.append("")

    installed = project / CANONICAL_SKILLS_DIR
    for skill in _skill_names(installed):
        meta = read_skill_frontmatter(installed / skill / "SKILL.md")
        prefixes = " / ".join(f"[cyan]{_invocation(AGENTS[k], skill)}[/]" for k in selected)
        lines.append(f"   {prefixes}")
        lines.append(f"      [bright_black]{_first_sentence(meta.get('description', ''))}[/bright_black]")

    console.print(Panel("\n".join(lines), title="Next steps", border_style="cyan", padding=(1, 2)))
    console.print(Panel(
        "Edit [cyan]AGENTS.md[/cyan] to make the rules yours — every agent reads it.\n"
        f"Canonical skills live in [cyan]{CANONICAL_SKILLS_DIR}/[/cyan]; everything else is derived.\n"
        "Run [cyan]react-dev doctor[/cyan] any time to check the project still holds together.",
        title="Single source of truth", border_style="green", padding=(1, 2)))


@app.command()
def check():
    """Check which agent CLIs and build tools are available."""
    table = Table(show_header=True, header_style="bold", box=None, padding=(0, 2))
    table.add_column("Tool")
    table.add_column("Status")
    table.add_column("Notes", style="bright_black")

    for tool, why in (("node", "required"), ("npm", "required"), ("git", "recommended")):
        ok = _tool_exists(tool)
        table.add_row(tool, "[green]found[/green]" if ok else "[red]missing[/red]", why)

    table.add_row("", "", "")
    for key, a in AGENTS.items():
        ok = _tool_exists(a.cli_bin) if a.cli_bin else True
        # Whether it can be a parallel worker is a different question from
        # whether it is installed, and `dispatch` needs both answers.
        note = a.docs_url
        if ok and a.headless is not None:
            note = f"can run unattended — {a.headless.docs}"
        table.add_row(a.name, "[green]found[/green]" if ok else "[yellow]not found[/yellow]",
                      note)

    console.print(Panel(table, title="Environment", border_style="cyan", padding=(1, 2)))
    workers = available_agents()
    if workers:
        console.print(
            "[bright_black]`react-dev dispatch` can run parallel workers with: "
            + ", ".join(a.name for a in workers)
            + ".[/bright_black]"
        )
    console.print("[bright_black]An agent CLI that is missing only means you cannot run it "
                  "here — the generated files still work.[/bright_black]")


@app.command()
def doctor(
    path: Path = typer.Argument(Path.cwd(), help="Project to check."),
):
    """Check a generated project against the invariants the workflow depends on."""
    try:
        templates = _asset_root("templates")
        project_type = (read_manifest(path) or {}).get("projectType", "react")
        roots: tuple[Path, ...] = _template_roots(templates, project_type)
    except FileNotFoundError:
        roots = ()
    findings = diagnose(path, cli_version=__version__, template_roots=roots)
    if not findings:
        console.print("[yellow]Nothing to check — is this a react-dev project?[/yellow]")
        raise typer.Exit(1)

    table = Table(show_header=True, header_style="bold", box=None, padding=(0, 2))
    table.add_column("", width=2)
    table.add_column("Check")
    table.add_column("Detail", style="bright_black")

    glyphs = {"ok": "[green]●[/green]", "warn": "[yellow]●[/yellow]", "error": "[red]●[/red]"}
    for f in findings:
        table.add_row(glyphs[f.level], f.check, f.detail)

    errors = sum(1 for f in findings if f.level == "error")
    warns = sum(1 for f in findings if f.level == "warn")
    border = "red" if errors else "yellow" if warns else "green"
    console.print(Panel(table, title=f"Doctor — {path.resolve().name}", border_style=border, padding=(1, 2)))
    console.print(f"{errors} error(s), {warns} warning(s)")
    if errors:
        console.print(
            "[bright_black]Agent wiring errors are fixed by `react-dev sync`.\n"
            "Missing scripts, generator targets or template paths are NOT - sync never\n"
            "touches project code. Generate a fresh project and port your src/features\n"
            "across, or copy the missing surface in by hand.[/bright_black]"
        )
        raise typer.Exit(1)


@app.command()
def sync(
    path: Path = typer.Argument(Path.cwd(), help="Project to sync."),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show what would change."),
    with_template: bool = typer.Option(
        False, "--with-template",
        help="Also ADD template files the project is missing. Never overwrites anything.",
    ),
    force_template: bool = typer.Option(
        False, "--force-template",
        help="Also OVERWRITE template files that differ. Originals are backed up "
             "to .react-dev-backup/. Only safe if you have not edited them.",
    ),
):
    """Re-install canonical skills and agent wiring from the installed CLI version.

    Never touches files listed as userOwned in .react-dev.json (AGENTS.md).
    """
    manifest = read_manifest(path)
    if manifest is None:
        console.print(f"[red]Error:[/red] no {MANIFEST} in {path}. "
                      "Is this a react-dev project?")
        raise typer.Exit(1)

    selected = [a for a in manifest.get("agents", list(DEFAULT_AGENTS)) if a in AGENTS]
    skills_root = _asset_root("skills")
    template_source = _asset_root("templates")
    project_type = manifest.get("projectType", "react")
    roots = _template_roots(template_source, project_type)
    skills = _skill_names(skills_root, project_type)
    was = set(manifest.get("skills", []))
    user_owned = set(manifest.get("userOwned", ("AGENTS.md",)))

    added = sorted(set(skills) - was)
    removed = sorted(was - set(skills))

    plan = [
        f"skills: {len(skills)} total"
        + (f", +{len(added)} new ({', '.join(added)})" if added else "")
        + (f", -{len(removed)} gone ({', '.join(removed)})" if removed else ""),
        f"agents: {', '.join(AGENTS[a].name for a in selected)}",
        f"preserved: {', '.join(sorted(user_owned))}",
        f"version: {manifest.get('cliVersion', '?')} -> {__version__}",
    ]
    console.print(Panel("\n".join(plan), title="Sync plan", border_style="cyan", padding=(1, 2)))

    if dry_run:
        console.print("[bright_black]--dry-run: nothing written.[/bright_black]")
        return

    dest = path / CANONICAL_SKILLS_DIR
    if dest.is_dir():
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)
    for skill in skills:
        _copy_tree(skills_root / skill, dest / skill)

    for key in selected:
        emit_for_agent(path, AGENTS[key], skills)

    # A retired subagent keeps being offered forever otherwise, and the agent
    # delegates to instructions that contradict the skill that replaced it.
    retired = prune_stale_wiring(
        path, roots[-1], manifest.get("fileHashes") or {},
        backup_dir=path / ".react-dev-backup" / _BACKUP_STAMP,
    )
    for rel in retired:
        console.print(
            f"[yellow]-[/yellow] {rel} [bright_black]retired upstream; original in "
            f".react-dev-backup/{_BACKUP_STAMP}/[/bright_black]"
        )

    template_root = roots[0]
    added, differing, outdated, customised = ([], [], [], [])

    if force_template:
        with_template = True

    if with_template:
        removed = frozenset(manifest.get("userRemoved", ()))

        # Three-way: a file the project never touched is safe to update; a file
        # it edited is its own. `--force-template` only widens this to the
        # customised set, and still backs up.
        outdated, customised = classify_drift(
            path, manifest.get("fileHashes") or {}, file_hashes(*roots)
        )
        updatable = frozenset(outdated) if not force_template else None

        added, differing = [], []
        for root in roots:
            root_added, root_differing = _add_missing_template_files(
                path, root, user_owned, force=force_template,
                removed=removed, updatable=updatable,
            )
            added += root_added
            differing += root_differing
        pkg_changes = _merge_package_json(path, template_root / "package.json")
        if pkg_changes:
            console.print(Panel(
                "\n".join(f"[green]~[/green] {c}" for c in pkg_changes[:25])
                + (f"\n[bright_black]…and {len(pkg_changes) - 25} more[/bright_black]"
                   if len(pkg_changes) > 25 else "")
                + "\n\n[bright_black]package.json was MERGED, not replaced -- your own\n"
                  "dependencies and scripts are kept. Run `npm install`.[/bright_black]",
                title=f"package.json: {len(pkg_changes)} change(s)",
                border_style="green", padding=(1, 2)))

    # Only stamp the new fingerprint once nothing needs a human. Stamping while
    # files still differ would silence the warning without fixing anything.
    # Customised files differ forever; only outdated ones mean "not yet synced".
    resolved = with_template and (force_template or not outdated)
    fingerprint = (
        template_fingerprint(*roots)
        if resolved and template_root.is_dir()
        else manifest.get("templateFingerprint")
    )

    # Per file, not all-or-nothing: what this run actually brought up to date is
    # recorded even while other files still need a human. Stamped together, the
    # next run read every file this one had just written as the user's own and
    # refused to touch it again, so `--with-template` only ever worked once.
    hashes = (
        restamp(path, dict(manifest.get("fileHashes") or {}), file_hashes(*roots))
        if with_template else manifest.get("fileHashes")
    )

    write_manifest(path, cli_version=__version__, project_type=project_type,
                   agents=selected, skills=skills, fingerprint=fingerprint,
                   user_removed=list(manifest.get("userRemoved", ())),
                   hashes=hashes, port_from=manifest.get("portFrom"))

    if with_template:
        if added:
            console.print(Panel(
                "\n".join(f"[green]+[/green] {a}" for a in added[:40])
                + (f"\n[bright_black]…and {len(added) - 40} more[/bright_black]" if len(added) > 40 else ""),
                title=f"Added {len(added)} missing file(s)", border_style="green", padding=(1, 2)))
        else:
            console.print("[bright_black]No missing template files.[/bright_black]")

        if customised and not force_template:
            console.print(Panel(
                "\n".join(f"[cyan]~[/cyan] {c}" for c in customised[:20])
                + (f"\n[bright_black]…and {len(customised) - 20} more[/bright_black]"
                   if len(customised) > 20 else "")
                + "\n\n[bright_black]You edited these, so they were left alone. That is not\n"
                  "drift -- `doctor` will not nag about them.[/bright_black]",
                title=f"{len(customised)} file(s) are yours",
                border_style="cyan", padding=(1, 2)))

        if differing and force_template:
            console.print(Panel(
                "\n".join(f"[yellow]~[/yellow] {d}" for d in differing[:30])
                + (f"\n[bright_black]…and {len(differing) - 30} more[/bright_black]" if len(differing) > 30 else "")
                + f"\n\n[bright_black]Originals saved to .react-dev-backup/{_BACKUP_STAMP}/[/bright_black]",
                title=f"Overwrote {len(differing)} file(s)", border_style="yellow", padding=(1, 2)))
        elif differing:
            console.print(Panel(
                "\n".join(f"[yellow]~[/yellow] {d}" for d in differing[:30])
                + (f"\n[bright_black]…and {len(differing) - 30} more[/bright_black]" if len(differing) > 30 else "")
                + "\n\n[bright_black]These exist and differ, so they were left alone -- they may be\n"
                  "your edits, or template changes you still need. Diff them against a\n"
                  "freshly generated project. The fingerprint stays stale until none remain.[/bright_black]",
                title=f"{len(differing)} file(s) need a human", border_style="yellow", padding=(1, 2)))

    if project_type == "react-native" and with_template:
        # The template's package.json just won on shared versions; the port is
        # what puts back the versions the copied web code was written against.
        console.print("[bright_black]Mobile app: run [cyan]npm run port[/cyan] next -- it "
                      "re-aligns dependencies with the web app.[/bright_black]")
    console.print("[green]Synced.[/green] Run [cyan]react-dev doctor[/cyan] to confirm.")



@app.command()
def status(
    path: Path = typer.Argument(Path.cwd(), help="Project to report on."),
):
    """Show where every planned feature sits in the pipeline."""
    features = pipeline_status(path)
    if not features:
        console.print(
            "[yellow]No roadmap found.[/yellow] Run the [cyan]react-roadmap[/cyan] skill "
            "to plan features, or [cyan]react-feature <name>[/cyan] to start one directly."
        )
        raise typer.Exit(1)

    glyphs = {
        "merged": "[green]●[/green]",
        "planned": "[bright_black]○[/bright_black]",
    }

    branch = current_branch(path)

    # Prerequisites first -- they block features, so a reader needs them above.
    prereqs = prerequisite_status(path)
    if prereqs:
        pre = Table(show_header=False, box=None, padding=(0, 2))
        pre.add_column(width=2)
        pre.add_column(width=3)
        pre.add_column(width=30, no_wrap=True)
        pre.add_column(style="bright_black", no_wrap=True)
        marks = {"done": "[green]●[/green]", "merged": "[green]●[/green]",
                 "in progress": "[yellow]◐[/yellow]", "open": "[bright_black]○[/bright_black]"}
        for q in prereqs:
            # The index writes these as "**Title**: prose" -- only the title fits.
            title = q.what.split("**:")[0].replace("**", "").split(":")[0].strip()
            pre.add_row(marks[q.state], q.number, title[:30], q.branch or q.state)
        open_count = sum(1 for q in prereqs if q.state == "open")
        console.print(Panel(
            pre, title=f"Prerequisites — {len(prereqs) - open_count}/{len(prereqs)} underway",
            border_style="yellow" if open_count else "green", padding=(1, 2)))

    table = Table(show_header=True, header_style="bold", box=None, padding=(0, 1))
    table.add_column("", width=2)
    table.add_column("#", width=3, justify="right")
    table.add_column("Feature", width=16, no_wrap=True)
    table.add_column("Pipeline", width=10, no_wrap=True)
    table.add_column("Stage", width=12, no_wrap=True)
    table.add_column("Next", style="cyan", no_wrap=True)

    for f in features:
        # The bar makes progress legible at a glance, which is the point of
        # having named stages rather than a bag of commands.
        reached = STAGES.index(f.stage) + 1
        bar = "[cyan]" + "━" * reached + "[/cyan][bright_black]" + "┄" * (len(STAGES) - reached) + "[/bright_black]"
        here = " [bold](here)[/bold]" if f"{f.number}-{f.slug}" == branch else ""
        table.add_row(
            glyphs.get(f.stage, "[yellow]◐[/yellow]"),
            str(int(f.number)),
            f.slug + here,
            bar,
            f.stage,
            f.next_command,
        )

    done = sum(1 for f in features if f.stage == "merged")
    console.print(Panel(table, title=f"Features — {done}/{len(features)} merged",
                        border_style="cyan", padding=(1, 2)))

    console.print(f"[bright_black]on branch[/bright_black] {branch or '(no git)'}")

    blocking = [q for q in prereqs if q.state == "open"]
    active = [f for f in features if f.stage not in ("merged", "planned")]
    if active:
        f = active[0]
        console.print(f"In flight: [bold]{int(f.number)} {f.slug}[/bold] — {f.detail}. "
                      f"Next: [cyan]{f.next_command}[/cyan]")
    elif blocking:
        console.print(
            f"[yellow]{len(blocking)} prerequisite(s) still open[/yellow] "
            f"({', '.join(q.number for q in blocking)}) — features depending on them "
            "will stall. Finish those first: run the [cyan]react-prerequisites[/cyan] skill."
        )
    else:
        nxt = next((f for f in features if f.stage == "planned"), None)
        console.print(
            f"Nothing in flight. Next: [cyan]react-feature {int(nxt.number)}[/cyan] "
            f"([bold]{nxt.slug}[/bold])" if nxt
            else "[green]Every planned feature is merged.[/green]"
        )


@app.command()
def parallel(
    path: Path = typer.Argument(Path.cwd(), help="Project to plan for."),
    limit: int = typer.Option(3, "--limit", help="Most features to build at once."),
):
    """Which features can honestly be built at the same time, and why not the rest.

    Claim-plane selection: the module is the lock. Worktrees isolate files, not
    meaning -- two pages of one module share its components and types, and two
    agents editing one file merge cleanly into something that does not build.
    """
    plan = parallel_batch(path, limit=limit)

    if not plan.batch and not plan.excluded:
        console.print("[yellow]No roadmap found.[/yellow] Run react-roadmap first.")
        raise typer.Exit(1)

    if plan.batch:
        table = Table(show_header=True, header_style="bold", box=None, padding=(0, 2))
        table.add_column("#", width=3, justify="right")
        table.add_column("Feature", no_wrap=True)
        table.add_column("Start with", style="cyan", no_wrap=True)
        for feature in plan.batch:
            table.add_row(str(int(feature.number)), feature.slug, feature.next_command)
        console.print(
            Panel(table, title=f"Safe to build in parallel — {len(plan.batch)}",
                  border_style="green", padding=(1, 2))
        )
    else:
        console.print("[yellow]Nothing can start in parallel right now.[/yellow]")

    if plan.excluded:
        held = Table(show_header=False, box=None, padding=(0, 2))
        held.add_column(width=3, justify="right")
        held.add_column(width=18, no_wrap=True)
        held.add_column(style="bright_black")
        for feature, reason in plan.excluded[:12]:
            held.add_row(str(int(feature.number)), feature.slug, reason)
        console.print(Panel(held, title="Held back", border_style="bright_black", padding=(1, 2)))

    console.print(
        "[bright_black]Merging stays single-lane: one lands, the rest rebase and "
        "re-run the gate. A clean merge is not a working one.[/bright_black]"
    )


STATUS_STYLE = {
    "ok": "green",
    "blocked": "yellow",
    "failed": "red",
    "timeout": "red",
    "running": "cyan",
    "pending": "bright_black",
}


def _worker_table(workers: list[Worker], title: str) -> Panel:
    table = Table(show_header=True, header_style="bold", box=None, padding=(0, 2))
    table.add_column("#", width=3, justify="right")
    table.add_column("Feature", no_wrap=True, width=22)
    table.add_column("Status", no_wrap=True, width=9)
    table.add_column("Time", justify="right", width=7)
    table.add_column("Doing", style="bright_black", overflow="ellipsis")
    for worker in workers:
        style = STATUS_STYLE.get(worker.status, "")
        detail = worker.activity if worker.status == RUNNING else (worker.reason or worker.status)
        table.add_row(
            str(worker.number),
            worker.slug,
            f"[{style}]{worker.status}[/{style}]",
            f"{worker.elapsed:.0f}s",
            detail,
        )
    return Panel(table, title=title, border_style="cyan", padding=(1, 2))


@app.command()
def dispatch(
    path: Path = typer.Argument(Path.cwd(), help="Project to build in."),
    agent_key: str = typer.Option(
        "", "--agent", help="claude | codex | gemini. Default: the first one installed."
    ),
    limit: int = typer.Option(3, "--limit", help="Most workers to run at once."),
    only: list[str] = typer.Option(
        [], "--feature", help="Build these roadmap numbers instead of the planned batch."
    ),
    model: str = typer.Option("", "--model", help="Override the agent's model."),
    effort: str = typer.Option("", "--effort", help="Override the agent's effort level."),
    timeout: int = typer.Option(3600, "--timeout", help="Seconds before a worker is killed."),
    dry_run: bool = typer.Option(False, "--dry-run", help="Print the plan and the exact commands."),
    files: int = typer.Option(
        8, "--files", help="Mobile app: most files one worker translates per wave."
    ),
    waves: int = typer.Option(
        0, "--waves", help="Mobile app: stop after this many waves (0: until nothing is left)."
    ),
):
    """Build several roadmap features at once, one headless agent each.

    Every worker is a real process -- `claude -p`, `codex exec` or
    `gemini --prompt` -- in its own git worktree, with its whole session written
    to `.ai/runs/`. Nothing about the pipeline above this command is specific to
    one vendor: the flags and the event stream are the only difference, and they
    live in `agents.py`.

    In a mobile app (react-native) it ports instead: waves of workers translate
    the files `npm run port` says can be done now, each wave landed, checked
    and committed before the next one starts.
    """
    installed = available_agents()
    if not installed:
        console.print(
            "[red]No agent CLI found.[/red] Install one of: claude, codex, gemini."
        )
        raise typer.Exit(1)

    if agent_key:
        agent = AGENTS.get(agent_key)
        if agent is None or agent.headless is None:
            console.print(f"[red]{agent_key} cannot run unattended.[/red]")
            raise typer.Exit(1)
        if agent not in installed:
            console.print(
                f"[red]{agent.name} is not installed[/red] (`{agent.cli_bin}` is not on PATH)."
            )
            raise typer.Exit(1)
    else:
        agent = installed[0]

    manifest = read_manifest(path) or {}
    if manifest.get("projectType") == "react-native":
        _dispatch_port(
            path, manifest, agent, limit=limit, files_per_worker=files, max_waves=waves,
            model=model or None, effort=effort or None, timeout=timeout, dry_run=dry_run,
        )
        return

    plan = parallel_batch(path, limit=limit)
    if only:
        wanted = {token.lstrip("Ff0") or token for token in only}
        chosen = [
            feature
            for feature in plan.batch + [held for held, _ in plan.excluded]
            if feature.number in only or feature.number.lstrip("0") in wanted
        ]
        held_back = [f.number for f, _ in plan.excluded if f.number in only]
        if held_back:
            console.print(
                f"[yellow]Warning:[/yellow] {', '.join(held_back)} was held back by the "
                "claim plane. Its reason is a fact on disk, not a suggestion."
            )
    else:
        chosen = plan.batch

    if not chosen:
        console.print("[yellow]Nothing to build.[/yellow] Run `react-dev parallel` to see why.")
        raise typer.Exit(1)

    workers = [
        Worker(
            number=feature.number,
            slug=feature.slug,
            branch=branch_for(feature.number, feature.slug),
            prompt=worker_prompt(agent, feature.number, feature.slug),
        )
        for feature in chosen
    ]

    if dry_run:
        for worker in workers:
            argv = headless_command(
                agent, worker.prompt, model=model or None, effort=effort or None
            )
            console.print(f"[cyan]{worker.slug}[/cyan] -> {worktree_for(path, worker.branch)}")
            console.print(f"  [bright_black]{' '.join(argv[:-1])} <prompt>[/bright_black]")
        raise typer.Exit(0)

    # Read the working tree BEFORE touching .gitignore, or the rule this
    # command just added is itself the uncommitted change it warns about.
    dirty = subprocess.run(
        ["git", "status", "--porcelain"], cwd=path, capture_output=True, text=True, check=False
    ).stdout.strip()

    if ensure_ignored(path):
        console.print("[bright_black]Added /.worktrees/ and /.ai/runs/ to .gitignore.[/bright_black]")

    if dirty:
        # A worktree branches from the last COMMIT. Anything only in the
        # working tree -- a design file, a half-finished config -- does not
        # exist for the workers, and one that cannot find it builds from the
        # prose instead of stopping, which is the expensive kind of silent.
        console.print(
            "[yellow]Uncommitted changes.[/yellow] Workers branch from HEAD and will not "
            f"see them ({len(dirty.splitlines())} file(s)). Commit first if they matter."
        )

    run_dir = new_run_dir(path)
    console.print(
        Panel(
            f"{len(workers)} worker(s) · {agent.name} · logs in [cyan]{run_dir}[/cyan]",
            border_style="cyan", padding=(0, 2),
        )
    )

    with Live(_worker_table(workers, "Spawning"), console=console, refresh_per_second=4) as live:
        def refresh(_worker: Worker, _event) -> None:
            live.update(_worker_table(workers, f"{agent.name} workers"))

        run_batch(
            path, workers, agent, run_dir,
            model=model or None, effort=effort or None, timeout=timeout, on_event=refresh,
        )
        live.update(_worker_table(workers, "Finished"))

    landed = [w for w in workers if w.status == OK]
    if len(landed) != len(workers):
        console.print()
    for worker in workers:
        if worker.status != OK:
            console.print(
                f"[{STATUS_STYLE.get(worker.status, '')}]{worker.slug}: {worker.status}[/] — "
                f"{worker.reason or 'see the transcript'}\n"
                f"  [bright_black]{worker.log_dir}/transcript.md[/bright_black]"
            )

    console.print(
        Panel(
            f"{len(landed)} of {len(workers)} green.\n"
            "Land them ONE AT A TIME: rebase onto main, `npm ci && npm run verify` in that "
            "worktree, then react-ship. A clean merge is not a working one.",
            title="Next", border_style="green" if landed else "yellow", padding=(1, 2),
        )
    )
    raise typer.Exit(0 if len(landed) == len(workers) else 1)


def _dispatch_port(
    path: Path,
    manifest: dict,
    agent,
    *,
    limit: int,
    files_per_worker: int,
    max_waves: int,
    model: str | None,
    effort: str | None,
    timeout: int,
    dry_run: bool,
) -> None:
    """The mobile port, in parallel waves. The mechanics are in `porting.py`."""
    port_from = manifest.get("portFrom")
    web_root = (path / port_from).resolve() if port_from else None
    if web_root is None or not (web_root / "src").is_dir():
        console.print(
            f"[red]Web app not found[/red] ({port_from or 'not recorded'}). "
            "Run [cyan]npm run port -- --from <web app>[/cyan] once first."
        )
        raise typer.Exit(1)
    if not (path / "node_modules").is_dir():
        console.print("[red]No node_modules.[/red] Run [cyan]npm install[/cyan] first.")
        raise typer.Exit(1)

    try:
        plan = read_plan(path, web_root)
    except (RuntimeError, OSError, ValueError) as error:
        console.print(f"[red]Could not read the port plan.[/red] {error}")
        raise typer.Exit(1) from error

    if dry_run:
        slices = slice_frontier(plan["frontier"], files_per_worker=files_per_worker, limit=limit)
        console.print(
            f"{plan['remaining']} file(s) to translate; {len(plan['frontier'])} can be done "
            f"now. First wave: {len(slices)} worker(s) with {agent.name}."
        )
        for index, chunk in enumerate(slices, 1):
            console.print(f"[cyan]worker {index}[/cyan] {chunk.group} -- {len(chunk.items)} file(s)")
            for item in chunk.items:
                console.print(f"  [bright_black]{item['native']}[/bright_black]")
        if slices:
            argv = headless_command(
                agent, port_prompt(agent, web_root, slices[0]), model=model, effort=effort
            )
            console.print(f"\n[bright_black]{' '.join(argv[:-1])} <prompt>[/bright_black]")
        raise typer.Exit(0)

    # Every wave is committed so the next wave's worktrees -- branched from
    # HEAD -- see it. That needs a commit to branch from, and a clean tree, or
    # the first wave's commit would sweep the user's own edits into it.
    if not has_commit(path):
        console.print(
            "[red]No commit yet.[/red] Workers branch from the last commit:\n"
            '  [cyan]git add -A && git commit -m "mobile app: first port"[/cyan]'
        )
        raise typer.Exit(1)
    dirty = dirty_files(path)
    if dirty:
        console.print(
            f"[red]Uncommitted changes[/red] ({len(dirty)} file(s), e.g. {dirty[0]}). Each "
            "wave is committed, so commit or stash yours first."
        )
        raise typer.Exit(1)
    # The base must type-check and lint, or every worker's files would be
    # rejected on landing for errors that were already there -- paid agent
    # time spent for nothing. Tests are allowed to be red, but only the ones
    # red NOW: a wave may not add to them.
    console.print("[bright_black]Checking the base before starting any agent...[/bright_black]")
    base_ok, base_reason, baseline = preflight(path)
    if not base_ok:
        console.print(Panel(
            f"{base_reason}\n\nFix this first (`npm run verify` shows it in full) -- no agent was "
            "started.",
            title="[red]The base is not green[/red]", border_style="red", padding=(1, 2),
        ))
        raise typer.Exit(1)
    if baseline:
        console.print(
            f"[yellow]{len(baseline)} test file(s) already fail[/yellow] and are tolerated -- "
            "a wave may not add to them: " + ", ".join(sorted(baseline)[:3])
        )
    # `npm run port` in the preflight may have regenerated files; keep the tree clean.
    if dirty_files(path):
        subprocess.run(["git", "add", "-A"], cwd=path, check=False)
        subprocess.run(["git", "commit", "-q", "-m", "port: regenerate before dispatch"],
                       cwd=path, check=False)

    if ensure_ignored(path):
        console.print("[bright_black]Added /.worktrees/ and /.ai/runs/ to .gitignore.[/bright_black]")

    run_dir = new_run_dir(path)
    console.print(Panel(
        f"{plan['remaining']} file(s) to translate · up to {limit} {agent.name} worker(s) "
        f"× {files_per_worker} file(s) per wave · logs in [cyan]{run_dir}[/cyan]",
        border_style="cyan", padding=(0, 2),
    ))

    total_landed = 0
    wave = 0
    stopped = ""
    every_worker: list[Worker] = []
    while True:
        if max_waves and wave >= max_waves:
            stopped = f"stopped after {max_waves} wave(s) (--waves)"
            break
        slices = slice_frontier(plan["frontier"], files_per_worker=files_per_worker, limit=limit)
        if not slices:
            break
        wave += 1
        wave_dir = run_dir / f"wave-{wave}"
        wave_dir.mkdir(parents=True, exist_ok=True)

        holder: dict = {"workers": []}
        with Live(_worker_table([], f"Wave {wave}"), console=console,
                  refresh_per_second=4) as live:
            def show(message: str) -> None:
                live.update(_worker_table(holder["workers"], f"Wave {wave} -- {message}"))

            def refresh(worker, _event) -> None:
                if worker not in holder["workers"]:
                    holder["workers"].append(worker)
                live.update(_worker_table(holder["workers"], f"Wave {wave} -- translating"))

            result = run_wave(
                path, web_root, agent, slices, wave_dir, wave,
                model=model, effort=effort, timeout=timeout, baseline=baseline,
                on_event=refresh, on_status=show,
            )
            holder["workers"] = result.workers
            live.update(_worker_table(result.workers, f"Wave {wave} -- done"))
        every_worker.extend(result.workers)

        for worker in result.workers:
            if worker.status != OK:
                console.print(
                    f"[{STATUS_STYLE.get(worker.status, '')}]{worker.slug}: {worker.status}[/] "
                    f"-- {worker.reason or 'see the transcript'}\n"
                    f"  [bright_black]{worker.log_dir}/transcript.md[/bright_black]"
                )
        if result.undone:
            stopped = f"wave {wave} was undone -- lint or tests went red: {result.undone}"
            break
        console.print(f"[green]Wave {wave}:[/green] {len(result.landed)} file(s) landed and committed.")
        if result.new_red_tests:
            # Tolerated from now on, like the ones that were red at the start.
            baseline |= set(result.new_red_tests)
            console.print(
                f"[yellow]{len(result.new_red_tests)} web test(s) came across in this wave and "
                "fail[/yellow] -- check them on the web side first: "
                + ", ".join(result.new_red_tests[:3])
            )
        total_landed += len(result.landed)
        if not result.landed:
            stopped = f"wave {wave} landed nothing -- see the workers above"
            break
        plan = read_plan(path, web_root)

    # One run.json for the whole port run, so `react-dev runs` lists it like
    # any other batch (each wave also keeps its own, beside its workers' logs).
    write_run_manifest(run_dir, every_worker, agent)

    left = plan["remaining"]
    lines = [f"{total_landed} file(s) translated in {wave} wave(s); {left} left."]
    if stopped:
        lines.append(f"[yellow]{stopped}[/yellow]")
    elif left:
        lines.append(
            "[yellow]Nothing left can be translated without a decision[/yellow] -- the "
            "workers' [NEEDS CLARIFICATION] answers say which."
        )
    if plan.get("shell"):
        lines.append(
            f"{len(plan['shell'])} web-shell file(s) (router, guards, app frame) are yours "
            "to re-design as Expo Router layouts -- PORT.md, Shell."
        )
    lines.append("Then: [cyan]npm run verify[/cyan], and open the screens in Expo Go.")
    console.print(Panel("\n".join(lines), title="Port", border_style="green" if not stopped else "yellow",
                        padding=(1, 2)))
    raise typer.Exit(0 if not stopped else 1)


@app.command()
def runs(
    path: Path = typer.Argument(Path.cwd(), help="Project to look in."),
    run_id: str = typer.Option("", "--id", help="Show one run's workers in full."),
):
    """What the workers did, and what happened to each of them."""
    history = past_runs(path)
    if not history:
        console.print("[yellow]No runs yet.[/yellow] `react-dev dispatch` records them.")
        raise typer.Exit(1)

    if run_id:
        match = next((run for run in history if run["id"] == run_id), None)
        if match is None:
            console.print(f"[red]No run {run_id}.[/red]")
            raise typer.Exit(1)
        table = Table(show_header=True, header_style="bold", box=None, padding=(0, 2))
        table.add_column("Feature", no_wrap=True)
        table.add_column("Status", no_wrap=True)
        table.add_column("Time", justify="right")
        table.add_column("Log / reason", style="bright_black", overflow="fold")
        for worker in match.get("workers", []):
            style = STATUS_STYLE.get(worker["status"], "")
            table.add_row(
                worker["slug"],
                f"[{style}]{worker['status']}[/{style}]",
                f"{worker.get('durationSeconds', 0):.0f}s",
                worker.get("reason") or f"{worker.get('log')}/transcript.md",
            )
        console.print(Panel(table, title=f"{run_id} — {match.get('agentName', '?')}",
                            border_style="cyan", padding=(1, 2)))
        raise typer.Exit(0)

    table = Table(show_header=True, header_style="bold", box=None, padding=(0, 2))
    table.add_column("Run", no_wrap=True)
    table.add_column("Agent", no_wrap=True)
    table.add_column("Workers", justify="right")
    table.add_column("Result", overflow="fold")
    for run in history[:20]:
        workers = run.get("workers", [])
        if run.get("partial"):
            table.add_row(run["id"], "?", "?", "[yellow]no manifest — killed mid-run[/yellow]")
            continue
        green = sum(1 for w in workers if w["status"] == OK)
        bad = [f"{w['slug']}: {w['status']}" for w in workers if w["status"] != OK]
        table.add_row(
            run["id"], run.get("agentName", "?"), f"{green}/{len(workers)}",
            ", ".join(bad) or "[green]all green[/green]",
        )
    console.print(Panel(table, title="Worker runs", border_style="cyan", padding=(1, 2)))
    console.print("[bright_black]`react-dev runs --id <run>` for one run's workers.[/bright_black]")


@app.command("next")
def next_step(
    path: Path = typer.Argument(Path.cwd(), help="Project to work in."),
    agent_key: str = typer.Option(
        "", "--agent", help="claude | codex | gemini. Default: the first one installed."
    ),
    dry_run: bool = typer.Option(False, "--dry-run", help="Print the command, run nothing."),
):
    """Start a FRESH agent session on the next pipeline step.

    Context cannot be cleared from inside a session: no hook can do it, and a
    skill can only suggest `/clear`. A new process can, which is the whole point
    of this command -- the clean slate is structural rather than something you
    have to remember at the right moment.
    """
    features = pipeline_status(path)
    if not features:
        console.print(
            "[yellow]No roadmap found.[/yellow] Run the react-roadmap skill first, "
            "or react-feature <name> to start one directly."
        )
        raise typer.Exit(1)

    active = [f for f in features if f.stage not in ("merged", "planned")]
    target = active[0] if active else next_planned(features)
    if target is None:
        console.print("[green]Every planned feature is merged.[/green] Nothing to start.")
        raise typer.Exit()

    command = target.next_command
    # Which agent, and therefore which invocation syntax. The pipeline is the
    # same for all three; only the prefix differs, and that lives in agents.py.
    installed = available_agents()
    launcher = AGENTS.get(agent_key) if agent_key else (installed[0] if installed else None)
    if launcher is None:
        console.print(
            "[yellow]No agent CLI on PATH.[/yellow] Start yours yourself and run the "
            "next command below."
        )
        launcher = AGENTS["claude"]
        missing = True
    else:
        missing = False

    # The priming message is what the fresh session starts from, so it has to
    # carry everything a blank context lacks: which feature, and where it is.
    skill, _, arguments = command.partition(" ")
    name = skill.removeprefix("react-") if launcher.strips_prefix else skill
    prompt = f"{launcher.invoke_prefix}{name} {arguments}".strip()

    # Every stage reads its input from `specs/`, which is why a fresh session
    # works at all -- but it is also the limit, and saying so is the difference
    # between a tool you can trust and one that quietly loses a decision.
    boundary = target.stage in ("planned", "merged")
    console.print(
        Panel(
            f"feature [bold]{int(target.number)} {target.slug}[/bold] — {target.stage}\n"
            f"{target.detail}\n\n"
            f"fresh session, starting with: [cyan]{prompt}[/cyan]\n\n"
            + (
                "[bright_black]A feature boundary: nothing from the last one is "
                "needed here.[/bright_black]"
                if boundary
                else "[yellow]Mid-feature.[/yellow] [bright_black]Only what is in "
                "specs/ carries over. If you just agreed something in chat that is "
                "not written down, record it first.[/bright_black]"
            ),
            title="Next step, clean context",
            border_style="cyan" if boundary else "yellow",
            padding=(1, 2),
        )
    )

    if dry_run:
        console.print(
            f"[bright_black]--dry-run:[/bright_black] {launcher.cli_bin} {prompt!r}"
        )
        raise typer.Exit()

    if missing:
        console.print(f"Run: [cyan]{prompt}[/cyan]")
        raise typer.Exit(1)

    binary = shutil.which(launcher.cli_bin or "")
    if binary is None:
        console.print(
            f"[yellow]`{launcher.cli_bin}` is not on PATH.[/yellow] Start your agent "
            f"yourself and run: [cyan]{prompt}[/cyan]"
        )
        raise typer.Exit(1)

    # exec, not run: the agent replaces this process, so there is no wrapper
    # sitting between you and it, and Ctrl-C behaves the way you expect.
    os.chdir(path)
    os.execv(binary, [binary, prompt])


def next_planned(features: list[FeatureStatus]) -> FeatureStatus | None:
    return next((f for f in features if f.stage == "planned"), None)


@app.command()
def version():
    """Print the CLI version."""
    console.print(f"react-dev {__version__}")


def main() -> None:
    app()


if __name__ == "__main__":
    main()
