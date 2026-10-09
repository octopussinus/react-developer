"""Agent adapters.

Design rule: ``.agents/skills/<name>/SKILL.md`` is the ONE canonical source of
truth for every workflow skill. It follows the open Agent Skills standard
(agentskills.io), and two of the three supported agents read that directory
natively. Everything an adapter emits is a *derived artifact* that points back
at the canonical skill -- never a copy of its body.

Verified against vendor docs on 2026-10-01:

Claude Code  https://code.claude.com/docs/en/skills
  - reads ``.claude/skills/<name>/SKILL.md``; does NOT read ``.agents/skills``
    (anthropics/claude-code#31005 still open), so we link the directory in.
  - skills become ``/<name>`` slash commands automatically.
  - context file is ``CLAUDE.md``. AGENTS.md is only a *fallback* when no
    CLAUDE.md exists anywhere in the parent chain (v2.1.277+, toggleable in
    /config) -- too conditional to rely on, so we link CLAUDE.md -> AGENTS.md.

Codex        https://learn.chatgpt.com/codex/build-skills
  - reads ``$CWD/.agents/skills`` and ``$REPO_ROOT/.agents/skills`` natively.
  - skills invoked explicitly with ``$<name>``, or implicitly by description.
  - reads ``AGENTS.md`` natively, root-down, 32 KiB budget
    (``project_doc_max_bytes``). Nothing to emit at all.

Gemini CLI   https://geminicli.com/docs/cli/creating-skills/
  - reads ``.agents/skills`` natively as an alternative to ``.gemini/skills``.
  - BUT skills are only invoked *implicitly* via natural language, so we also
    emit thin ``.gemini/commands/react/<name>.toml`` shims to give the user
    real ``/react:<name>`` commands. The shim injects the canonical SKILL.md
    with Gemini's ``@{...}`` file-injection syntax instead of duplicating it.
  - context file is ``GEMINI.md``.
"""

from __future__ import annotations

import os
import shutil
from dataclasses import dataclass, field
from pathlib import Path

import tomli_w

#: Canonical, agent-neutral locations inside a generated project.
CANONICAL_SKILLS_DIR = ".agents/skills"
CANONICAL_CONTEXT_FILE = "AGENTS.md"


@dataclass(frozen=True)
class Headless:
    """How to run this agent unattended, and whose event stream comes back.

    Verified against each CLI's own ``--help`` on 2026-10-07 (claude 2.1.292,
    gemini 0.42.0) and against the Codex non-interactive reference at
    https://learn.chatgpt.com/docs/non-interactive-mode.

    `approval` is not a convenience: a worker that stops to ask permission has
    no one to ask. It sits at 0% forever in a log nobody is watching, which is
    the documented way parallel agent runs fail.
    """

    #: Flags before the prompt. The subcommand, if any, is the first entry.
    base: tuple[str, ...]
    #: Flag that carries the prompt, or "" when the prompt is a trailing word.
    prompt_flag: str
    #: Which parser in `runner.py` understands this CLI's stdout.
    stream: str
    model_flag: str | None = None
    default_model: str | None = None
    effort_flag: str | None = None
    default_effort: str | None = None
    #: Where the flags above are documented, for the skill and for `--help`.
    docs: str = ""


@dataclass(frozen=True)
class Agent:
    key: str
    name: str
    #: Context file this agent actually reads. ``AGENTS.md`` means "native, emit nothing".
    context_file: str
    #: Where this agent looks for skills, if it cannot read the canonical dir.
    skills_dir: str | None = None
    #: Directory for explicit slash-command shims, if skills alone are not invocable.
    commands_dir: str | None = None
    #: Executable probed by ``react-dev check``.
    cli_bin: str | None = None
    docs_url: str = ""
    #: How the user explicitly triggers a workflow skill, for the Next Steps panel.
    invoke_prefix: str = "/"
    #: True when the emitted command name drops the shared `react-` prefix.
    strips_prefix: bool = False
    #: How to run it as an unattended worker, or None when it cannot be.
    headless: Headless | None = None
    notes: tuple[str, ...] = field(default_factory=tuple)

    @property
    def reads_canonical_skills(self) -> bool:
        return self.skills_dir is None

    @property
    def reads_canonical_context(self) -> bool:
        return self.context_file == CANONICAL_CONTEXT_FILE


