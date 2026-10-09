"""The headless worker runner.

Every test here is about a way an unattended run lies to you: a worker that
exited 0 after refusing to answer a question, a log that silently dropped the
one event that mattered, a worktree that was never isolated from git, or an
agent-specific flag that leaked into the part of the pipeline that is supposed
to be the same for all three.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from react_dev.agents import AGENTS  # noqa: E402
from react_dev.runner import (  # noqa: E402
    BLOCKED,
    FAILED,
    OK,
    TIMEOUT,
    Event,
    Worker,
    _classify,
    branch_for,
    ensure_ignored,
    headless_command,
    parse_line,
    past_runs,
    worker_prompt,
)


# --------------------------------------------------------------------------- #
# the command
# --------------------------------------------------------------------------- #

def test_every_supported_agent_can_be_run_unattended():
    """The pipeline's whole claim is that the agent is a choice, not a rewrite."""
    for key in ("claude", "codex", "gemini"):
        agent = AGENTS[key]
        assert agent.headless is not None, f"{key} has no headless spec"
        argv = headless_command(agent, "BUILD IT")
        assert argv[0] == agent.cli_bin
        assert "BUILD IT" in argv, "the prompt never reached the command line"
        assert agent.headless.stream in {"claude", "codex", "gemini"}


@pytest.mark.parametrize(
    ("key", "must_contain"),
    [
        # Nobody is there to answer a prompt, so each agent's approval is
        # pre-granted in its own vocabulary. A worker that stops to ask sits
        # at 0% forever in a log nobody is watching.
        ("claude", ["--permission-mode", "bypassPermissions"]),
        ("codex", ["--sandbox", "workspace-write"]),
        ("gemini", ["--approval-mode", "yolo"]),
    ],
)
def test_a_worker_never_waits_for_permission(key, must_contain):
    argv = headless_command(AGENTS[key], "x")
    for flag in must_contain:
        assert flag in argv, f"{key} would stop and ask: {flag} missing"


@pytest.mark.parametrize(
    ("key", "flag"),
    [("claude", "stream-json"), ("codex", "--json"), ("gemini", "stream-json")],
)
def test_every_worker_emits_a_machine_readable_stream(key, flag):
    """Without this there is no history, only whatever scrolled past."""
    assert flag in " ".join(headless_command(AGENTS[key], "x"))


def test_an_override_beats_the_default_model():
    argv = headless_command(AGENTS["claude"], "x", model="opus", effort="low")
    assert argv[argv.index("--model") + 1] == "opus"
    assert argv[argv.index("--effort") + 1] == "low"


def test_a_flag_the_agent_does_not_have_is_not_invented():
    """Codex has no effort flag. Passing one must not produce a broken argv."""
    argv = headless_command(AGENTS["codex"], "x", effort="xhigh")
    assert "--effort" not in argv
    assert "xhigh" not in argv


def test_the_brief_uses_each_agent_s_own_invocation_syntax():
    """One pipeline, three vocabularies. This is the whole portability claim."""
    assert "`/react-feature`" in worker_prompt(AGENTS["claude"], "1", "landing")
    assert "`$react-feature`" in worker_prompt(AGENTS["codex"], "1", "landing")
    assert "`/react:feature`" in worker_prompt(AGENTS["gemini"], "1", "landing")


def test_branch_names_are_stable_and_sortable():
    assert branch_for("2", "dogs-profile") == "feature/002-dogs-profile"
    assert branch_for("17", "Shop Category") == "feature/017-shop-category"
    assert branch_for("P1", "contracts") == "feature/contracts"


# --------------------------------------------------------------------------- #
# the log
# --------------------------------------------------------------------------- #

def test_a_tool_call_is_logged_with_what_it_was_given():
    line = json.dumps({
        "type": "assistant",
        "message": {"content": [{"type": "tool_use", "name": "Bash",
                                 "input": {"command": "npm ci"}}]},
    })
    (event,) = parse_line("claude", line)
    assert event.kind == "tool"
    assert event.title == "Bash"
    assert "npm ci" in event.body


def test_an_unknown_event_is_kept_verbatim_rather_than_dropped():
    """The promise of the log is that it is complete.

    A parser that silently drops what it has not seen before breaks that
    promise on exactly the day a CLI adds an event -- and you find out by
    reading a transcript with a hole in it.
    """
    (event,) = parse_line("claude", '{"type":"something_new_in_2027","detail":"x"}')
    assert event.kind == "raw"
    assert "something_new_in_2027" in event.title


