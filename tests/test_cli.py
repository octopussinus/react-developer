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


def test_doctor_separates_template_drift_from_your_own_edits(made: Path):
    """The point of per-file hashes: a file you customised differs forever, so
    warning about it every run is noise. Only an UNTOUCHED file that the template
    has moved past is real drift."""
    roots = (REPO_ROOT / "templates" / "react", REPO_ROOT / "templates" / "shared")

    # Force the whole-tree fingerprint stale so the drift branch is reached.
    manifest = json.loads((made / MANIFEST).read_text(encoding="utf-8"))
    manifest["templateFingerprint"] = "0" * 16
    (made / MANIFEST).write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    # A file the user edited: differs from the template AND from the stamp.
    (made / "vite.config.ts").write_text("// mine\n", encoding="utf-8")

    checks = {f.check: f for f in diagnose(made, cli_version=__version__, template_roots=roots)}

    assert checks["template drift"].level == "ok", (
        "a customised file was reported as drift: " + checks["template drift"].detail
    )
    assert "customised by you" in checks["template drift"].detail


def test_doctor_reports_a_file_that_is_genuinely_behind_the_template(made: Path):
    roots = (REPO_ROOT / "templates" / "react", REPO_ROOT / "templates" / "shared")

    manifest = json.loads((made / MANIFEST).read_text(encoding="utf-8"))
    manifest["templateFingerprint"] = "0" * 16
    # Pretend the project was shipped an older vite.config whose hash we record,
    # and that the project still has exactly that -- untouched but outdated.
    import hashlib

    stale = "// an older template version\n"
    (made / "vite.config.ts").write_text(stale, encoding="utf-8")
    manifest.setdefault("fileHashes", {})["vite.config.ts"] = hashlib.sha256(
        stale.encode()
    ).hexdigest()[:12]
    (made / MANIFEST).write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    checks = {f.check: f for f in diagnose(made, cli_version=__version__, template_roots=roots)}

    assert checks["template drift"].level == "warn"
    assert "vite.config.ts" in checks["template drift"].detail


def test_sync_updates_untouched_files_but_never_your_edits(made: Path, monkeypatch):
    """Regression for the two bugs that broke a real project: --force-template
    discarded a customised Button and a public-layout router."""
    import hashlib

    monkeypatch.chdir(made)
    manifest = json.loads((made / MANIFEST).read_text(encoding="utf-8"))

    mine = made / "src" / "components" / "atoms" / "button.tsx"
    mine.write_text("// my own button\n", encoding="utf-8")

    untouched = made / "vite.config.ts"
    stale = "// an older template version\n"
    untouched.write_text(stale, encoding="utf-8")
    manifest["fileHashes"]["vite.config.ts"] = hashlib.sha256(stale.encode()).hexdigest()[:12]
    (made / MANIFEST).write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    result = runner.invoke(app, ["sync", str(made), "--with-template"])
    assert result.exit_code == 0, result.output

    # the untouched-but-outdated file was brought up to date...
    assert untouched.read_text(encoding="utf-8") != stale
    # ...and the edit survived, without needing --force-template
    assert "my own button" in mine.read_text(encoding="utf-8")
    assert "are yours" in result.output


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
    mine = made / "src" / "modules" / "mine.ts"
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


def test_doctor_flags_missing_source_injection(made: Path):
    """Without it the feedback toolbar silently loses file:line."""
    config = made / "vite.config.ts"
    config.write_text(
        config.read_text(encoding="utf-8").replace("devtools(", "disabled_devtools("),
        encoding="utf-8",
    )

    checks = {f.check: f for f in diagnose(made, cli_version=__version__)}

    assert checks["source injection"].level == "warn"
    assert "file:line" in checks["source injection"].detail


def test_doctor_requires_the_feedback_toolbar(made: Path):
    (made / "src" / "dev" / "feedback-toolbar.tsx").unlink()

    checks = {f.check: f for f in diagnose(made, cli_version=__version__)}

    assert checks["src/dev/feedback-toolbar.tsx"].level == "error"


def test_sync_merges_package_json_and_keeps_user_dependencies(made: Path, monkeypatch):
    """Regression: a force-sync once dropped lucide-react and broke a feature."""
    monkeypatch.chdir(made)

    pkg_path = made / "package.json"
    pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
    pkg["dependencies"]["lucide-react"] = "^1.49.0"       # the user installed this
    pkg["scripts"]["my-script"] = "echo mine"             # and added this
    del pkg["scripts"]["verify"]                          # and lost a gate somehow
    pkg_path.write_text(json.dumps(pkg, indent=2), encoding="utf-8")

    result = runner.invoke(app, ["sync", str(made), "--force-template"])
    assert result.exit_code == 0, result.output

    after = json.loads(pkg_path.read_text(encoding="utf-8"))
    # the user's dependency survived
    assert after["dependencies"]["lucide-react"] == "^1.49.0"
    # their script survived
    assert after["scripts"]["my-script"] == "echo mine"
    # and the missing gate was restored by the template
    assert "verify" in after["scripts"]


def test_sync_never_clobbers_user_feature_code(made: Path, monkeypatch):
    monkeypatch.chdir(made)
    feature = made / "src" / "features" / "landing" / "components"
    feature.mkdir(parents=True)
    mine = feature / "pillar-grid.tsx"
    mine.write_text("export const PillarGrid = () => null;\n", encoding="utf-8")

    runner.invoke(app, ["sync", str(made), "--force-template"])

    assert mine.read_text(encoding="utf-8") == "export const PillarGrid = () => null;\n"


def test_init_ships_the_inbox_notification_hook(made: Path):
    """Claude Code learns about new feedback without being asked."""
    settings = made / ".claude" / "settings.json"
    assert settings.is_file(), "no .claude/settings.json shipped"

    config = json.loads(settings.read_text(encoding="utf-8"))
    hooks = config["hooks"]["UserPromptSubmit"][0]["hooks"]
    command = next(h["command"] for h in hooks if h["type"] == "command")

    assert ".ai/inbox" in command
    assert "UserPromptSubmit" in command, "must name its own event in the output JSON"


def test_the_inbox_hook_is_silent_when_the_inbox_is_empty(made: Path):
    """It runs on every prompt, so an empty inbox must cost nothing."""
    import subprocess

    command = json.loads((made / ".claude" / "settings.json").read_text(encoding="utf-8"))[
        "hooks"
    ]["UserPromptSubmit"][0]["hooks"][0]["command"]

    empty = subprocess.run(
        ["sh", "-c", command], cwd=made, capture_output=True, text=True, timeout=20
    )
    assert empty.returncode == 0
    assert empty.stdout.strip() == "", f"hook spoke with an empty inbox: {empty.stdout!r}"

    # ...and reports a real entry as valid JSON naming the count.
    (made / ".ai" / "inbox").mkdir(parents=True, exist_ok=True)
    (made / ".ai" / "inbox" / "entry.json").write_text('{"comment": "x"}', encoding="utf-8")

    full = subprocess.run(
        ["sh", "-c", command], cwd=made, capture_output=True, text=True, timeout=20
    )
    payload = json.loads(full.stdout)
    assert payload["hookSpecificOutput"]["hookEventName"] == "UserPromptSubmit"
    context = payload["hookSpecificOutput"]["additionalContext"]
    assert "1 new" in context

    # It must also surface work awaiting the USER's confirmation, and say that
    # closing feedback is not the agent's to do -- an agent that writes to done/
    # closes the fixes that did not work along with the ones that did.
    (made / ".ai" / "working").mkdir(parents=True, exist_ok=True)
    (made / ".ai" / "working" / "claimed.json").write_text('{"comment": "y"}', encoding="utf-8")

    both = subprocess.run(
        ["sh", "-c", command], cwd=made, capture_output=True, text=True, timeout=20
    )
    context = json.loads(both.stdout)["hookSpecificOutput"]["additionalContext"]
    assert "1 new" in context and "1 in .ai/working/" in context
    assert ".ai/done/" in context, "the hook must tell the agent not to touch done/"


