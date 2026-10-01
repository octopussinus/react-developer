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

import shutil
import subprocess
import sys
from pathlib import Path

import typer
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from typer.core import TyperGroup

from .agents import AGENTS, CANONICAL_SKILLS_DIR, DEFAULT_AGENTS, emit_for_agent, read_skill_frontmatter
from .project import MANIFEST, diagnose, read_manifest, template_fingerprint, write_manifest
from .ui import StepTracker, console, select_with_arrows, show_banner

__version__ = "1.1.0"

PROJECT_TYPES = {
    "react": "React (Vite) — web, feature-sliced, TanStack Query + Zod",
}

#: Order the workflow is meant to be used in. Drives the Next Steps panel.
WORKFLOW_ORDER = [
    "react-constitution",
    "react-roadmap",
    "react-feature",
    "react-prototype",
    "react-spec",
    "react-clarify",
    "react-implement",
    "react-component",
    "react-verify",
    "react-analyze",
    "react-feedback",
    "react-update",
    "react-i18n",
    "react-theme",
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


def _skill_names(skills_root: Path) -> list[str]:
    found = {p.parent.name for p in skills_root.glob("*/SKILL.md")}
    ordered = [n for n in WORKFLOW_ORDER if n in found]
    return ordered + sorted(found - set(ordered))


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
    project: Path, template_root: Path, user_owned: set[str], *, force: bool = False
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
    skip_names = {"package-lock.json"}
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

        target = project / relative
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            added.append(str(relative))
        elif target.read_bytes() != source.read_bytes():
            differing.append(str(relative))
            if force:
                backup = project / ".react-dev-backup" / _BACKUP_STAMP / relative
                backup.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(target, backup)
                shutil.copy2(source, target)

    return added, differing


def _tool_exists(name: str) -> bool:
    return shutil.which(name) is not None


# --------------------------------------------------------------------------- #
# commands
# --------------------------------------------------------------------------- #

@app.command()
def init(
    name: str = typer.Argument(None, help="Project directory. Use '.' for the current one."),
    project_type: str = typer.Option(None, "--type", "-t", help="react (only option today)"),
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
        # Never ask a question with one answer -- it also breaks non-interactive use.
        project_type = (
            next(iter(PROJECT_TYPES))
            if len(PROJECT_TYPES) == 1
            else select_with_arrows(PROJECT_TYPES, "Project type", "react")
        )
    if project_type not in PROJECT_TYPES:
        console.print(f"[red]Error:[/red] unknown --type '{project_type}'. "
                      f"Choose from: {', '.join(PROJECT_TYPES)}")
        raise typer.Exit(2)

    selected = list(dict.fromkeys(agent or DEFAULT_AGENTS))
    unknown = [a for a in selected if a not in AGENTS]
    if unknown:
        console.print(f"[red]Error:[/red] unknown agent(s): {', '.join(unknown)}. "
                      f"Choose from: {', '.join(AGENTS)}")
        raise typer.Exit(2)

    skills_root = _asset_root("skills")
    template_root = _asset_root("templates")
    skills = _skill_names(skills_root)

    tracker = StepTracker(f"Initialize {name}")
    for key, label in [
        ("dirs", "Create project directory"),
        ("template", f"Copy {project_type} template"),
        ("shared", "Copy shared scaffolding"),
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
            n = _copy_tree(template_root / project_type, project)
            tracker.complete("template", f"{n} files")

            tracker.start("shared")
            n = _copy_tree(template_root / "shared", project)
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
                           fingerprint=template_fingerprint(template_root / project_type))
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
    lines.append(f"{step}. [cyan]npm run verify[/cyan]  "
                 "[bright_black]# confirm the floor is green before you build[/bright_black]")
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
        table.add_row(a.name, "[green]found[/green]" if ok else "[yellow]not found[/yellow]",
                      a.docs_url)

    console.print(Panel(table, title="Environment", border_style="cyan", padding=(1, 2)))
    console.print("[bright_black]An agent CLI that is missing only means you cannot run it "
                  "here — the generated files still work.[/bright_black]")


@app.command()
def doctor(
    path: Path = typer.Argument(Path.cwd(), help="Project to check."),
):
    """Check a generated project against the invariants the workflow depends on."""
    try:
        template_root = _asset_root("templates") / (read_manifest(path) or {}).get("projectType", "react")
    except FileNotFoundError:
        template_root = None
    findings = diagnose(path, cli_version=__version__, template_root=template_root)
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
    skills = _skill_names(skills_root)
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

    project_type = manifest.get("projectType", "react")
    template_root = template_source / project_type
    added, differing = ([], [])

    if force_template:
        with_template = True

    if with_template:
        added, differing = _add_missing_template_files(
            path, template_root, user_owned, force=force_template
        )

    # Only stamp the new fingerprint once nothing needs a human. Stamping while
    # files still differ would silence the warning without fixing anything.
    resolved = with_template and (force_template or not differing)
    fingerprint = (
        template_fingerprint(template_root)
        if resolved and template_root.is_dir()
        else manifest.get("templateFingerprint")
    )

    write_manifest(path, cli_version=__version__, project_type=project_type,
                   agents=selected, skills=skills, fingerprint=fingerprint)

    if with_template:
        if added:
            console.print(Panel(
                "\n".join(f"[green]+[/green] {a}" for a in added[:40])
                + (f"\n[bright_black]…and {len(added) - 40} more[/bright_black]" if len(added) > 40 else ""),
                title=f"Added {len(added)} missing file(s)", border_style="green", padding=(1, 2)))
        else:
            console.print("[bright_black]No missing template files.[/bright_black]")

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

    console.print("[green]Synced.[/green] Run [cyan]react-dev doctor[/cyan] to confirm.")


@app.command()
def version():
    """Print the CLI version."""
    console.print(f"react-dev {__version__}")


def main() -> None:
    app()


if __name__ == "__main__":
    main()