AGENTS: dict[str, Agent] = {
    "claude": Agent(
        key="claude",
        name="Claude Code",
        context_file="CLAUDE.md",
        skills_dir=".claude/skills",
        cli_bin="claude",
        docs_url="https://code.claude.com/docs/en/skills",
        invoke_prefix="/",
        headless=Headless(
            # --verbose is required alongside stream-json with --print, and
            # bypassPermissions because nobody is there to answer a prompt.
            base=(
                "-p",
                "--output-format", "stream-json",
                "--verbose",
                "--permission-mode", "bypassPermissions",
            ),
            prompt_flag="",
            stream="claude",
            model_flag="--model",
            default_model="sonnet",
            effort_flag="--effort",
            default_effort="xhigh",
            docs="https://code.claude.com/docs/en/sdk/headless",
        ),
        notes=(
            "Skills appear as /<name> in the slash-command menu.",
            ".claude/skills entries link to .agents/skills -- edit the canonical copy.",
        ),
    ),
    "codex": Agent(
        key="codex",
        name="Codex",
        context_file=CANONICAL_CONTEXT_FILE,
        skills_dir=None,  # reads .agents/skills natively
        cli_bin="codex",
        docs_url="https://learn.chatgpt.com/codex/build-skills",
        invoke_prefix="$",
        headless=Headless(
            # workspace-write, not danger-full-access: the worker has to edit
            # its worktree and nothing beyond it.
            base=("exec", "--json", "--sandbox", "workspace-write"),
            prompt_flag="",
            stream="codex",
            model_flag="--model",
            # No default: naming a model here would go stale, and the CLI's own
            # default is the one the user configured.
            default_model=None,
            docs="https://learn.chatgpt.com/docs/non-interactive-mode",
        ),
        notes=(
            "Reads .agents/skills and AGENTS.md natively -- nothing is generated.",
            "Trigger a workflow explicitly with $<name>, e.g. $react-verify.",
            "AGENTS.md is capped by project_doc_max_bytes (32 KiB default).",
        ),
    ),
    "gemini": Agent(
        key="gemini",
        name="Gemini CLI",
        context_file="GEMINI.md",
        skills_dir=None,  # reads .agents/skills natively
        commands_dir=".gemini/commands/react",
        cli_bin="gemini",
        docs_url="https://geminicli.com/docs/cli/creating-skills/",
        invoke_prefix="/react:",
        strips_prefix=True,
        headless=Headless(
            # --skip-trust: every worker runs in a NEW worktree folder, which
            # Gemini does not trust -- and in an untrusted folder it silently
            # drops `yolo` back to "default" (ask before each tool), so the
            # worker stalls waiting for approvals nobody gives. Session-scoped,
            # per the CLI's own docs for headless runs.
            base=("--output-format", "stream-json", "--approval-mode", "yolo", "--skip-trust"),
            prompt_flag="--prompt",
            stream="gemini",
            model_flag="--model",
            default_model=None,
            docs="https://geminicli.com/docs/cli/headless/",
        ),
        notes=(
            "Reads .agents/skills natively, but only invokes skills implicitly.",
            "Generated .gemini/commands/react/*.toml give you explicit /react:<name>.",
            "Each shim injects the canonical SKILL.md via @{...} -- no duplicated prose.",
        ),
    ),
}

DEFAULT_AGENTS = ("claude", "codex", "gemini")


# --------------------------------------------------------------------------- #
# linking helpers
# --------------------------------------------------------------------------- #

def _relative_to(target: Path, link_parent: Path) -> Path:
    """POSIX-style relative path from ``link_parent`` to ``target``."""
    return Path(os.path.relpath(target, link_parent))


def link_or_copy(target: Path, link: Path) -> str:
    """Point ``link`` at ``target``.

    Symlink where the platform allows it, so there is genuinely one copy on
    disk. Fall back to a real copy on Windows without developer mode, where
    ``os.symlink`` raises OSError. Returns "link" or "copy" for reporting.
    """
    link.parent.mkdir(parents=True, exist_ok=True)
    if link.is_symlink() or link.exists():
        if link.is_dir() and not link.is_symlink():
            shutil.rmtree(link)
        else:
            link.unlink()
    try:
        os.symlink(_relative_to(target, link.parent), link,
                   target_is_directory=target.is_dir())
        return "link"
    except (OSError, NotImplementedError):
        if target.is_dir():
            shutil.copytree(target, link)
        else:
            shutil.copy2(target, link)
        return "copy"


# --------------------------------------------------------------------------- #
# emitters
# --------------------------------------------------------------------------- #

GEMINI_SHIM_PROMPT = """\
You are running the `{skill_name}` workflow for this project.

Read and follow the skill definition below exactly. It is the single source of
truth; this command is only a thin entry point. If the skill references files
under `references/`, read those too before acting.

@{{{skill_path}/SKILL.md}}

Project rules that always apply:

@{{AGENTS.md}}

---
User arguments for this run: {{{{args}}}}
"""


def _prune(directory: Path, keep: list[str], key) -> list[str]:
    """Delete entries of ``directory`` that are not in ``keep``.

    Only ever called on directories this tool fully owns (``.claude/skills``,
    ``.gemini/commands/react``) -- they are derived, and sync rewrites them.
    """
    if not directory.is_dir():
        return []
    wanted = set(keep)
    gone: list[str] = []
    for entry in sorted(directory.iterdir()):
        if key(entry) in wanted:
            continue
        if entry.is_symlink() or entry.is_file():
            entry.unlink()
        else:
            shutil.rmtree(entry)
        gone.append(entry.name)
    return gone