def test_feedback_skill_never_closes_its_own_work():
    """Confirmation belongs to the user; the agent only hands work back.

    Without this the agent marks its own fixes done, and the ones it got wrong
    disappear with the rest -- which are exactly the ones worth a second look.
    """
    body = (REPO_ROOT / "skills" / "react-feedback" / "SKILL.md").read_text()
    assert "NEVER write to or read `.ai/done/`" in body
    assert ".ai/working/" in body, "the skill must claim entries before working"

    lifecycle = REPO_ROOT / "skills" / "react-feedback" / "references" / "lifecycle.md"
    assert lifecycle.is_file(), "the three-folder lifecycle is not documented"
    assert "awaiting-confirmation" in lifecycle.read_text()


def test_feedback_plugin_only_the_user_can_reach_done():
    """The resolve endpoint is the only writer of done/, and it is user-driven."""
    plugin = (REPO_ROOT / "templates/react/tools/feedback-plugin.mjs").read_text()
    assert "feedback/resolve" in plugin and "feedback/list" in plugin
    # A create must never land anywhere but the inbox.
    create = plugin.split("'/__react-dev/feedback'")[1]
    assert "aiDir(root, 'inbox')" in create
    assert "'done'" not in create.split("server.middlewares.use")[0]
    # Path traversal: an id is a bare file name or it is rejected.
    assert "includes('..')" in plugin and "includes('/')" in plugin


def test_sync_with_template_also_restores_shared_scaffolding(made: Path, monkeypatch):
    """Regression: sync walked only templates/<type>, so anything added to
    templates/shared (CI, .mcp.json, .ai/, .claude/settings.json) could never
    reach an existing project."""
    monkeypatch.chdir(made)

    settings = made / ".claude" / "settings.json"
    workflow = made / ".github" / "workflows" / "verify.yml"
    settings.unlink()
    workflow.unlink()

    result = runner.invoke(app, ["sync", str(made), "--with-template"])
    assert result.exit_code == 0, result.output

    assert settings.is_file(), "shared .claude/settings.json was not restored"
    assert workflow.is_file(), "shared CI workflow was not restored"


def test_sync_does_not_resurrect_deliberately_removed_files(made: Path, monkeypatch):
    """A project that outgrows template scaffolding should stay rid of it."""
    monkeypatch.chdir(made)

    placeholder = made / "src" / "app" / "pages" / "home.tsx"
    assert placeholder.is_file()
    placeholder.unlink()

    manifest = json.loads((made / MANIFEST).read_text(encoding="utf-8"))
    manifest["userRemoved"] = ["src/app/pages/home.tsx"]
    (made / MANIFEST).write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    runner.invoke(app, ["sync", str(made), "--with-template"])

    assert not placeholder.exists(), "sync resurrected a file the project removed"
    # and the list survives the sync, so it keeps working next time
    after = json.loads((made / MANIFEST).read_text(encoding="utf-8"))
    assert "src/app/pages/home.tsx" in after["userRemoved"]


# --- the pipeline -----------------------------------------------------------
# These exist because the pipeline's value is that it reads as one sequence.
# A skill that forgets its stage line, or a stage missing from WORKFLOW_ORDER,
# breaks the handoff silently -- the agent just stops at the end of a skill.

PIPELINE_SKILLS = [
    "react-constitution", "react-roadmap", "react-feature", "react-spec",
    "react-clarify", "react-implement", "react-verify", "react-analyze",
    "react-review", "react-ship", "react-merge",
]


def test_every_skill_declares_its_place_in_the_pipeline():
    for d in sorted((REPO_ROOT / "skills").iterdir()):
        body = (d / "SKILL.md").read_text()
        assert "**Stage " in body or "**Toolbox skill**" in body, (
            f"{d.name} declares neither a stage nor toolbox status"
        )


def test_pipeline_stages_are_numbered_1_to_11_without_gaps():
    import re
    seen = {}
    for name in PIPELINE_SKILLS:
        body = (REPO_ROOT / "skills" / name / "SKILL.md").read_text()
        m = re.search(r"\*\*Stage (\d+) of 11\*\*", body)
        assert m, f"{name} has no 'Stage N of 11' banner"
        seen[int(m.group(1))] = name
    assert sorted(seen) == list(range(1, 12)), f"gaps or duplicates: {sorted(seen)}"


def test_workflow_order_lists_every_pipeline_stage_in_order():
    from react_dev import WORKFLOW_ORDER
    positions = [WORKFLOW_ORDER.index(n) for n in PIPELINE_SKILLS]
    assert positions == sorted(positions), "WORKFLOW_ORDER disagrees with the stage numbers"


def test_pipeline_status_reports_planned_for_a_roadmapped_feature(tmp_path):
    from react_dev.project import pipeline_status
    (tmp_path / "specs" / "roadmap").mkdir(parents=True)
    (tmp_path / "specs" / "ROADMAP.md").write_text(
        "| 1 | landing | public | — |\n| 2 | dog-profile | app | — |\n"
    )
    (tmp_path / "specs" / "roadmap" / "001-landing.md").write_text("# Landing\n")
    (tmp_path / "specs" / "roadmap" / "002-dog-profile.md").write_text("# Dog profile\n")

    statuses = pipeline_status(tmp_path)
    assert [s.slug for s in statuses] == ["landing", "dog-profile"]
    assert all(s.stage == "planned" for s in statuses)
    assert statuses[0].next_command == "react-feature 1"


def test_pipeline_status_advances_as_the_spec_folder_fills(tmp_path):
    from react_dev.project import pipeline_status
    (tmp_path / "specs" / "roadmap").mkdir(parents=True)
    (tmp_path / "specs" / "ROADMAP.md").write_text("| 1 | landing | public | — |\n")
    (tmp_path / "specs" / "roadmap" / "001-landing.md").write_text("# Landing\n")

    work = tmp_path / "specs" / "001-landing"
    work.mkdir()
    assert pipeline_status(tmp_path)[0].stage == "started"

    (work / "spec.md").write_text("# Spec\n\n[NEEDS CLARIFICATION: which auth?]\n")
    assert pipeline_status(tmp_path)[0].stage == "specced"

    (work / "spec.md").write_text("# Spec\n\nAll decided.\n")
    (work / "tasks.md").write_text("- [ ] build it\n")
    assert pipeline_status(tmp_path)[0].stage == "clarified"

    (work / "tasks.md").write_text("- [x] build it\n")
    assert pipeline_status(tmp_path)[0].stage == "implemented"


