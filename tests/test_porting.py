"""The parallel mobile port.

What can go wrong when several agents port one app at once, and what each test
pins: two workers given files that depend on each other, a worker whose edit to
a shared file is landed over another's, a slice so lopsided that one worker
does all the work, and a brief that names a skill the chosen agent cannot run.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from react_dev.agents import AGENTS  # noqa: E402
from react_dev.porting import (  # noqa: E402
    Slice,
    allowed,
    port_prompt,
    slice_frontier,
    stage,
)


def item(native: str, group: str, lines: int = 40) -> dict:
    return {"native": native, "web": native, "group": group, "lines": lines, "state": "todo"}


def test_a_wave_is_split_by_area_and_capped_per_worker():
    frontier = [item(f"src/components/atoms/a{i}.tsx", "components/atoms") for i in range(7)]
    frontier += [item("src/modules/orders/list/x.tsx", "modules/orders/list")]

    slices = slice_frontier(frontier, files_per_worker=3, limit=10)

    assert all(len(s.items) <= 3 for s in slices)
    # Every frontier file goes to exactly one worker.
    natives = [n for s in slices for n in s.natives]
    assert sorted(natives) == sorted(i["native"] for i in frontier)
    # An area stays with one worker where it fits.
    assert any(s.group == "components/atoms" and len(s.items) == 3 for s in slices)


def test_small_areas_are_topped_up_rather_than_one_tiny_worker_each():
    frontier = [item(f"src/modules/m{i}/p/x.tsx", f"modules/m{i}/p") for i in range(4)]
    slices = slice_frontier(frontier, files_per_worker=2, limit=10)
    assert len(slices) == 2
    assert all(len(s.items) == 2 for s in slices)


def test_never_more_workers_than_the_limit():
    frontier = [item(f"src/x/f{i}.tsx", f"x{i}") for i in range(20)]
    assert len(slice_frontier(frontier, files_per_worker=2, limit=3)) == 3


def test_a_worker_may_land_its_files_and_their_native_tests_only():
    owned = {"src/components/atoms/card.tsx"}
    assert allowed("src/components/atoms/card.tsx", owned)
    assert allowed("src/components/atoms/card.native.test.tsx", owned)
    # A barrel, a copied file, a neighbour's component: never from a worker.
    assert not allowed("src/components/atoms/index.ts", owned)
    assert not allowed("src/lib/api-client.ts", owned)
    assert not allowed("src/components/atoms/badge.native.test.tsx", owned)


def test_staging_takes_the_worker_s_files_and_reports_the_rest(tmp_path: Path):
    tree = tmp_path / "tree"
    tree.mkdir()
    git = lambda *a: subprocess.run(["git", *a], cwd=tree, check=True, capture_output=True)  # noqa: E731
    git("init", "-q")
    git("config", "user.email", "t@t")
    git("config", "user.name", "t")
    (tree / "src/lib").mkdir(parents=True)
    (tree / "src/lib/api-client.ts").write_text("export const a = 1;\n")
    git("add", "-A")
    git("commit", "-qm", "base")

    (tree / "src/components/atoms").mkdir(parents=True)
    (tree / "src/components/atoms/card.tsx").write_text("export const Card = 1;\n")
    (tree / "src/components/atoms/card.native.test.tsx").write_text("test\n")
    (tree / "src/lib/api-client.ts").write_text("export const a = 2;\n")  # out of bounds
    (tree / "PORT.md").write_text("regenerated\n")  # generated: silently dropped

    chunk = Slice("components/atoms", [item("src/components/atoms/card.tsx", "components/atoms")])
    staging = tmp_path / "staging"
    result = stage(tree, chunk, staging)

    assert sorted(result.landed) == [
        "src/components/atoms/card.native.test.tsx",
        "src/components/atoms/card.tsx",
    ]
    assert result.ignored == ["src/lib/api-client.ts"]
    assert (staging / "src/components/atoms/card.tsx").read_text() == "export const Card = 1;\n"
    assert not (staging / "src/lib/api-client.ts").exists()


def test_the_brief_names_the_skill_the_way_each_agent_runs_it(tmp_path: Path):
    chunk = Slice("x", [item("src/x.tsx", "x")])
    for key, expected in {"claude": "/react-native-port", "codex": "$react-native-port",
                          "gemini": "/react:native-port"}.items():
        brief = port_prompt(AGENTS[key], tmp_path, chunk)
        assert expected in brief, key
        assert "`src/x.tsx`" in brief
        # Workers cannot ask; the marker is what the runner reads as "blocked".
        assert "[NEEDS CLARIFICATION" in brief


def test_a_stale_file_is_briefed_as_an_update_not_a_rewrite(tmp_path: Path):
    stale = dict(item("src/x.tsx", "x"), state="stale")
    assert "stale" in port_prompt(AGENTS["claude"], tmp_path, Slice("x", [stale]))


def test_the_wave_takes_what_unlocks_the_most_first():
    frontier = [item(f"src/modules/inbox/c/x{i}.tsx", "modules/inbox/c") for i in range(5)]
    frontier.append(dict(item("src/lib/locale.ts", "lib"), unlocks=300))
    first = slice_frontier(frontier, files_per_worker=2, limit=1)[0]
    assert "src/lib/locale.ts" in first.natives


def test_failing_test_files_are_read_from_both_runners_output():
    from react_dev.porting import FAILING_FILE

    output = (
        " FAIL  src/modules/walks/api/use-walks.test.tsx > useWalks > pages\n"
        "FAIL src/components/atoms/button.native.test.tsx\n"
        " PASS src/lib/a.test.ts\n"
    )
    assert set(FAILING_FILE.findall(output)) == {
        "src/modules/walks/api/use-walks.test.tsx",
        "src/components/atoms/button.native.test.tsx",
    }


def test_the_wave_result_separates_breakage_from_newly_copied_red_tests():
    from react_dev.porting import WaveResult

    result = WaveResult(workers=[], landed=["a.tsx"], rejected={}, new_red_tests=["w.test.ts"])
    assert result.undone == ""
    assert result.new_red_tests == ["w.test.ts"]
