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
        for name in skill_names:
            link_or_copy(canonical / name, project / agent.skills_dir / name)
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
        actions.append(f"{agent.commands_dir}/*.toml ({len(skill_names)} shims)")

    return actions


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