def test_pipeline_status_never_stores_stage_in_the_manifest(tmp_path):
    """Derived state only -- a stored stage is wrong the moment anyone edits by hand."""
    from react_dev.project import pipeline_status, MANIFEST
    (tmp_path / "specs" / "roadmap").mkdir(parents=True)
    (tmp_path / "specs" / "ROADMAP.md").write_text("| 1 | landing | public | — |\n")
    (tmp_path / "specs" / "roadmap" / "001-landing.md").write_text("# Landing\n")
    pipeline_status(tmp_path)
    manifest = tmp_path / MANIFEST
    if manifest.is_file():
        assert "stage" not in manifest.read_text()


def test_status_command_runs_on_a_project_with_a_roadmap(tmp_path):
    (tmp_path / "specs" / "roadmap").mkdir(parents=True)
    (tmp_path / "specs" / "ROADMAP.md").write_text(
        "| P1 | **OpenAPI contract**: not agreed | blocks all | open |\n"
        "| 1 | landing | public | — |\n"
    )
    (tmp_path / "specs" / "roadmap" / "001-landing.md").write_text("# Landing\n")

    result = runner.invoke(app, ["status", str(tmp_path)])
    assert result.exit_code == 0, result.output
    assert "landing" in result.output
    assert "Prerequisites" in result.output
    assert "OpenAPI contract" in result.output


def test_shared_docs_are_formatted_with_the_template_prettier_config():
    """Shared docs must satisfy the GENERATED project's prettier, not the repo's.

    This repo has no prettier config, so `npx prettier --write templates/shared/...`
    silently uses prettier's defaults (printWidth 80) while the generated project
    checks with the template's printWidth 100 -- prettier resolves config from the
    FILE's location, not the cwd. Markdown table padding differs between the two,
    so a fresh `npm run verify` fails on a doc nobody edited. Hit twice; now caught
    here instead of in a generated project.
    """
    import shutil as _shutil
    import subprocess

    template = REPO_ROOT / "templates" / "react"
    if not (template / "node_modules" / ".bin" / "prettier").exists():
        pytest.skip("template deps not installed")
    assert _shutil.which("npx"), "npx missing"

    shared = REPO_ROOT / "templates" / "shared"
    docs = [str(p.relative_to(template.parent.parent)) for p in shared.rglob("*.md")]
    assert docs, "no shared docs found -- test would pass vacuously"

    proc = subprocess.run(
        [str(template / "node_modules" / ".bin" / "prettier"),
         "--config", str(template / ".prettierrc"), "--check", *docs],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=180,
    )
    assert proc.returncode == 0, (
        "shared docs are not formatted for the generated project.\n"
        f"fix: cd templates/react && npx prettier --config .prettierrc "
        f"--write '../shared/**/*.md'\n{proc.stdout}{proc.stderr}"
    )


def test_template_constitution_stays_under_codex_doc_limit():
    """Codex stops reading AGENTS.md at project_doc_max_bytes (32 KiB default).

    react-constitution targets 8 KiB, and react-feedback APPENDS learned rules to
    this file over the project's life -- so the shipped template must leave room.
    8 KiB is the self-imposed target; Codex's own default is 32 KiB.
    """
    size = (REPO_ROOT / "templates" / "react" / "AGENTS.md").stat().st_size
    assert size < 8_192, (
        f"template AGENTS.md is {size} B, over the 8 KiB target. Move detail into a "
        "referenced doc rather than growing the constitution."
    )


def test_every_skill_ends_with_a_next_block():
    """The user's last instruction must always be what to run next.

    Before this, 5 of 15 skills ended on a '## Report' section with no handoff, so
    the run just stopped and the user had to work out the next command themselves.
    """
    for d in sorted((REPO_ROOT / "skills").iterdir()):
        body = (d / "SKILL.md").read_text()
        headings = [ln for ln in body.splitlines() if ln.startswith("## ")]
        assert headings, f"{d.name} has no sections"
        assert headings[-1] == "## Next", (
            f"{d.name} ends on '{headings[-1]}', not '## Next' -- the reply would "
            "stop without telling the user what to run"
        )
        tail = body.split("## Next", 1)[1]
        assert "**Do next:**" in tail, f"{d.name} Next block names no command"
        # One command, not a menu: the block may offer at most one alternative.
        assert tail.count("**Do next:**") == 1, f"{d.name} has more than one Do next"


def test_next_blocks_name_a_real_skill_or_command():
    """A handoff pointing at a skill that does not exist is worse than none."""
    import re
    names = {d.name for d in (REPO_ROOT / "skills").iterdir() if d.is_dir()} | {
        "react-dev", "code-review"}
    for d in sorted((REPO_ROOT / "skills").iterdir()):
        tail = (d / "SKILL.md").read_text().split("## Next", 1)[1]
        for cited in re.findall(r"`[/$]?(react[-:][a-z-]+|code-review)", tail):
            base = cited.replace("react:", "react-")
            assert base in names, (
                f"{d.name} Next block cites `{base}`, which is not a skill or command"
            )


def test_generator_output_is_prettier_clean_for_a_long_page_name(tmp_path):
    """`gen -- feature <name>` must pass format:check whatever the name is.

    Templates are hand-written strings, so whether a line fits printWidth depends
    on the name substituted in. `feature orders` stayed under it; `feature
    invoices` produced a 105-character signature in the mock factory and
    `npm run verify` failed on format:check immediately after generating. The
    generator now formats what it writes; this proves it, with a name long enough
    to overflow.
    """
    import shutil
    import subprocess

    template = REPO_ROOT / "templates" / "react"
    deps = template / "node_modules"
    if not (deps / ".bin" / "prettier").exists():
        pytest.skip("template deps not installed")

    project = tmp_path / "app"
    shutil.copytree(template, project, ignore=shutil.ignore_patterns(
        "node_modules", "test-results", "playwright-report", "dist", ".react-dev-backup"))
    (project / "node_modules").symlink_to(deps, target_is_directory=True)

    gen = subprocess.run(
        ["node", "tools/gen/index.mjs", "feature", "alerts", "notifications"],
        cwd=project, capture_output=True, text=True, timeout=180,
    )
    assert gen.returncode == 0, f"{gen.stdout}\n{gen.stderr}"
    assert "notifications" in gen.stdout

    check = subprocess.run(
        [str(deps / ".bin" / "prettier"), "--check", "."],
        cwd=project, capture_output=True, text=True, timeout=240,
    )
    assert check.returncode == 0, (
        "generated code is not prettier-clean, so `npm run verify` would fail "
        f"right after generating a feature:\n{check.stdout}{check.stderr}"
    )


def test_duplicate_components_check_is_a_required_capability():
    """react-analyze runs `npm run components:check`, so doctor must demand it.

    The repo rule: any template surface a skill depends on goes in REQUIRED_*,
    otherwise doctor reports a drifted project as healthy while the agent runs a
    command it does not have.
    """
    from react_dev.project import REQUIRED_PATHS, REQUIRED_SCRIPTS

    assert any(name == "components:check" for name, _ in REQUIRED_SCRIPTS)
    assert any(p == "scripts/duplicate-components-check.mjs" for p, _ in REQUIRED_PATHS)

    template = REPO_ROOT / "templates" / "react"
    assert (template / "scripts" / "duplicate-components-check.mjs").is_file()
    pkg = json.loads((template / "package.json").read_text())
    assert pkg["scripts"]["components:check"] == "node scripts/duplicate-components-check.mjs"
    assert "components:check" in pkg["scripts"]["verify"], "not wired into the gate"


