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