@pytest.mark.parametrize("line", [
    '{"type":"system","subtype":"thinking_tokens","estimated_tokens":50}',
    '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed"}}',
    '{"type":"assistant","message":{"content":[{"type":"thinking","thinking":""}]}}',
])
def test_a_known_event_with_nothing_to_show_produces_nothing(line):
    """Forty "unrecognised" lines bury the three that matter."""
    assert parse_line("claude", line) == []


def test_a_rate_limit_that_actually_bites_is_surfaced():
    """A rate-limited worker looks exactly like a slow one. It is not."""
    (event,) = parse_line("claude", json.dumps(
        {"type": "rate_limit_event", "rate_limit_info": {"status": "rejected"}}
    ))
    assert event.kind == "note" and "rate limit" in event.title


def test_a_line_that_is_not_json_still_reaches_the_transcript():
    (event,) = parse_line("claude", "Error: ENOSPC no space left on device")
    assert event.kind == "raw" and "ENOSPC" in event.title


def test_cost_is_read_off_the_result_when_the_agent_reports_one():
    (event,) = parse_line("claude", json.dumps(
        {"type": "result", "is_error": False, "result": "done", "total_cost_usd": 1.25}
    ))
    assert event.cost_usd == 1.25


def test_each_agent_s_own_stream_shape_is_understood():
    """Written from each CLI's documented event names, not from a guess."""
    (codex,) = parse_line("codex", json.dumps(
        {"type": "item.completed", "item": {"type": "assistant_message", "text": "built it"}}
    ))
    assert codex.kind == "text" and "built it" in codex.title

    (gemini,) = parse_line("gemini", json.dumps(
        {"type": "tool_use", "name": "write_file", "input": {"path": "a.tsx"}}
    ))
    assert gemini.kind == "tool" and gemini.title == "write_file"


# --------------------------------------------------------------------------- #
# the verdict
# --------------------------------------------------------------------------- #

def test_a_worker_that_refused_to_guess_is_not_reported_as_green():
    """The one that matters.

    An agent that stops on a question it may not answer exits 0, exactly like
    one that finished. Believing the exit code is how a guess reaches main --
    or worse, how an unbuilt feature gets marked done.
    """
    worker = Worker(number="1", slug="x", prompt="", exit_code=0)
    _classify(worker, Event("result", "success",
                            "[NEEDS CLARIFICATION] which date format?"))
    assert worker.status == BLOCKED
    assert "may not answer" in worker.reason


def test_a_worker_that_exited_without_a_verdict_is_a_failure():
    """Killed, crashed, or out of tokens. Silence is never success."""
    worker = Worker(number="1", slug="x", prompt="", exit_code=0)
    _classify(worker, None)
    assert worker.status == FAILED
    assert "without reporting a result" in worker.reason


def test_a_clean_finish_is_reported_green_with_its_summary():
    worker = Worker(number="1", slug="x", prompt="", exit_code=0)
    _classify(worker, Event("result", "success", "green, ready to land"))
    assert worker.status == OK
    assert worker.summary == "green, ready to land"


def test_a_nonzero_exit_keeps_the_exit_code_in_the_reason():
    worker = Worker(number="1", slug="x", prompt="", exit_code=2)
    _classify(worker, Event("result", "success", "whatever"))
    assert worker.status == FAILED and "exit code 2" in worker.reason


def test_a_timed_out_worker_keeps_its_verdict():
    """A hang must not be relabelled by whatever the stream last said."""
    worker = Worker(number="1", slug="x", prompt="", status=TIMEOUT,
                    reason="no result within 60s")
    _classify(worker, Event("result", "success", "looks fine"))
    assert worker.status == TIMEOUT


# --------------------------------------------------------------------------- #
# the repository
# --------------------------------------------------------------------------- #

def test_worktrees_and_logs_are_kept_out_of_git(tmp_path):
    """An un-ignored worktree puts a second copy of the project in `git status`,
    and the first worker that runs `git add` commits the other workers' files
    into its own branch."""
    (tmp_path / ".gitignore").write_text("node_modules\n", encoding="utf-8")

    assert ensure_ignored(tmp_path) is True
    rules = (tmp_path / ".gitignore").read_text().split()
    # Anchored: the unanchored form would also match a `.worktrees` under src/.
    assert "/.worktrees/" in rules
    assert "/.ai/runs/" in rules
    assert "node_modules" in rules, "the existing rules must survive"

    assert ensure_ignored(tmp_path) is False, "it must not append twice"