def test_duplicate_components_check_fails_on_a_copy_and_passes_on_an_opt_out(tmp_path):
    """Behaviour, not just presence: a vacuous gate is worse than none."""
    import subprocess

    script = REPO_ROOT / "templates" / "react" / "scripts" / "duplicate-components-check.mjs"
    project = tmp_path / "app"
    for page in ("list", "detail"):
        (project / "src" / "modules" / "orders" / page / "components").mkdir(parents=True)
    (project / "scripts").mkdir()

    body = "export function StatusBadge() {\n  return null;\n}\n"
    orders = project / "src/modules/orders/list/components/status-badge.tsx"
    invoices = project / "src/modules/orders/detail/components/status-badge.tsx"

    def run():
        return subprocess.run(["node", str(script)], cwd=project,
                              capture_output=True, text=True, timeout=60)

    # One copy only: clean.
    orders.write_text(body)
    assert run().returncode == 0

    # Two copies: fails, and names the promote command.
    invoices.write_text(body)
    failed = run()
    assert failed.returncode == 1, failed.stdout
    assert "status-badge.tsx" in failed.stderr
    assert "promote" in failed.stderr

    # Opt-out on one copy only: still fails -- a half opt-out is not an opt-out.
    invoices.write_text("// duplicate-ok: different status vocabulary\n" + body)
    half = run()
    assert half.returncode == 1
    assert "all of them must" in half.stderr

    # Opt-out on both: passes.
    orders.write_text("// duplicate-ok: different status vocabulary\n" + body)
    assert run().returncode == 0

    # Tests and stories share the component's name by design, never a finding.
    (project / "src/modules/orders/list/components/status-badge.test.tsx").write_text(body)
    (project / "src/modules/orders/detail/components/status-badge.test.tsx").write_text(body)
    assert run().returncode == 0

    # Two copies must NOT lead with promote -- the rule of three and AHA both say
    # two is weak evidence, and the wrong abstraction costs more than the copy.
    orders.write_text(body)
    invoices.write_text(body)
    two = run()
    assert two.returncode == 1
    assert "two copies is not yet evidence" in two.stderr, two.stderr
    assert "must they change together" in two.stderr

    # Three copies: now it says promote, because the evidence is in.
    third = project / "src/modules/orders/archive/components"
    third.mkdir(parents=True)
    (third / "status-badge.tsx").write_text(body)
    three = run()
    assert three.returncode == 1
    assert "three copies" in three.stderr, three.stderr
    assert "enough evidence" in three.stderr


def test_shipped_guide_only_references_docs_a_project_actually_has():
    """GUIDE.md's Docs table must not name files the generated project lacks.

    It listed `README.md` (projects have none) and
    `ENTERPRISE-READINESS-AUDIT.md` (never copied into the template, and later
    deleted from the repo too). A guide whose first table sends you to missing
    files teaches the reader not to trust the rest of it.
    """
    guide = (REPO_ROOT / "templates" / "shared" / "GUIDE.md").read_text()
    section = guide.split("### Docs", 1)
    assert len(section) == 2, "GUIDE.md has no '### Docs' section"
    table = section[1].split("\n##", 1)[0]

    cited = re.findall(r"^\|\s*`([^`]+)`\s*\|", table, re.M)
    assert cited, "Docs table lists nothing -- the test would pass vacuously"

    roots = (REPO_ROOT / "templates" / "shared", REPO_ROOT / "templates" / "react")
    for doc in cited:
        assert any((root / doc).exists() for root in roots), (
            f"GUIDE.md's Docs table cites `{doc}`, which no template root ships"
        )


def test_dev_overlay_surface_is_a_required_capability():
    """The Dev overlay spans a vite plugin and a client module; doctor checks both.

    Without the plugin the button still renders and the map comes back empty,
    which reads as "nothing was reused" rather than "nothing was measured" --
    the exact silent-wrong-answer those invariants exist to catch.
    """
    from react_dev.project import REQUIRED_PATHS

    paths = {p for p, _ in REQUIRED_PATHS}
    assert "tools/component-map-plugin.mjs" in paths
    assert "src/dev/component-overlay.tsx" in paths

    template = REPO_ROOT / "templates" / "react"
    config = (template / "vite.config.ts").read_text()
    assert "component-map-plugin" in config
    assert "componentMapPlugin()" in config


def test_doctor_warns_when_the_component_map_plugin_is_unwired(tmp_path):
    import shutil

    from react_dev.project import diagnose

    template = REPO_ROOT / "templates" / "react"
    project = tmp_path / "app"
    shutil.copytree(template, project, ignore=shutil.ignore_patterns(
        "node_modules", "dist", "test-results", "playwright-report"))

    wired = [d for d in diagnose(project) if d.check == "component map"]
    assert wired and wired[0].level == "ok", "a pristine template should report it wired"

    config = project / "vite.config.ts"
    config.write_text(config.read_text().replace("componentMapPlugin()", "/* removed */"))
    unwired = [d for d in diagnose(project) if d.check == "component map"]
    assert unwired and unwired[0].level == "warn", "removing the call must be detected"


def test_registry_url_owner_matches_the_registry_homepage():
    """A rename must move the install URL and the homepages together.

    The install URL lives only in components.json; `registry.json` and its built
    copy carry a `homepage`. Renaming the repo once already touched all three, and
    nothing else compares them -- the `registry` job in ci.yml installs items from
    a LOCAL path, so a URL pointing at the old owner stays green in CI and 404s in
    every generated project.
    """
    import re

    components = json.loads((REPO_ROOT / "templates/react/components.json").read_text())
    url = components["registries"]["@react-dev"]
    assert url.endswith("/r/{name}.json"), url

    owner = re.match(r"https://([^.]+)\.github\.io/", url)
    assert owner, f"not a GitHub Pages URL: {url}"
    expected = owner.group(1)

    for path in ("registry/registry.json", "registry/public/r/registry.json"):
        homepage = json.loads((REPO_ROOT / path).read_text()).get("homepage", "")
        found = re.match(r"https://github\.com/([^/]+)/", homepage)
        assert found, f"{path} has no GitHub homepage: {homepage!r}"
        assert found.group(1) == expected, (
            f"{path} homepage owner {found.group(1)!r} != install URL owner "
            f"{expected!r} -- one of them was missed in a rename"
        )


def test_the_registry_is_actually_published():
    """A built registry nobody serves cannot be installed from another project.

    Found by curling the URL in components.json and getting 404: the registry
    built fine and CI verified every item installed -- from a local file path --
    while nothing published it anywhere.
    """
    workflow = REPO_ROOT / ".github/workflows/registry-pages.yml"
    assert workflow.is_file(), "no workflow publishes the registry"
    text = workflow.read_text()
    assert "actions/deploy-pages" in text, "builds the registry but never deploys it"
    assert "upload-pages-artifact" in text
    assert "pages: write" in text, "deploy-pages fails without this permission"
    # It must publish the directory the built items land in.
    assert "registry/public" in text


