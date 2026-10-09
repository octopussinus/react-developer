"""Adapter tests.

These exist because the previous implementation emitted Gemini/Qwen TOML by
f-string interpolation: a `"` in a description or a `\"\"\"` in a body produced a
corrupt file, `init` still reported success, and the user found out when the
command misbehaved. Every emitted artifact is now asserted.
"""

from __future__ import annotations

import tomllib
from pathlib import Path

import pytest

from react_dev.agents import (
    AGENTS,
    CANONICAL_SKILLS_DIR,
    DEFAULT_AGENTS,
    emit_for_agent,
    read_skill_frontmatter,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILLS_ROOT = REPO_ROOT / "skills"


def _skill_names() -> list[str]:
    return sorted(p.parent.name for p in SKILLS_ROOT.glob("*/SKILL.md"))


@pytest.fixture
def project(tmp_path: Path) -> Path:
    """A project tree with the canonical skills installed, nothing agent-specific."""
    import shutil

    (tmp_path / "AGENTS.md").write_text("# AGENTS.md\n\nrules\n", encoding="utf-8")
    dest = tmp_path / CANONICAL_SKILLS_DIR
    dest.mkdir(parents=True)
    for name in _skill_names():
        shutil.copytree(SKILLS_ROOT / name, dest / name)
    return tmp_path


# --------------------------------------------------------------------------- #
# skill authoring invariants
# --------------------------------------------------------------------------- #

def test_every_skill_has_name_and_description():
    """Both are required by all three agents; description drives auto-invocation."""
    for name in _skill_names():
        meta = read_skill_frontmatter(SKILLS_ROOT / name / "SKILL.md")
        assert meta.get("name") == name, f"{name}: frontmatter name must match the directory"
        assert len(meta.get("description", "")) > 30, f"{name}: description too thin to trigger on"


def test_skills_use_only_portable_frontmatter_fields():
    """Claude-only keys break the Agent Skills spec validators Codex/Gemini use."""
    portable = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
    for name in _skill_names():
        meta = read_skill_frontmatter(SKILLS_ROOT / name / "SKILL.md")
        extra = set(meta) - portable
        assert not extra, f"{name}: non-portable frontmatter {sorted(extra)}"


def test_skill_bodies_stay_small_enough_to_be_read():
    """Progressive disclosure: detail belongs in references/, not the body."""
    for name in _skill_names():
        body = (SKILLS_ROOT / name / "SKILL.md").read_text(encoding="utf-8")
        lines = len(body.splitlines())
        assert lines <= 110, f"{name}: {lines} lines; move detail into references/"


def test_referenced_files_exist():
    """A dangling reference silently degrades the skill."""
    import re

    for name in _skill_names():
        skill_dir = SKILLS_ROOT / name
        body = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
        for target in re.findall(r"\]\((references/[^)]+)\)", body):
            assert (skill_dir / target).is_file(), f"{name}: missing {target}"


# --------------------------------------------------------------------------- #
# emitted artifacts
# --------------------------------------------------------------------------- #

def test_codex_needs_nothing_generated(project: Path):
    """Codex reads .agents/skills and AGENTS.md natively; emitting shims would duplicate."""
    emit_for_agent(project, AGENTS["codex"], _skill_names())

    assert not (project / ".codex").exists()
    assert not (project / ".agents" / "skills" / "react-verify" / "SKILL.md").is_symlink()


def test_claude_skills_point_at_the_canonical_copy(project: Path):
    emit_for_agent(project, AGENTS["claude"], _skill_names())

    for name in _skill_names():
        entry = project / ".claude" / "skills" / name
        assert entry.exists(), f"{name} not wired for Claude Code"
        # Symlink where supported, copy otherwise -- either way it must resolve.
        assert (entry / "SKILL.md").is_file()

    assert (project / "CLAUDE.md").read_text(encoding="utf-8").startswith("# AGENTS.md")


def test_gemini_shims_are_valid_toml_and_do_not_duplicate_prose(project: Path):
    emit_for_agent(project, AGENTS["gemini"], _skill_names())

    shims = sorted((project / ".gemini" / "commands" / "react").glob("*.toml"))
    assert len(shims) == len(_skill_names())

    for shim in shims:
        data = tomllib.loads(shim.read_text(encoding="utf-8"))
        assert data["description"], f"{shim.name}: empty description"
        # The shim must POINT at the canonical skill, never inline it.
        assert f"@{{{CANONICAL_SKILLS_DIR}/react-{shim.stem}/SKILL.md}}" in data["prompt"]
        assert "{{args}}" in data["prompt"], f"{shim.name}: drops user arguments"
        assert "@{AGENTS.md}" in data["prompt"], f"{shim.name}: drops project rules"

    # Namespaced by directory, so the prefix must not be repeated in the filename.
    assert not any(s.stem.startswith("react-") for s in shims)


def test_toml_survives_quotes_and_triple_quotes(project: Path, tmp_path: Path):
    """The exact payload that broke the old f-string serializer."""
    import shutil

    hostile = project / CANONICAL_SKILLS_DIR / "react-hostile"
    hostile.mkdir(parents=True)
    (hostile / "SKILL.md").write_text(
        '---\n'
        'name: react-hostile\n'
        'description: Has "double quotes", a backslash \\ and a \\u0022 escape.\n'
        '---\n\n'
        'Body with """triple quotes""" and a trailing backslash \\\n',
        encoding="utf-8",
    )

    emit_for_agent(project, AGENTS["gemini"], ["react-hostile"])

    shim = project / ".gemini" / "commands" / "react" / "hostile.toml"
    data = tomllib.loads(shim.read_text(encoding="utf-8"))
    assert '"double quotes"' in data["description"]


def test_all_three_agents_coexist(project: Path):
    """init wires several agents into one tree; they must not fight."""
    for key in DEFAULT_AGENTS:
        emit_for_agent(project, AGENTS[key], _skill_names())

    assert (project / "CLAUDE.md").exists()
    assert (project / "GEMINI.md").exists()
    assert (project / "AGENTS.md").exists()
    assert (project / ".claude" / "skills").is_dir()
    assert (project / ".gemini" / "commands" / "react").is_dir()
    # One canonical copy of each skill body, regardless of how many agents.
    assert len(list((project / CANONICAL_SKILLS_DIR).glob("*/SKILL.md"))) == len(_skill_names())


def test_emit_is_idempotent(project: Path):
    """`react-dev sync` re-runs this; a second pass must not duplicate or fail."""
    first = emit_for_agent(project, AGENTS["gemini"], _skill_names())
    second = emit_for_agent(project, AGENTS["gemini"], _skill_names())

    assert first == second
    shims = list((project / ".gemini" / "commands" / "react").glob("*.toml"))
    assert len(shims) == len(_skill_names())


def test_emit_prunes_a_skill_that_no_longer_exists(project: Path):
    """Removing a skill must remove its derived artifacts.

    Found by deleting `react-prototype`: emit only ever added, so Claude kept a
    dangling `.claude/skills/react-prototype` symlink and Gemini kept a
    `prototype.toml` shim whose `@{...}` body pointed at nothing. Both agents
    went on offering a command that could not work.
    """
    names = _skill_names()
    for key in ("claude", "gemini"):
        emit_for_agent(project, AGENTS[key], names)

    link = project / ".claude" / "skills" / names[0]
    shim = project / ".gemini" / "commands" / "react" / f"{names[0].removeprefix('react-')}.toml"
    assert link.exists() and shim.is_file()

    remaining = names[1:]
    for key in ("claude", "gemini"):
        emit_for_agent(project, AGENTS[key], remaining)

    assert not link.exists() and not link.is_symlink(), "stale skill link survived"
    assert not shim.exists(), "stale Gemini shim survived"
    # Everything else is untouched.
    assert len(list((project / ".claude" / "skills").iterdir())) == len(remaining)
    assert len(list((project / ".gemini" / "commands" / "react").glob("*.toml"))) == len(remaining)


def test_emit_reports_what_it_pruned(project: Path):
    names = _skill_names()
    emit_for_agent(project, AGENTS["claude"], names)
    actions = emit_for_agent(project, AGENTS["claude"], names[1:])
    assert any("removed (no longer a skill)" in a for a in actions), actions


def test_react_prototype_is_gone(project: Path):
    """The prototype stage was folded into react-spec; nothing may reference it."""
    assert "react-prototype" not in _skill_names()
    repo = Path(__file__).resolve().parent.parent
    # MIGRATION.md and the audit are dated records of earlier versions; they are
    # allowed to name a stage that existed then. Live guidance is not.
    historical = {"MIGRATION.md", "ENTERPRISE-READINESS-AUDIT.md"}
    live = [
        f
        for pattern in ("skills/*/SKILL.md", "*.md", "templates/shared/*.md",
                        "templates/shared/**/*.md", "templates/react/AGENTS.md")
        for f in repo.glob(pattern)
        if f.name not in historical
    ]
    assert live, "glob matched nothing -- the test would pass vacuously"
    for f in live:
        body = f.read_text()
        if f.name == "design-input.md":
            continue  # explains what replaced it
        assert "react-prototype" not in body, f"{f} still references it"


def test_a_retired_subagent_is_removed_and_backed_up(tmp_path):
    """A subagent file is wiring: the agent auto-delegates to whatever it names.

    Left behind after the template retires it, the agent keeps delegating to a
    worker whose instructions contradict the skill that replaced it -- and
    nothing says so. Found live: `sync` updated every skill in a real project
    and left `react-feature-worker` offering a mechanism that no longer exists.
    """
    from react_dev.agents import prune_stale_wiring

    shared = tmp_path / "template" / "shared" / ".claude" / "agents"
    shared.mkdir(parents=True)
    (shared / "react-verify.md").write_text("still shipped\n", encoding="utf-8")

    project = tmp_path / "project"
    agents_dir = project / ".claude" / "agents"
    agents_dir.mkdir(parents=True)
    (agents_dir / "react-verify.md").write_text("still shipped\n", encoding="utf-8")
    # Stale: sync installed it, the template dropped it, and this project never
    # took the last update -- so its content does NOT match what was stamped.
    (agents_dir / "react-feature-worker.md").write_text("an older copy\n", encoding="utf-8")
    # The user's own. Not in fileHashes, so not ours to delete.
    (agents_dir / "my-own-helper.md").write_text("mine\n", encoding="utf-8")

    recorded = {
        ".claude/agents/react-verify.md": "aaaaaaaaaaaa",
        ".claude/agents/react-feature-worker.md": "bbbbbbbbbbbb",
    }
    backup = tmp_path / "backup"

    gone = prune_stale_wiring(project, tmp_path / "template" / "shared", recorded, backup)

    assert gone == [".claude/agents/react-feature-worker.md"]
    assert not (agents_dir / "react-feature-worker.md").exists()
    assert (agents_dir / "react-verify.md").exists(), "still shipped; must stay"
    assert (agents_dir / "my-own-helper.md").exists(), "the user's own file was deleted"
    # Reversible, which is what makes deleting a drifted copy defensible.
    saved = backup / ".claude" / "agents" / "react-feature-worker.md"
    assert saved.read_text() == "an older copy\n"