def test_a_run_killed_before_it_finished_is_listed_as_such(tmp_path):
    """A missing manifest means the orchestrator died, not that nothing ran."""
    (tmp_path / ".ai" / "runs" / "2026-01-01T00-00-00").mkdir(parents=True)
    (runs := past_runs(tmp_path))
    assert runs and runs[0]["partial"] is True


def test_a_finished_run_reports_every_worker(tmp_path):
    run = tmp_path / ".ai" / "runs" / "2026-01-02T00-00-00"
    run.mkdir(parents=True)
    (run / "run.json").write_text(json.dumps({
        "agent": "claude", "agentName": "Claude Code",
        "workers": [{"slug": "landing", "status": "ok"},
                    {"slug": "profile", "status": "blocked"}],
    }), encoding="utf-8")

    (entry,) = past_runs(tmp_path)
    assert entry["id"] == "2026-01-02T00-00-00"
    assert [w["status"] for w in entry["workers"]] == ["ok", "blocked"]


# --------------------------------------------------------------------------- #
# end to end, without an agent
# --------------------------------------------------------------------------- #

def test_a_missing_cli_fails_the_worker_instead_of_the_batch(tmp_path, monkeypatch):
    """One agent not installed must not take the other workers down with it."""
    from react_dev import runner

    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    for key, value in (("user.email", "t@t"), ("user.name", "t")):
        subprocess.run(["git", "-C", str(tmp_path), "config", key, value], check=True)
    (tmp_path / "README.md").write_text("x", encoding="utf-8")
    subprocess.run(["git", "-C", str(tmp_path), "add", "-A"], check=True)
    subprocess.run(["git", "-C", str(tmp_path), "commit", "-qm", "init"], check=True)

    ghost = AGENTS["claude"].__class__(
        **{**AGENTS["claude"].__dict__, "cli_bin": "definitely-not-installed-xyz"}
    )
    worker = Worker(number="1", slug="x", prompt="hi", branch="feature/001-x")
    run_dir = runner.new_run_dir(tmp_path)

    runner.run_worker(tmp_path, worker, ghost, run_dir, timeout=30)

    assert worker.status == FAILED
    assert "not installed" in worker.reason
    # Even a run that never started leaves a verdict on disk.
    assert json.loads((run_dir / "x" / "result.json").read_text())["status"] == FAILED


def test_only_the_two_adapter_files_know_a_vendor_s_cli():
    """The pipeline's portability claim, as a check rather than a promise.

    `agents.py` says how an agent is launched; `runner.py` says how its stream
    is read. The moment a third file hardcodes `claude` or `--approval-mode`,
    choosing another agent stops being a flag and starts being a rewrite --
    and nothing tells you until you try it.
    """
    source_root = Path(__file__).resolve().parents[1] / "src" / "react_dev"
    adapters = {"agents.py", "runner.py"}
    # Launching a binary, or a flag only one vendor has.
    forbidden = ['which("claude")', 'which("codex")', 'which("gemini")',
                 "--permission-mode", "--approval-mode", "--sandbox",
                 "stream-json", "codex exec"]

    for module in source_root.glob("*.py"):
        if module.name in adapters:
            continue
        # Prose may name the agents -- `--help` has to say what dispatch runs.
        # Code may not launch them. So docstrings and comments come out first.
        code = _executable_source(module)
        for needle in forbidden:
            assert needle not in code, f"{module.name} hardcodes {needle!r}"


def _executable_source(module: Path) -> str:
    import ast

    text = module.read_text(encoding="utf-8")
    tree = ast.parse(text)
    docstrings = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            doc = ast.get_docstring(node, clean=False)
            if doc:
                docstrings.add(doc)
    for doc in docstrings:
        text = text.replace(doc, "")
    return "\n".join(
        line for line in text.splitlines() if not line.lstrip().startswith("#")
    )


def test_gemini_trusts_the_fresh_worktree_it_runs_in():
    """A worker's worktree is a folder Gemini has never seen. Untrusted, it
    downgrades --approval-mode yolo to "default" and waits for approvals that
    never come -- found running it headless, not in its docs' happy path."""
    argv = headless_command(AGENTS["gemini"], "hi")
    assert "--skip-trust" in argv
    assert argv[argv.index("--approval-mode") + 1] == "yolo"