def test_verify_runs_the_production_build():
    """`verify` must include `build`, or it greenlights a broken release.

    Top-level `await` in main.tsx passed format, lint, types, tests and every
    other step for months: dev transpiles it happily and esbuild's browser
    targets do not support it, so ONLY `vite build` fails. CI caught it after a
    push; the local gate said green. A gate that cannot fail on a broken
    production build is the inert-gate problem this project keeps guarding
    against.
    """
    pkg = json.loads((REPO_ROOT / "templates/react/package.json").read_text())
    assert "npm run build" in pkg["scripts"]["verify"], (
        "verify does not run build -- a production-only failure would pass the gate"
    )
    # Last: it is the only writing step, and everything before it reads the tree.
    assert pkg["scripts"]["verify"].rstrip().endswith("npm run build")


def test_main_entry_has_no_top_level_await():
    """The specific regression, named, because the error message is obscure."""
    main = (REPO_ROOT / "templates/react/src/main.tsx").read_text()
    stripped = "\n".join(
        line for line in main.splitlines() if not line.lstrip().startswith(("//", "*", "/*"))
    )
    assert not re.search(r"^await\s", stripped, re.M), (
        "top-level await in main.tsx breaks `vite build` for the configured "
        "browser targets; use a promise chain instead"
    )


def test_registry_generator_publishes_an_item_with_the_right_target(tmp_path):
    """`registry/tools/add-item.mjs` owns registry.json so nobody hand-edits it.

    A missing or wrong `target` installs the component into the wrong atomic
    layer of every consumer's project, and the failure surfaces in their repo,
    not this one.
    """
    import shutil
    import subprocess

    registry = tmp_path / "registry"
    shutil.copytree(REPO_ROOT / "registry", registry,
                    ignore=shutil.ignore_patterns("public", "node_modules"))
    # The script reads the template's package.json two levels up.
    (tmp_path / "templates").mkdir()
    shutil.copytree(REPO_ROOT / "templates" / "react", tmp_path / "templates" / "react",
                    ignore=shutil.ignore_patterns("node_modules", "dist", "test-results",
                                                  "playwright-report"))

    component = tmp_path / "src.tsx"
    component.write_text(
        "import { Line } from 'recharts';\n"
        "import { cn } from '@/lib/cn';\n"
        "export function Sparkline() {\n  return <div className={cn('h-8')} />;\n}\n"
    )

    result = subprocess.run(
        ["node", "tools/add-item.mjs", "molecule", "Sparkline", "--from", str(component)],
        cwd=registry, capture_output=True, text=True, timeout=120,
    )
    assert result.returncode == 0, result.stdout + result.stderr

    entry = next(
        item for item in json.loads((registry / "registry.json").read_text())["items"]
        if item["name"] == "sparkline"
    )
    assert entry["meta"]["atomicLayer"] == "molecule"
    assert entry["files"][0]["target"] == "@components/molecules/sparkline.tsx"
    # Declares what the consumer lacks; ignores the `@/` alias and what ships already.
    assert entry["dependencies"] == ["recharts"]
    assert (registry / "items" / "sparkline.tsx").is_file()

    # Publishing the same name twice must fail rather than duplicate the entry.
    again = subprocess.run(
        ["node", "tools/add-item.mjs", "molecule", "Sparkline", "--from", str(component)],
        cwd=registry, capture_output=True, text=True, timeout=120,
    )
    assert again.returncode == 1
    assert "already in the registry" in again.stderr


def test_react_publish_skill_refuses_single_project_components():
    """The skill's whole job is to be the hard step; a soft one is just a copy."""
    body = (REPO_ROOT / "skills" / "react-publish" / "SKILL.md").read_text()
    assert "NEVER publish a component used by only one project." in body
    assert "@/modules" in body, "must check the component imports no module code"
    assert "npm run gen --" in body, "must call the generator, not hand-edit registry.json"


def test_storybook_config_is_typechecked():
    """`.storybook/*.ts` must be in a tsconfig, or a bad import only fails in CI.

    `preview.ts` imported `initialize` from msw-storybook-addon after v3 removed
    it. Every local gate passed -- nothing typechecked that directory -- and
    `build-storybook` failed on a push. Two reasons it was invisible: the
    `.storybook/tsconfig.json` was referenced by nothing, and its `include` was
    `["."]`, which matches nothing because TypeScript skips dot-directories when
    expanding globs. Hence an explicit `files` list.
    """
    template = REPO_ROOT / "templates" / "react"
    config = json.loads(
        re.sub(r"^\s*//.*$", "", (template / ".storybook/tsconfig.json").read_text(), flags=re.M)
    )
    files = config.get("files", [])
    assert "preview.ts" in files and "main.ts" in files, (
        f"`files` must list the config files explicitly; got {files!r}"
    )
    assert "include" not in config, (
        "an `include` glob silently matches nothing inside a dot-directory"
    )

    pkg = json.loads((template / "package.json").read_text())
    assert ".storybook/tsconfig.json" in pkg["scripts"]["typecheck"], (
        "typecheck does not cover .storybook, so its imports are unchecked"
    )
    assert "npm run typecheck" in pkg["scripts"]["verify"]


def test_storybook_shows_where_each_component_lives_on_disk():
    """A story that cannot tell you its file leaves you grepping for it.

    Storybook only knows `./src/.../x.stories.tsx` relative to the root, which is
    not pasteable into an editor, so main.ts injects the absolute project root
    and the decorator derives the component path from the story path.
    """
    template = REPO_ROOT / "templates" / "react"

    main = (template / ".storybook/main.ts").read_text()
    assert "__PROJECT_ROOT__" in main and "process.cwd()" in main, (
        "main.ts must inject the absolute root; the browser cannot know it"
    )

    preview = (template / ".storybook/preview.ts").read_text()
    assert "fileName" in preview, "the path comes from parameters.fileName"
    # `badge.stories.tsx` -> `badge.tsx`: the component, not the story.
    assert ".stories." in preview and "sourcePaths" in preview
    assert "sb-source-bar" in preview
    # Outside the story tree, so it cannot affect layout or a play function.
    assert "document.body.appendChild" in preview


