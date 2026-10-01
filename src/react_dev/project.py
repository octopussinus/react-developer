"""Project manifest and invariant checks.

``.react-dev.json`` records what a project was generated from, which is what
makes ``react-dev sync`` and ``react-dev doctor`` possible at all: without a
version stamp you can never tell which generation of the workflow a repo is on,
so fleet-wide fixes are impossible.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path

MANIFEST = ".react-dev.json"

#: Files the user is expected to edit. ``sync`` never overwrites these.
USER_OWNED = ("AGENTS.md",)


def write_manifest(project: Path, *, cli_version: str, project_type: str,
                   agents: list[str], skills: list[str]) -> None:
    (project / MANIFEST).write_text(
        json.dumps(
            {
                "cliVersion": cli_version,
                "projectType": project_type,
                "agents": agents,
                "skills": sorted(skills),
                "createdAt": date.today().isoformat(),
                "userOwned": list(USER_OWNED),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def read_manifest(project: Path) -> dict | None:
    path = project / MANIFEST
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


@dataclass
class Finding:
    level: str  # "error" | "warn" | "ok"
    check: str
    detail: str


def _pkg_scripts(project: Path) -> dict[str, str]:
    pkg = project / "package.json"
    if not pkg.is_file():
        return {}
    try:
        return json.loads(pkg.read_text(encoding="utf-8")).get("scripts", {})
    except json.JSONDecodeError:
        return {}


def diagnose(project: Path) -> list[Finding]:
    """Check a generated project against the invariants the workflow relies on.

    Each check maps to a finding in ENTERPRISE-READINESS-AUDIT.md -- these are
    precisely the things that, when missing, make agent output unverifiable.
    """
    out: list[Finding] = []

    def add(ok: bool, check: str, detail_ok: str, detail_bad: str, level: str = "error"):
        out.append(Finding("ok" if ok else level, check, detail_ok if ok else detail_bad))

    manifest = read_manifest(project)
    add(manifest is not None, "manifest",
        f"{MANIFEST} v{(manifest or {}).get('cliVersion', '?')}",
        f"{MANIFEST} missing - run `react-dev sync`", level="warn")

    # --- agent wiring -------------------------------------------------------
    skills_dir = project / ".agents" / "skills"
    skills = sorted(p.name for p in skills_dir.glob("*/SKILL.md")) if skills_dir.is_dir() else []
    add(bool(skills), "skills", f"{len(skills)} canonical skills in .agents/skills/",
        ".agents/skills/ missing or empty - run `react-dev sync`")

    agents_md = project / "AGENTS.md"
    add(agents_md.is_file(), "AGENTS.md", f"{agents_md.stat().st_size if agents_md.is_file() else 0} bytes",
        "AGENTS.md missing - the agent has no project rules")
    if agents_md.is_file():
        size = agents_md.stat().st_size
        add(size <= 8192, "AGENTS.md size", f"{size} B (under the 8 KiB guideline)",
            f"{size} B - over 8 KiB; Codex caps at project_doc_max_bytes (32 KiB) "
            "and long rules get skimmed. Move detail into a skill reference.",
            level="warn")

    for link, target in (("CLAUDE.md", "AGENTS.md"), ("GEMINI.md", "AGENTS.md")):
        p = project / link
        add(p.exists(), f"{link}", f"present -> {target}",
            f"{link} missing - that agent will not read the constitution",
            level="warn")

    # --- verification layer -------------------------------------------------
    scripts = _pkg_scripts(project)
    for name, why in (
        ("verify", "the single gate every skill depends on"),
        ("typecheck", "tsc --noEmit"),
        ("test", "unit tests"),
        ("e2e", "end-to-end"),
        ("gen", "the deterministic generator"),
    ):
        add(name in scripts, f"npm run {name}", scripts.get(name, ""),
            f"missing - {why}")

    add((project / ".github" / "workflows").is_dir(), "CI",
        "workflow present", "no .github/workflows - nothing gates a merge", level="warn")

    # --- architecture enforcement ------------------------------------------
    eslint = next((p for p in project.glob("eslint.config.*")), None)
    add(eslint is not None, "eslint config", eslint.name if eslint else "",
        "no flat eslint config - `npm run lint` cannot run")
    if eslint is not None:
        text = eslint.read_text(encoding="utf-8")
        add("boundaries" in text, "layer boundaries",
            "eslint-plugin-boundaries wired in",
            "boundaries not enforced - nothing stops cross-feature imports", level="warn")

    add((project / "src" / "features").is_dir() or (project / "app").is_dir(),
        "feature slices", "src/features/ present",
        "no src/features/ - code will pile into shared buckets", level="warn")

    # --- feedback loop ------------------------------------------------------
    add((project / ".ai").is_dir(), "feedback loop",
        ".ai/ present", ".ai/ missing - feedback has nowhere durable to land", level="warn")
    add((project / "specs").is_dir(), "specs",
        "specs/ present", "specs/ missing - no per-feature traceability", level="warn")

    # --- hygiene ------------------------------------------------------------
    src = project / "src"
    if src.is_dir():
        hits = [
            f"{p.relative_to(project)}"
            for p in src.rglob("*.ts*")
            if any(tok in p.read_text(encoding="utf-8", errors="ignore")
                   for tok in ("as any", "@ts-ignore", "@ts-nocheck"))
        ]
        add(not hits, "no type escapes", "clean",
            f"{len(hits)} file(s) use as any/@ts-ignore: {', '.join(hits[:3])}"
            + (" ..." if len(hits) > 3 else ""), level="warn")

    return out