def emit_for_agent(project: Path, agent: Agent, skill_names: list[str]) -> list[str]:
    """Create everything ``agent`` needs. Returns human-readable actions taken."""
    actions: list[str] = []
    canonical = project / CANONICAL_SKILLS_DIR

    # 1. context file
    if agent.reads_canonical_context:
        actions.append(f"{CANONICAL_CONTEXT_FILE} (native, no shim needed)")
    else:
        how = link_or_copy(project / CANONICAL_CONTEXT_FILE, project / agent.context_file)
        actions.append(f"{agent.context_file} -> AGENTS.md ({how})")

    # 2. skills
    if agent.reads_canonical_skills:
        actions.append(f"{CANONICAL_SKILLS_DIR}/ (native, no shim needed)")
    else:
        assert agent.skills_dir is not None
        skills_dir = project / agent.skills_dir
        for name in skill_names:
            link_or_copy(canonical / name, skills_dir / name)
        # Prune first-class: a skill that was removed upstream leaves a dangling
        # symlink here, and the agent then offers a command whose body is gone.
        for stale in _prune(skills_dir, skill_names, lambda p: p.name):
            actions.append(f"{agent.skills_dir}/{stale} removed (no longer a skill)")
        actions.append(f"{agent.skills_dir}/ -> {CANONICAL_SKILLS_DIR}/ ({len(skill_names)} skills)")

    # 3. explicit command shims
    if agent.commands_dir:
        cmd_dir = project / agent.commands_dir
        cmd_dir.mkdir(parents=True, exist_ok=True)
        for name in skill_names:
            meta = read_skill_frontmatter(canonical / name / "SKILL.md")
            # The directory already supplies the `react:` namespace, so keep the
            # prefix out of the filename: /react:verify, not /react:react-verify.
            short = name.removeprefix("react-")
            payload = {
                "description": meta.get("description", f"React workflow: {name}"),
                "prompt": GEMINI_SHIM_PROMPT.format(
                    skill_name=name,
                    skill_path=f"{CANONICAL_SKILLS_DIR}/{name}",
                ),
            }
            # tomli_w handles all quoting/escaping -- never hand-roll TOML.
            (cmd_dir / f"{short}.toml").write_bytes(tomli_w.dumps(payload).encode("utf-8"))
        expected = [f"{n.removeprefix('react-')}.toml" for n in skill_names]
        for stale in _prune(cmd_dir, expected, lambda p: p.name):
            actions.append(f"{agent.commands_dir}/{stale} removed (no longer a skill)")
        actions.append(f"{agent.commands_dir}/*.toml ({len(skill_names)} shims)")

    return actions


#: Directories of derived agent wiring that `sync` owns and may prune.
WIRING_DIRS = (".claude/agents",)


def prune_stale_wiring(
    project: Path, shared_root: Path, recorded: dict[str, str],
    backup_dir: Path | None = None,
) -> list[str]:
    """Remove agent definitions sync installed that the template no longer ships.

    A subagent file is wiring, not project code: the agent reads it and
    auto-delegates to whatever it describes. When one is retired upstream,
    every existing project keeps offering it -- so the agent delegates to a
    worker whose instructions now contradict the skill that replaced it, and
    nothing says so. `sync` already prunes dead skill links for the same
    reason; this is the same rule one directory over.

    Two conditions: the template no longer has it, AND this project's manifest
    says sync is the one that installed it. A file the user wrote themselves is
    not in `fileHashes` and is never touched.

    Content is deliberately NOT part of the test. A project that skipped a
    template update has a stale copy through no fault of its own, and refusing
    to retire it there is the case that matters most. The original is copied to
    `backup_dir` first, which is what makes that safe -- same bargain as
    `--force-template`.
    """
    gone: list[str] = []
    for rel_dir in WIRING_DIRS:
        directory = project / rel_dir
        if not directory.is_dir():
            continue
        for entry in sorted(directory.glob("*.md")):
            rel = f"{rel_dir}/{entry.name}"
            if (shared_root / rel).exists():
                continue
            if rel not in recorded:
                continue
            if backup_dir is not None:
                saved = backup_dir / rel
                saved.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(entry, saved)
            entry.unlink()
            gone.append(rel)
    return gone


def read_skill_frontmatter(skill_md: Path) -> dict[str, str]:
    """Parse the leading YAML frontmatter of a SKILL.md.

    Deliberately tiny: the Agent Skills spec only requires flat ``key: value``
    pairs, so this avoids a PyYAML dependency. Unknown/indented lines are
    ignored rather than guessed at.
    """
    if not skill_md.is_file():
        return {}
    lines = skill_md.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    meta: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if line.startswith((" ", "\t")) or ":" not in line:
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip().strip('"').strip("'")
    return meta