def test_route_graph_is_static_analysis_not_a_model():
    """The map must be derived from the AST, or it cannot be trusted.

    Checked rather than assumed because the whole value of the feature is that a
    link appears on the map because it exists in the code. Two correctness traps
    are pinned here: `push`/`replace` are string methods long before they are
    navigation (`path.replace(/^\\//, '')` in the api client was read as a
    redirect), and a parameterised sidebar path is not a reachable root.
    """
    source = (REPO_ROOT / "templates/react/tools/route-graph.mjs").read_text()
    assert "ts-morph" in source, "must use a real AST, not regex"
    assert "NAV_RECEIVERS" in source, "bare push/replace must not count as navigation"
    assert "'navigate', 'redirect'" in source
    assert "n.path.includes(':')" in source, "a param path cannot be a sidebar root"
    # Dynamic targets are reported, never silently dropped.
    assert "dynamic: true" in source and "unresolved" in source
    # Each navigation names the component responsible, or the map tells you a
    # link exists without telling you where to go and change it.
    assert "componentFor" in source and "component: componentFor(node)" in source

    ui = (REPO_ROOT / "templates/react/src/dev/route-map.tsx").read_text()
    for field in ("'From'", "'To'", "'Trigger'", "'How'", "'Component'", "'Source'"):
        assert field in ui, f"the details panel must show {field}"
    assert "onEdgeClick" in ui, "an edge must be inspectable"
    # Runtime-decided targets appear as a node rather than only a footnote.
    assert "decided at runtime" in ui

    from react_dev.project import REQUIRED_PATHS

    paths = {p for p, _ in REQUIRED_PATHS}
    assert "tools/route-graph.mjs" in paths
    assert "src/dev/route-map.tsx" in paths

    pkg = json.loads((REPO_ROOT / "templates/react/package.json").read_text())
    dev = pkg["devDependencies"]
    assert "ts-morph" in dev and "@xyflow/react" in dev, (
        "both are dev-only; the map must never ship to production"
    )
    assert "@xyflow/react" not in pkg.get("dependencies", {})


def test_every_project_ships_three_themes_and_two_locales():
    """Generated whether or not the design asks for them.

    A second theme is the cheapest proof that nothing hardcodes a colour or a
    radius; a second locale is the same proof for text. Finding out from a
    rebrand instead of from the switcher is the failure these prevent.
    """
    template = REPO_ROOT / "templates" / "react"

    themes = (template / "src/styles/themes.css").read_text()
    for name in ("ocean", "sunset"):
        assert f":root[data-theme='{name}']" in themes, f"{name} missing"
        assert f":root[data-theme='{name}'].dark" in themes, f"{name} has no dark variant"
    # `:root[...]` not `[...]`: equal specificity with :root, and @import must
    # come first, so the plain form silently changed nothing in light mode.
    assert "\n[data-theme=" not in themes

    theme_ts = (template / "src/lib/theme.ts").read_text()
    assert "'default', 'ocean', 'sunset'" in theme_ts

    i18n = (template / "src/config/i18n.ts").read_text()
    assert "en:" in i18n and "pl:" in i18n
    # The locale must reach <html lang>, or a Polish page claims to be English.
    assert "document.documentElement.lang" in i18n

    for locale in ("en", "pl"):
        assert (template / "src/locales" / locale).is_dir()


def test_a_theme_changes_shape_not_only_colour():
    """Same radius, border and weight means the same app in a different hue."""
    template = REPO_ROOT / "templates" / "react"
    base = (template / "src/styles/index.css").read_text()
    themes = (template / "src/styles/themes.css").read_text()

    for token in ("--ui-border-width", "--ui-font-weight", "--ui-shadow"):
        assert token in base, f"{token} is not declared on :root"
        assert token in themes, f"no theme overrides {token}"

    # And a component must actually consume them, or the tokens change nothing.
    button = (template / "src/components/atoms/button.tsx").read_text()
    assert "--ui-font-weight" in button and "--ui-shadow" in button
    assert "--ui-border-width" in button


def test_dev_toolbar_can_switch_theme_and_language():
    switchers = (REPO_ROOT / "templates/react/src/dev/switchers.tsx").read_text()
    assert "setName" in switchers and "changeLanguage" in switchers
    # The locale list comes from the project, not i18next's runtime options,
    # where `supportedLngs` is `false` unless set and carries `cimode`.
    assert "from '@/config/i18n'" in switchers and "locales" in switchers

    toolbar = (REPO_ROOT / "templates/react/src/dev/feedback-toolbar.tsx").read_text()
    assert "mountSwitchers" in toolbar


def test_each_theme_overrides_the_same_colour_tokens_in_light_and_dark():
    """A token set in a theme's light block MUST also be set in its dark block.

    `:root[data-theme=x]` (0,2,0) outranks `.dark` (0,1,0), so a colour the theme
    sets only in light leaks into dark mode. Verified in a browser: a probe theme
    overriding `--card` in light alone showed that light value with `.dark` on.

    The specificity is deliberate -- `@import` must come first, so without it the
    themes lose to `:root` on source order and change nothing. Lowering `.dark`
    to `:root.dark` instead would outrank the `cssVars` that shadcn registry
    items inject, so the rule is enforced here instead of restructured away.

    Shape tokens are exempt: a radius or a border width is a property of the
    theme, not of the colour scheme, and repeating it in both blocks is noise.
    """
    import re

    css = (REPO_ROOT / "templates/react/src/styles/themes.css").read_text()
    scheme_independent = {"--radius", "--ui-border-width", "--ui-font-weight", "--ui-shadow"}

    blocks: dict[tuple[str, str], set[str]] = {}
    for match in re.finditer(
        r":root\[data-theme='([^']+)'\](\.dark)?\s*\{(.*?)\}", css, re.S
    ):
        name, dark, body = match.group(1), bool(match.group(2)), match.group(3)
        tokens = set(re.findall(r"(--[\w-]+)\s*:", body))
        blocks[(name, "dark" if dark else "light")] = tokens

    names = {name for name, _ in blocks}
    assert names, "no themes found"

    for name in names:
        light = blocks.get((name, "light"), set()) - scheme_independent
        dark = blocks.get((name, "dark"), set()) - scheme_independent
        assert light == dark, (
            f"theme {name!r}: light and dark override different tokens.\n"
            f"  only in light: {sorted(light - dark)}\n"
            f"  only in dark:  {sorted(dark - light)}\n"
            "A token set only in light leaks that value into dark mode."
        )


# Context hygiene. `/clear` is a USER action -- a skill cannot clear its own
# context, so the most a skill can do is say when it is worth doing. Saying it
# at the wrong moment is worse than not saying it: clearing mid-feature throws
# away the spec decisions, the clarifications and what was already tried.

CLEAR_AT_BOUNDARIES = ["react-constitution", "react-roadmap", "react-merge"]

MUST_NOT_SUGGEST_CLEAR = [
    "react-feature", "react-spec", "react-clarify", "react-implement",
    "react-verify", "react-analyze", "react-review", "react-ship",
    "react-component", "react-feedback", "react-i18n", "react-theme",
    "react-update", "react-publish",
]


def test_only_real_boundaries_suggest_clearing_the_context():
    """The documented rule: would you brief a new teammate on the last task?

    After a merge, after the roadmap, after the constitution -- no. Mid-feature --
    yes, obviously, which is why those skills must stay quiet about it.
    """
    for name in CLEAR_AT_BOUNDARIES:
        body = (REPO_ROOT / "skills" / name / "SKILL.md").read_text()
        assert "`/clear`" in body, f"{name} is a boundary and should say so"

    for name in MUST_NOT_SUGGEST_CLEAR:
        body = (REPO_ROOT / "skills" / name / "SKILL.md").read_text()
        assert "/clear" not in body, (
            f"{name} suggests clearing, but it runs inside one feature's work -- "
            "clearing there discards the spec and the decisions it depends on"
        )


def test_clearing_is_advised_before_the_next_command_not_after():
    """Order matters: clear, THEN start the next unit of work."""
    merge = (REPO_ROOT / "skills" / "react-merge" / "SKILL.md").read_text()
    tail = merge.split("## Next", 1)[1]
    assert tail.index("/clear") < tail.index("react-feature"), (
        "react-merge must put /clear before the next command, or the fresh "
        "context is created after the work that needed it"
    )


