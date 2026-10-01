"""End-to-end CLI tests.

The C5 test is the important one: the previous CLI printed `/react.prototype-creator`
while writing `react-prototype-creator.md`, so the first instruction a new user
copied did not exist -- for all nine supported agents. It happened because the
panel was a hand-maintained string literal with no link to the generated files.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from typer.testing import CliRunner

from react_dev import app, _skill_names, __version__
from react_dev.agents import AGENTS, CANONICAL_SKILLS_DIR
from react_dev.project import MANIFEST, REQUIRED_GEN_TARGETS, diagnose

runner = CliRunner()
REPO_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture
def made(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.chdir(tmp_path)
    result = runner.invoke(app, ["init", "app", "--no-git"])
    assert result.exit_code == 0, result.output
    return tmp_path / "app"


def test_init_builds_the_whole_tree(made: Path):
    for expected in [
        "package.json",
        "AGENTS.md",
        "CLAUDE.md",
        "GEMINI.md",
        MANIFEST,
        ".mcp.json",
        "eslint.config.js",
        "tools/gen/index.mjs",
        "src/components/atoms/button.tsx",
        "src/components/molecules/form-field.tsx",
        "src/components/organisms/sidebar-nav.tsx",
        "src/components/templates/app-shell.tsx",
        "src/config/routes.ts",
        "src/lib/api-client.ts",
        "src/testing/architecture.test.ts",
        ".github/workflows/verify.yml",
        ".ai/README.md",
        "specs/README.md",
        "eslint-rules/README.md",
    ]:
        assert (made / expected).exists(), f"missing {expected}"


def test_printed_command_names_all_exist_on_disk(made: Path, tmp_path: Path, monkeypatch):
    """C5 regression: every name the CLI prints must be real, for every agent."""
    monkeypatch.chdir(tmp_path)
    output = runner.invoke(app, ["init", "app2", "--no-git"]).output
    project = tmp_path / "app2"
    installed = {p.parent.name for p in (project / CANONICAL_SKILLS_DIR).glob("*/SKILL.md")}

    # Claude Code: /<skill>
    claude = set(re.findall(r"(?<![\w:$])/(react-[a-z0-9-]+)", output))
    assert claude, "no Claude Code invocations printed"
    assert claude <= installed, f"printed but not installed: {sorted(claude - installed)}"

    # Codex: $<skill>
    codex = set(re.findall(r"\$(react-[a-z0-9-]+)", output))
    assert codex <= installed, f"printed but not installed: {sorted(codex - installed)}"

    # Gemini CLI: /react:<short> -> a real .toml shim
    gemini = set(re.findall(r"/react:([a-z0-9-]+)", output))
    assert gemini, "no Gemini invocations printed"
    shims = {p.stem for p in (project / ".gemini/commands/react").glob("*.toml")}
    assert gemini <= shims, f"printed but no shim: {sorted(gemini - shims)}"


def test_descriptions_are_not_cut_mid_abbreviation(made: Path, tmp_path: Path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    output = runner.invoke(app, ["init", "app3", "--no-git"]).output
    # "AGENTS.md" must never be truncated to "AGENTS" by naive '.' splitting.
    assert "Create or update AGENTS.md" in output.replace("\n", " ").replace("  ", " ")


def test_manifest_records_what_was_built(made: Path):
    manifest = json.loads((made / MANIFEST).read_text(encoding="utf-8"))
    assert manifest["cliVersion"] == __version__
    assert manifest["projectType"] == "react"
    assert set(manifest["agents"]) == set(AGENTS)
    assert manifest["skills"] == sorted(_skill_names(made / CANONICAL_SKILLS_DIR))
    assert "AGENTS.md" in manifest["userOwned"]


def test_doctor_is_clean_on_a_fresh_project(made: Path):
    findings = diagnose(made, cli_version=__version__)
    errors = [f for f in findings if f.level == "error"]
    warnings = [f for f in findings if f.level == "warn"]
    assert not errors, [f"{f.check}: {f.detail}" for f in errors]
    assert not warnings, [f"{f.check}: {f.detail}" for f in warnings]


def test_doctor_detects_a_missing_constitution(made: Path):
    (made / "AGENTS.md").unlink()
    checks = {f.check: f for f in diagnose(made, cli_version=__version__)}
    assert checks["AGENTS.md"].level == "error"


def test_doctor_flags_an_oversized_constitution(made: Path):
    """Codex caps project docs; an 8 KiB+ constitution gets skimmed."""
    (made / "AGENTS.md").write_text("x" * 9000, encoding="utf-8")
    checks = {f.check: f for f in diagnose(made, cli_version=__version__)}
    assert checks["AGENTS.md size"].level == "warn"


def test_doctor_flags_type_escapes(made: Path):
    (made / "src" / "lib" / "sneaky.ts").write_text(
        "export const x = {} as any;\n", encoding="utf-8"
    )
    checks = {f.check: f for f in diagnose(made, cli_version=__version__)}
    assert checks["no type escapes"].level == "warn"


def test_sync_preserves_user_owned_files(made: Path, monkeypatch):
    monkeypatch.chdir(made)
    (made / "AGENTS.md").write_text("# my own rules\n\nNEVER ship on Friday.\n", encoding="utf-8")

    result = runner.invoke(app, ["sync", str(made)])
    assert result.exit_code == 0, result.output

    # The constitution is the user's; sync must not touch it.
    assert "NEVER ship on Friday" in (made / "AGENTS.md").read_text(encoding="utf-8")
    # ...but the derived artifacts are rebuilt.
    assert (made / ".gemini/commands/react/verify.toml").is_file()
    assert (made / ".claude/skills/react-verify").exists()


def test_sync_dry_run_writes_nothing(made: Path, monkeypatch):
    monkeypatch.chdir(made)
    import shutil

    shutil.rmtree(made / ".gemini")
    result = runner.invoke(app, ["sync", str(made), "--dry-run"])

    assert result.exit_code == 0
    assert not (made / ".gemini").exists(), "--dry-run wrote files"


def test_init_refuses_a_non_empty_directory_without_force(tmp_path: Path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    target = tmp_path / "taken"
    target.mkdir()
    (target / "important.txt").write_text("do not clobber", encoding="utf-8")

    result = runner.invoke(app, ["init", "taken", "--no-git"])

    assert result.exit_code == 1
    assert (target / "important.txt").read_text(encoding="utf-8") == "do not clobber"


def test_unknown_agent_is_rejected(tmp_path: Path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    result = runner.invoke(app, ["init", "app", "--agent", "nope", "--no-git"])
    assert result.exit_code == 2
    assert "unknown agent" in result.output


# --------------------------------------------------------------------------- #
# "works properly after updates"
# --------------------------------------------------------------------------- #

def test_doctor_flags_version_skew(made: Path):
    """`sync` refreshes skills but never project code, so a stale stamp matters."""
    manifest = json.loads((made / MANIFEST).read_text(encoding="utf-8"))
    manifest["cliVersion"] = "0.9.0"
    (made / MANIFEST).write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    checks = {f.check: f for f in diagnose(made, cli_version=__version__)}

    assert checks["cli version"].level == "warn"
    assert "0.9.0" in checks["cli version"].detail


def test_doctor_flags_a_missing_generator_target(made: Path):
    """The skills name `gen -- mock`; without it the agent runs a dead command."""
    generator = made / "tools" / "gen" / "index.mjs"
    generator.write_text(
        generator.read_text(encoding="utf-8").replace("  mock: genMock,\n", ""),
        encoding="utf-8",
    )

    checks = {f.check: f for f in diagnose(made, cli_version=__version__)}

    assert checks["generator targets"].level == "error"
    assert "mock" in checks["generator targets"].detail


def test_doctor_flags_missing_mock_infrastructure(made: Path):
    """A project predating MSW cannot run what react-implement tells it to."""
    import shutil

    shutil.rmtree(made / "src" / "testing" / "mocks")

    checks = {f.check: f for f in diagnose(made, cli_version=__version__)}

    assert checks["src/testing/mocks/handlers/index.ts"].level == "error"
    assert checks["src/testing/mocks/server.ts"].level == "error"


def test_doctor_flags_a_gate_dropped_from_package_json(made: Path):
    """react-verify promises `npm run visual`; its absence is a silent gap."""
    pkg = json.loads((made / "package.json").read_text(encoding="utf-8"))
    del pkg["scripts"]["visual"]
    (made / "package.json").write_text(json.dumps(pkg, indent=2), encoding="utf-8")

    checks = {f.check: f for f in diagnose(made, cli_version=__version__)}

    assert checks["npm run visual"].level == "error"


def test_every_required_generator_target_actually_exists(made: Path):
    """Keeps REQUIRED_GEN_TARGETS honest against the shipped generator."""
    source = (made / "tools" / "gen" / "index.mjs").read_text(encoding="utf-8")
    missing = [g for g in REQUIRED_GEN_TARGETS if f"{g}:" not in source]
    assert not missing, f"doctor requires targets the template lacks: {missing}"


def test_init_stamps_a_template_fingerprint(made: Path):
    """A content hash cannot be forgotten the way a version number was."""
    manifest = json.loads((made / MANIFEST).read_text(encoding="utf-8"))
    assert manifest.get("templateFingerprint"), "no fingerprint stamped"
    assert len(manifest["templateFingerprint"]) == 16


def test_doctor_flags_a_stale_template_fingerprint(made: Path):
    manifest = json.loads((made / MANIFEST).read_text(encoding="utf-8"))
    manifest["templateFingerprint"] = "0" * 16
    (made / MANIFEST).write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    template_root = REPO_ROOT / "templates" / "react"
    checks = {
        f.check: f
        for f in diagnose(made, cli_version=__version__, template_root=template_root)
    }

    assert checks["template fingerprint"].level == "warn"
    assert "0000" in checks["template fingerprint"].detail


def test_sync_with_template_adds_missing_files_without_overwriting(made: Path, monkeypatch):
    """The whole point: recover a drifted project without discarding work."""
    import shutil

    monkeypatch.chdir(made)

    # Simulate a project made before MSW existed...
    shutil.rmtree(made / "src" / "testing" / "mocks")
    # ...which also has a file the user edited.
    edited = made / "src" / "components" / "atoms" / "button.tsx"
    edited.write_text("// my own button\nexport const Button = () => null;\n", encoding="utf-8")
    # ...and a file only they have.
    mine = made / "src" / "features" / "mine.ts"
    mine.write_text("export const mine = 1;\n", encoding="utf-8")

    result = runner.invoke(app, ["sync", str(made), "--with-template"])
    assert result.exit_code == 0, result.output

    # restored
    assert (made / "src" / "testing" / "mocks" / "server.ts").is_file()
    # the user's edit survived
    assert "my own button" in edited.read_text(encoding="utf-8")
    # their own file survived
    assert mine.read_text(encoding="utf-8") == "export const mine = 1;\n"
    # and the differing file was reported rather than silently replaced
    assert "need a human" in result.output


def test_sync_without_the_flag_leaves_template_files_alone(made: Path, monkeypatch):
    import shutil

    monkeypatch.chdir(made)
    shutil.rmtree(made / "src" / "testing" / "mocks")

    result = runner.invoke(app, ["sync", str(made)])

    assert result.exit_code == 0
    assert not (made / "src" / "testing" / "mocks").exists(), "plain sync touched project code"


def test_fingerprint_stays_stale_while_files_still_differ(made: Path, monkeypatch):
    """Stamping a fresh hash while gaps remain would silence the warning."""
    monkeypatch.chdir(made)
    before = json.loads((made / MANIFEST).read_text(encoding="utf-8"))["templateFingerprint"]

    (made / "vite.config.ts").write_text("// diverged\n", encoding="utf-8")
    runner.invoke(app, ["sync", str(made), "--with-template"])

    after = json.loads((made / MANIFEST).read_text(encoding="utf-8"))["templateFingerprint"]
    assert after == before, "fingerprint was refreshed despite unresolved differences"


def test_force_template_overwrites_but_backs_up_first(made: Path, monkeypatch):
    """Reversibility is what makes an overwrite acceptable at all."""
    monkeypatch.chdir(made)
    target = made / "vite.config.ts"
    original = "// my version\n"
    target.write_text(original, encoding="utf-8")

    result = runner.invoke(app, ["sync", str(made), "--force-template"])
    assert result.exit_code == 0, result.output

    # overwritten with the template's copy
    assert target.read_text(encoding="utf-8") != original
    # and the original is recoverable
    backups = list((made / ".react-dev-backup").rglob("vite.config.ts"))
    assert backups, "no backup was written"
    assert backups[0].read_text(encoding="utf-8") == original


def test_force_template_still_never_touches_user_owned_files(made: Path, monkeypatch):
    monkeypatch.chdir(made)
    mine = "# my rules\n\nNEVER ship on a Friday.\n"
    (made / "AGENTS.md").write_text(mine, encoding="utf-8")

    runner.invoke(app, ["sync", str(made), "--force-template"])

    assert (made / "AGENTS.md").read_text(encoding="utf-8") == mine