def test_next_starts_a_fresh_session_because_hooks_cannot_clear(tmp_path, monkeypatch):
    """Context cannot be cleared from inside a session.

    Confirmed against the hooks reference: every hook output field is decision
    control or context injection, `PreCompact` can block compaction but not start
    it, and nothing can trigger `/clear`. A new PROCESS can, which is what this
    command is for -- the clean slate is structural rather than something the
    user has to remember at the right moment.
    """
    (tmp_path / "specs" / "roadmap").mkdir(parents=True)
    (tmp_path / "specs" / "ROADMAP.md").write_text("| 1 | landing | public | — |\n")
    (tmp_path / "specs" / "roadmap" / "001-landing.md").write_text("# Landing\n")

    result = runner.invoke(app, ["next", str(tmp_path), "--dry-run"])
    assert result.exit_code == 0, result.output
    assert "react-feature 1" in result.output
    assert "landing" in result.output


def test_next_warns_that_only_files_carry_into_a_fresh_session(tmp_path):
    """Mid-feature it still works -- every stage reads specs/ -- but an
    unrecorded decision is lost, and the command has to say so."""
    (tmp_path / "specs" / "roadmap").mkdir(parents=True)
    (tmp_path / "specs" / "ROADMAP.md").write_text("| 1 | landing | public | — |\n")
    (tmp_path / "specs" / "roadmap" / "001-landing.md").write_text("# Landing\n")
    work = tmp_path / "specs" / "001-landing"
    work.mkdir()
    (work / "spec.md").write_text("# Spec\n\nAll decided.\n")
    (work / "tasks.md").write_text("- [ ] build it\n")

    result = runner.invoke(app, ["next", str(tmp_path), "--dry-run"])
    assert result.exit_code == 0, result.output
    assert "Mid-feature" in result.output
    assert "specs/" in result.output

    # A real boundary is `planned` or `merged` -- NOT "tasks are ticked", which
    # still leaves analyze, review, ship and merge to go. There it says the
    # opposite rather than nagging.
    import shutil as _shutil

    _shutil.rmtree(work)
    boundary = runner.invoke(app, ["next", str(tmp_path), "--dry-run"])
    assert "Mid-feature" not in boundary.output
    assert "boundary" in boundary.output


# Subagents are the one way the AGENT itself gets a fresh context automatically.
# It cannot clear its own thread -- no hook can, confirmed against the hooks
# reference -- but it delegates to these on its own, and each starts isolated.

ISOLATED_STAGES = ["react-verify", "react-analyze", "react-review"]


def test_the_stages_that_flood_context_run_as_subagents():
    """Three stages read or produce a lot and hand back a short answer.

    Verify floods the window with gate output, analyze reads the whole feature,
    and review is worth more when it has NOT sat through the decisions that
    produced the code. All three take their input from files, so a fresh context
    loses nothing.
    """
    import re

    agents = REPO_ROOT / "templates/shared/.claude/agents"
    for name in ISOLATED_STAGES:
        agent = agents / f"{name}.md"
        assert agent.is_file(), f"no subagent for {name}"
        front = agent.read_text().split("---")[1]
        fields = dict(re.findall(r"^(\w+): (.+)$", front, re.M))
        assert fields["name"] == name
        # `description` is what Claude matches on to delegate without being asked.
        assert len(fields.get("description", "")) > 40, f"{name}: description too thin"
        assert fields.get("skills") == name, f"{name} must preload its own skill"

    # Read-only stages must not be handed write tools: a finding repaired inside
    # the analysis hides in the diff and nobody learns the project drifted.
    for name in ("react-analyze", "react-review"):
        front = (agents / f"{name}.md").read_text().split("---")[1]
        tools = dict(re.findall(r"^(\w+): (.+)$", front, re.M))["tools"]
        assert "Write" not in tools and "Edit" not in tools, f"{name} can write"


def test_interactive_stages_are_not_delegated_to_subagents():
    """A subagent is a bad fit for anything needing back-and-forth.

    `react-clarify` asks one question at a time and waits; `react-spec` and
    `react-implement` are the work itself. Isolating those would cut the user out
    of the loop the pipeline exists to keep them in.
    """
    agents = REPO_ROOT / "templates/shared/.claude/agents"
    for name in ("react-clarify", "react-spec", "react-implement", "react-feature",
                 "react-ship", "react-merge"):
        assert not (agents / f"{name}.md").exists(), (
            f"{name} must not be a subagent -- it needs the user in the loop"
        )


def test_dev_server_port_is_per_checkout_so_worktrees_cannot_cross_contaminate():
    """A fixed port plus `reuseExistingServer` tests the wrong source tree.

    Two checkouts share ports even when git worktrees separate their files. With
    5173 hardcoded, the second one finds the first one's dev server already
    listening and runs its entire suite against that code -- passing, and proving
    nothing about the branch under test. Verified by running two checkouts at
    once: each started its own server and tested its own code.
    """
    import subprocess

    template = REPO_ROOT / "templates" / "react"
    helper = template / "tools" / "dev-port.mjs"
    assert helper.is_file()

    def port_in(directory):
        out = subprocess.run(
            ["node", "-e", "import('%s').then(m=>console.log(m.devPort()))" % helper.as_posix()],
            cwd=directory, capture_output=True, text=True, timeout=60,
        )
        return int(out.stdout.strip())

    # Same directory, same port -- baselines and bookmarks must stay valid.
    assert port_in(template) == port_in(template)
    # Different directory, different port.
    assert port_in(template) != port_in(REPO_ROOT)

    playwright = (template / "playwright.config.ts").read_text()
    assert "localhost:5173" not in playwright, "a hardcoded port is the whole bug"
    assert "devUrl()" in playwright
    # Opt-IN: reusing the wrong server costs a green run on code never executed.
    assert "PW_REUSE_SERVER === '1'" in playwright

    vite = (template / "vite.config.ts").read_text()
    assert "strictPort: true" in vite, (
        "without strictPort Vite silently moves to the next free port while "
        "Playwright keeps testing whatever still holds the old one"
    )


def test_implement_runs_the_checks_itself_but_never_ships():
    """Verify, analyze and review follow implementation without being asked.

    All three read files that were just written and hand back a verdict, so
    making the user type three commands to learn whether the work holds up is a
    chore the pipeline created. Ship and merge are excluded on purpose: nobody
    should discover their branch was pushed because a chain ran on.
    """
    body = (REPO_ROOT / "skills" / "react-implement" / "SKILL.md").read_text()
    for stage in ("react-verify", "react-analyze", "react-review"):
        assert stage in body, f"{stage} must be part of the chain"
    assert "subagent" in body, "the chain should delegate, or it floods this context"
    # A red gate stops the chain rather than being reported alongside later work.
    assert "red" in body.lower()
    tail = body.split("## Next", 1)[1]
    assert "react-ship" in tail, "the chain must hand off to ship, not run it"
    assert "NOT part of this" in body or "not part of this" in body.lower()


def test_parallel_batch_locks_on_the_module(tmp_path):
    """Claim plane: the module is the lock, because it is what two pages share.

    Worktrees isolate files, not meaning. Two pages of one module edit its
    components/, lib/ and types/, and git merges that cleanly into a build that
    does not work -- the documented failure mode of parallel agents.
    """
    from react_dev.project import parallel_batch

    specs = tmp_path / "specs"
    (specs / "roadmap").mkdir(parents=True)
    (specs / "ROADMAP.md").write_text(
        "| #   | Module | Page | What | Needs | Size | Detail |\n"
        "| --- | ------ | ---- | ---- | ----- | ---- | ------ |\n"
        "| 1 | `public` | `landing` | sign up | — | S | x |\n"
        "| 2 | `dogs` | `profile` | see | — | M | x |\n"
        "| 3 | `dogs` | `weight` | track | — | M | x |\n"
        "| 4 | `shop` | `cart` | buy | 2 | M | x |\n"
        "| 5 | `billing` | `invoices` | bills | — | M | x |\n"
    )
    for number, slug in [("001", "landing"), ("002", "profile"), ("003", "weight")]:
        (specs / "roadmap" / f"{number}-{slug}.md").write_text("# x\n")
    (specs / "roadmap" / "004-cart.md").write_text("# Cart\n\nSize **M** · Needs **2**\n")
    (specs / "roadmap" / "005-invoices.md").write_text(
        "# Invoices\n\n[NEEDS CLARIFICATION: which currency?]\n"
    )

    plan = parallel_batch(tmp_path)
    assert [f.slug for f in plan.batch] == ["landing", "profile"]

    reasons = {f.slug: why for f, why in plan.excluded}
    assert "module" in reasons["weight"], "same module must be held back"
    assert "feature 2" in reasons["cart"], "a declared dependency must be honoured"
    assert "question" in reasons["invoices"], "an unanswered marker must disqualify"


def test_parallel_never_starts_work_built_on_an_unanswered_question(tmp_path):
    """A parallel agent has no terminal: a guess is invisible until it merges."""
    from react_dev.project import parallel_batch

    specs = tmp_path / "specs"
    (specs / "roadmap").mkdir(parents=True)
    (specs / "ROADMAP.md").write_text(
        "| #   | Module | Page | What | Needs | Size | Detail |\n"
        "| --- | ------ | ---- | ---- | ----- | ---- | ------ |\n"
        "| 1 | `public` | `landing` | x | — | S | x |\n"
    )
    (specs / "roadmap" / "001-landing.md").write_text("[NEEDS CLARIFICATION: what?]\n")
    assert parallel_batch(tmp_path).batch == []

    (specs / "roadmap" / "001-landing.md").write_text("# Landing\n")
    assert [f.slug for f in parallel_batch(tmp_path).batch] == ["landing"]


def test_the_worker_is_worktree_isolated_and_cannot_land_anything():
    agent = (REPO_ROOT / "templates/shared/.claude/agents/react-feature-worker.md").read_text()
    assert "isolation: worktree" in agent, "parallel agents must not share a checkout"
    # Landing is sequential: each branch passed its gate against a base that is
    # not the base it would land on.
    assert "Never run `react-ship` or `react-merge`" in agent

    skill = (REPO_ROOT / "skills" / "react-parallel" / "SKILL.md").read_text()
    assert "single-lane" in skill.lower()
    # Re-running the gate after rebase is the only defence against a semantic
    # conflict -- no merge strategy catches those.
    assert "semantic conflict" in skill.lower()
    assert "npm run verify" in skill


def test_parallel_refuses_a_roadmap_with_no_module_column(tmp_path):
    """A lock that fails OPEN is worse than no lock.

    The column is found by header name, not position. Reading "the first cell
    after the number" returns the slug on a roadmap written before the column
    existed -- and since slugs are unique, every feature then looks like its own
    module and the batch comes back MORE permissive than it should be.
    """
    from react_dev.project import parallel_batch

    specs = tmp_path / "specs"
    (specs / "roadmap").mkdir(parents=True)
    (specs / "ROADMAP.md").write_text(
        "| #   | Slug      | What | Needs | Size | Detail |\n"
        "| --- | --------- | ---- | ----- | ---- | ------ |\n"
        "| 1   | `landing` | x    | —     | S    | x      |\n"
        "| 2   | `profile` | x    | —     | M    | x      |\n"
    )
    for name in ("001-landing", "002-profile"):
        (specs / "roadmap" / f"{name}.md").write_text("# x\n")

    plan = parallel_batch(tmp_path)
    assert plan.batch == [], "without a module column nothing may run in parallel"
    assert all("Module column" in why for _, why in plan.excluded)

    # With the column, the lock works again and two pages of one module split up.
    (specs / "ROADMAP.md").write_text(
        "| #   | Module   | Page      | What | Needs | Size | Detail |\n"
        "| --- | -------- | --------- | ---- | ----- | ---- | ------ |\n"
        "| 1   | `public` | `landing` | x    | —     | S    | x      |\n"
        "| 2   | `dogs`   | `profile` | x    | —     | M    | x      |\n"
    )
    assert [f.slug for f in parallel_batch(tmp_path).batch] == ["landing", "profile"]


def test_every_subagent_pins_model_and_effort():
    """Subagents inherit nothing about model choice, so it is set explicitly.

    `sonnet` is the alias, not a pinned id: it tracks the newest Sonnet, which is
    what "newest" has to keep meaning after the next release.
    """
    import re

    agents = sorted((REPO_ROOT / "templates/shared/.claude/agents").glob("*.md"))
    assert agents, "no subagents found"
    for agent in agents:
        front = agent.read_text().split("---")[1]
        fields = dict(re.findall(r"^(\w+): (.+)$", front, re.M))
        assert fields.get("model") == "sonnet", f"{agent.stem}: model is {fields.get('model')!r}"
        assert fields.get("effort") == "xhigh", f"{agent.stem}: effort is {fields.get('effort')!r}"


def test_a_red_gate_gets_a_bounded_retry_budget():
    """Three attempts, then stop -- not a loop until green.

    An agent that MUST reach green takes the cheapest route, and the cheapest
    route is always weakening the check: delete the test, disable the rule, lower
    the threshold. The budget is what stops a failure turning into a workaround.
    """
    body = (REPO_ROOT / "skills" / "react-implement" / "SKILL.md").read_text()
    assert "three attempts" in body.lower()
    assert "stop and report" in body.lower()
    # Re-running only the failed part hides a fix that broke something else.
    assert "WHOLE gate" in body or "whole gate" in body.lower()

    retries = REPO_ROOT / "skills" / "react-implement" / "references" / "retries.md"
    assert retries.is_file(), "the retry rules are not documented"
    rules = retries.read_text()
    for forbidden in ("eslint-disable", "coverage", "eslint.config.js", "baseline",
                      "duplicate-ok"):
        assert forbidden in rules, f"{forbidden} must be named as never allowed"
    # Architecture failures have real fixes; editing the config is not one.
    assert "gen -- promote" in rules
    assert "boundaries" in rules and "components:check" in rules


def test_the_gate_itself_still_forbids_weakening():
    """The budget only holds if the gate skill agrees with it."""
    verify = (REPO_ROOT / "skills" / "react-verify" / "SKILL.md").read_text()
    assert "no `eslint-disable`" in verify
    assert "no lowered coverage threshold" in verify
