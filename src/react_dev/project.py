"""Project manifest and invariant checks.

``.react-dev.json`` records what a project was generated from, which is what
makes ``react-dev sync`` and ``react-dev doctor`` possible at all: without a
version stamp you can never tell which generation of the workflow a repo is on,
so fleet-wide fixes are impossible.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

#: Directories never part of a template fingerprint.
_FINGERPRINT_SKIP = {
    "node_modules", "dist", "coverage", "playwright-report", "test-results",
    "storybook-static", ".expo", "__pycache__", ".git",
}


def file_hashes(*roots: Path) -> dict[str, str]:
    """Per-file hashes of the template trees, keyed by the path in a project.

    This is what lets `sync` reason three ways instead of two. With only a whole
    tree fingerprint you can tell THAT something changed but not WHOSE change it
    was, so the choice is between clobbering the user's edits and never updating
    anything. Comparing a project file against the hash stamped at init
    distinguishes:

      project == stamped, template != stamped  -> untouched, safe to update
      project != stamped                       -> the user edited it, hands off

    Without it, `--force-template` silently discarded real work (a customised
    Button, a public-layout router) and the tree fingerprint stayed permanently
    stale on any project with legitimate customisations.
    """
    out: dict[str, str] = {}
    for root in roots:
        if not root.is_dir():
            continue
        for path in sorted(p for p in root.rglob("*") if p.is_file()):
            if any(part in _FINGERPRINT_SKIP for part in path.parts):
                continue
            rel = str(path.relative_to(root))
            out[rel] = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    return out


def classify_drift(
    project: Path, stamped: dict[str, str], current: dict[str, str]
) -> tuple[list[str], list[str]]:
    """Split differing files into (outdated, customised).

    outdated   - the project still has what init gave it; the template moved on
    customised - the project changed it; only its owner can merge
    """
    outdated: list[str] = []
    customised: list[str] = []

    for rel, template_hash in current.items():
        target = project / rel
        if not target.is_file():
            continue
        actual = hashlib.sha256(target.read_bytes()).hexdigest()[:12]
        if actual == template_hash:
            continue  # already up to date
        if stamped.get(rel) == actual:
            outdated.append(rel)
        else:
            customised.append(rel)

    return sorted(outdated), sorted(customised)


def restamp(
    project: Path, stamped: dict[str, str], current: dict[str, str]
) -> dict[str, str]:
    """What the template last gave this project, after a `--with-template` run.

    A file now holding the template's content is stamped with the template's
    hash. A file left alone keeps the hash it was given, which is the baseline
    its owner's edit diverged from -- restamping it would class the next
    template change to it as "untouched, safe to update" and overwrite the edit.

    Stamping all-or-nothing is what made `--with-template` a one-shot: the run
    that updated files recorded nothing, because *having had* outdated files was
    read as "not yet synced". Next run those same files no longer matched their
    stale stamp, so they were read as the user's and never updated again.
    """
    out = dict(stamped)
    for rel, template_hash in current.items():
        target = project / rel
        if not target.is_file():
            continue
        if hashlib.sha256(target.read_bytes()).hexdigest()[:12] == template_hash:
            out[rel] = template_hash
    return out


def template_fingerprint(*roots: Path) -> str:
    """Content hash of one or more template trees.

    A hand-maintained version number cannot detect template drift -- it was
    stamped 1.0.0 through a dozen breaking template changes, so the one check
    meant to catch drift reported "template and CLI both 1.0.0" on a project
    missing six generator targets and all of MSW.

    This cannot be forgotten: it changes whenever any template file changes.
    """
    digest = hashlib.sha256()
    for root in roots:
        if not root.is_dir():
            continue
        for path in sorted(p for p in root.rglob("*") if p.is_file()):
            if any(part in _FINGERPRINT_SKIP for part in path.parts):
                continue
            digest.update(str(path.relative_to(root)).encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()[:16]

MANIFEST = ".react-dev.json"

#: Files the user is expected to edit. ``sync`` never overwrites these.
USER_OWNED = ("AGENTS.md",)


def write_manifest(project: Path, *, cli_version: str, project_type: str,
                   agents: list[str], skills: list[str],
                   fingerprint: str | None = None,
                   user_removed: list[str] | None = None,
                   hashes: dict[str, str] | None = None,
                   port_from: str | None = None) -> None:
    # The web app a mobile app is ported from, relative to the project. Kept
    # through every sync: `npm run port` reads it, and losing it would leave
    # the port asking which app it was made from.
    extra = {"portFrom": port_from} if port_from else {}
    (project / MANIFEST).write_text(
        json.dumps(
            {
                "cliVersion": cli_version,
                "templateFingerprint": fingerprint,
                "projectType": project_type,
                "agents": agents,
                "skills": sorted(skills),
                "createdAt": date.today().isoformat(),
                "userOwned": list(USER_OWNED),
                # Template files this project deliberately deleted. `sync` will
                # not add them back. Edit this list by hand when you outgrow a
                # piece of template scaffolding.
                "userRemoved": sorted(user_removed or []),
                # Per-file hashes as shipped. `sync` compares against these to
                # tell your edits from template changes. Do not hand-edit.
                "fileHashes": hashes or {},
                **extra,
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


#: What the currently-installed skills instruct the agent to use. A project
#: whose template predates any of these will have an agent running commands
#: that do not exist, so `doctor` checks for them explicitly.
#:
#: Add an entry here whenever a skill starts depending on new template surface.
REQUIRED_SCRIPTS: tuple[tuple[str, str], ...] = (
    ("verify", "the single gate every skill ends with"),
    ("typecheck", "tsc -b"),
    ("test", "unit tests"),
    ("e2e", "Playwright flows"),
    ("a11y", "axe"),
    ("visual", "screenshot baselines (react-verify step 4)"),
    ("lint:rules", "tests for promoted ESLint rules (react-feedback)"),
    ("duplicates", "jscpd"),
    ("i18n:check", "locale parity (react-i18n)"),
    ("components:check", "component duplication across modules (react-analyze)"),
    ("build", "the production build -- catches what dev transpiles away"),
    ("gen", "the deterministic generator"),
    ("storybook", "the component workshop, on this checkout's own port"),
    ("build-storybook", "the workshop as a static site for a reviewer"),
)

#: Generator targets the skills name directly.
REQUIRED_GEN_TARGETS: tuple[str, ...] = (
    "feature", "component", "hook", "page",
    "atom", "molecule", "organism", "template",
    "promote", "mock",
)

#: Template surface the skills write into.
REQUIRED_PATHS: tuple[tuple[str, str], ...] = (
    ("src/testing/mocks/handlers/index.ts", "the one composed MSW handler list"),
    ("src/testing/mocks/server.ts", "MSW for Vitest"),
    ("src/testing/mocks/browser.ts", "MSW for dev and Storybook"),
    ("public/mockServiceWorker.js", "generated by `npx msw init public`"),
    ("tools/route-graph.mjs",
     "the site map's static analysis (Map button)"),
    ("src/dev/route-map.tsx", "the site map itself"),
    ("tools/component-map-plugin.mjs",
     "the Dev overlay's reused-vs-new endpoint"),
    ("src/dev/component-overlay.tsx", "the Dev overlay itself"),
    ("src/dev/switchers.tsx", "the theme and language switchers"),
    ("src/styles/themes.css", "the three themes every project ships"),
    ("scripts/duplicate-components-check.mjs",
     "the components:check gate -- react-analyze runs it"),
    ("src/components/atoms", "atomic layer"),
    ("src/components/molecules", "atomic layer"),
    ("src/components/organisms", "atomic layer"),
    ("src/components/templates", "atomic layer"),
    ("components.json", "shadcn registry config (react-component)"),
    ("eslint-rules/index.js", "where react-feedback promotes a rule"),
    ("src/dev/feedback-toolbar.tsx", "the in-app feedback toolbar (react-feedback)"),
    ("tools/feedback-plugin.mjs", "the dev endpoint that writes .ai/inbox/"),
    ("tools/dev-port.mjs", "one port per checkout -- dev, Playwright and Storybook"),
    ("scripts/storybook.mjs", "serves Storybook on that port (the Storybook button)"),
    ("src/dev/dock.ts", "opens the toolbar's panels beside each other, not on top"),
    ("src/dev/rows.ts", "the labelled rows with an (i), shared by feedback and Dev"),
    ("src/dev/takeover.ts", "the frames Map and Storybook open in"),
    ("src/dev/storybook.ts", "the Storybook button"),
    ("src/dev/route-highlight.ts", "outlines a page's links in the map's colours"),
)

#: Packages the dev tooling imports directly.
#:
#: `sync` never touches project code, so a project generated before one of
#: these was added keeps a Map button that throws on click. A missing import is
#: invisible until someone presses the button, which is exactly the drift the
#: capability rows exist to surface.
REQUIRED_DEV_DEPS: tuple[tuple[str, str], ...] = (
    ("ts-morph", "tools/route-graph.mjs reads the real AST with it"),
    ("@xyflow/react", "the site map is drawn with it"),
    ("@dagrejs/dagre", "the site map's layout -- without it the Map button throws"),
)


#: The mobile app's invariants -- what `react-native-port` and
#: `react-native-verify` run. Same rule as the web lists above: a skill that
#: starts depending on new template surface adds it here, or `doctor` reports a
#: drifted mobile app as healthy while its agent runs commands it does not have.
NATIVE_REQUIRED_SCRIPTS: tuple[tuple[str, str], ...] = (
    ("verify", "the single gate react-native-verify runs"),
    ("port", "copies the web app across and writes PORT.md (react-native-port)"),
    ("typecheck", "Uniwind's className types, then tsc"),
    ("test", "the web's tests against the copied code, plus native UI tests"),
    ("test:logic", "Vitest: the copied web tests"),
    ("test:native", "jest-expo: *.native.test.tsx"),
    ("lint", "eslint"),
    ("expo-go:check", "fails when a dependency would not run in Expo Go"),
    ("doctor", "expo-doctor"),
    ("bundle", "iOS and Android bundles -- every screen compiles"),
)

NATIVE_REQUIRED_PATHS: tuple[tuple[str, str], ...] = (
    ("tools/port/index.mjs", "the copier `npm run port` runs"),
    ("tools/expo-go-check.mjs", "the Expo Go compatibility gate"),
    ("tools/uniwind-types.mjs", "className types for tsc without Metro"),
    ("src/app/_layout.tsx", "the native app frame: providers, mocks, theme"),
    ("src/platform/install.ts", "the web APIs copied code expects (localStorage)"),
    ("src/platform/mocks.ts", "the web's MSW handlers answering on the phone"),
    ("src/platform/mock-runtime.ts", "what msw needs and Hermes lacks"),
    ("src/platform/port-stub.tsx", "what an untranslated route shows"),
    ("src/global.css", "Tailwind + Uniwind + the converted tokens"),
    ("src/styles/themes.json", "the theme list metro and theme.ts read"),
    ("metro.config.js", "Uniwind's Metro wrapper with the generated themes"),
    ("app.json", "the app config -- native settings live here, not in ios/android"),
    ("eas.json", "the development-build profile for leaving Expo Go"),
)

NATIVE_REQUIRED_DEV_DEPS: tuple[tuple[str, str], ...] = (
    ("typescript", "tools/port reads the web app's AST with it"),
    ("postcss", "tools/port converts the web stylesheets with it"),
    ("vitest", "runs the copied web tests"),
    ("jest-expo", "runs the native UI tests"),
    ("expo-doctor", "the `doctor` gate"),
)

#: project type -> (scripts, generator targets, paths, dev dependencies)
REQUIREMENTS: dict[str, tuple] = {
    "react": (REQUIRED_SCRIPTS, REQUIRED_GEN_TARGETS, REQUIRED_PATHS, REQUIRED_DEV_DEPS),
    "react-native": (NATIVE_REQUIRED_SCRIPTS, (), NATIVE_REQUIRED_PATHS,
                     NATIVE_REQUIRED_DEV_DEPS),
}


@dataclass
class Finding:
    level: str  # "error" | "warn" | "ok"
    check: str
    detail: str


def _pkg_scripts(project: Path) -> dict[str, str]:
    return _pkg_field(project, "scripts")


def _pkg_deps(project: Path) -> dict[str, str]:
    """Both kinds, because which one a package belongs in is not the point."""
    return {**_pkg_field(project, "dependencies"),
            **_pkg_field(project, "devDependencies")}


def _pkg_field(project: Path, field: str) -> dict[str, str]:
    pkg = project / "package.json"
    if not pkg.is_file():
        return {}
    try:
        return json.loads(pkg.read_text(encoding="utf-8")).get(field, {})
    except json.JSONDecodeError:
        return {}


def diagnose(project: Path, cli_version: str = "?",
             template_roots: tuple[Path, ...] = ()) -> list[Finding]:
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

    # --- template fingerprint -------------------------------------------------
    # Content-based, so it catches drift a forgotten version bump would hide.
    if manifest is not None and template_roots and any(r.is_dir() for r in template_roots):
        stamped_fp = manifest.get("templateFingerprint")
        current_fp = template_fingerprint(*template_roots)
        if stamped_fp is None:
            add(False, "template fingerprint", "",
                "not stamped (project predates fingerprinting) - run "
                "`react-dev sync --with-template`", level="warn")
        elif stamped_fp != current_fp:
            # Only report files the project has NOT customised -- a customised
            # file differs forever, and warning about it every run is noise.
            stamped_hashes = manifest.get("fileHashes") or {}
            outdated, customised = classify_drift(
                project, stamped_hashes, file_hashes(*template_roots)
            )
            if outdated:
                add(False, "template drift",
                    "", f"{len(outdated)} file(s) behind the template "
                    f"({', '.join(outdated[:4])}{' …' if len(outdated) > 4 else ''}). "
                    "Run `react-dev sync --with-template`.", level="warn")
            else:
                add(True, "template drift",
                    f"up to date ({len(customised)} file(s) customised by you)", "")
        else:
            add(True, "template drift", f"identical to the installed template ({current_fp})", "")

    # --- version skew ---------------------------------------------------------
    # `sync` refreshes skills and agent wiring but deliberately never touches
    # project code, so an older project can end up with new skills and an old
    # template. That combination fails silently: the agent runs a command the
    # project does not have.
    if manifest is not None:
        stamped = str(manifest.get("cliVersion", "?"))
        add(stamped == cli_version, "cli version",
            f"template and CLI both {cli_version}",
            f"template stamped {stamped}, CLI is {cli_version}. `sync` updates "
            "skills but NOT project code - check the capability rows below.",
            level="warn")

    # --- capabilities the current skills require ------------------------------
    project_type = (manifest or {}).get("projectType", "react")
    required_scripts, gen_targets, required_paths, required_deps = REQUIREMENTS.get(
        project_type, REQUIREMENTS["react"]
    )
    scripts = _pkg_scripts(project)
    for name, why in required_scripts:
        add(name in scripts, f"npm run {name}", scripts.get(name, ""),
            f"missing - {why}")

    generator = project / "tools" / "gen" / "index.mjs"
    if not gen_targets:
        pass  # the mobile app has no generator: its files come from the web app
    elif generator.is_file():
        source = generator.read_text(encoding="utf-8", errors="ignore")
        missing = [g for g in gen_targets if f"{g}:" not in source]
        add(not missing, "generator targets",
            f"all {len(gen_targets)} present",
            f"missing: {', '.join(missing)} - skills reference these, so the "
            "agent will run commands that do not exist")
    else:
        add(False, "generator targets", "", "tools/gen/index.mjs missing")

    for rel, why in required_paths:
        add((project / rel).exists(), rel, "present", f"missing - {why}")

    if project_type == "react-native":
        # The port needs to find the web app. A missing one is not fatal -- the
        # app still runs -- but `npm run port` will stop and ask.
        port_from = (manifest or {}).get("portFrom")
        found = bool(port_from) and (project / port_from / "src").is_dir()
        add(found, "web app", f"{port_from} (npm run port reads it)",
            f"{port_from or 'not recorded'} not found - run "
            "`npm run port -- --from <web app>` once", level="warn")

    deps = _pkg_deps(project)
    for name, why in required_deps:
        add(name in deps, name, deps.get(name, ""),
            f"not in package.json - {why}. Run `npm i -D {name}`.")

    # The feedback toolbar reports file:line from `data-tsd-source`, injected by
    # @tanstack/devtools-vite. Without that plugin wired the toolbar still works
    # but silently drops the source location -- the most useful part of an entry.
    vite_config = next((p for p in project.glob("vite.config.*")), None)
    if vite_config is not None:
        config_text = vite_config.read_text(encoding="utf-8", errors="ignore")
        # Both the import and the call, so a renamed or commented-out call is
        # not mistaken for a wired one by a loose substring match.
        wired = "@tanstack/devtools-vite" in config_text and re.search(
            r"(?<![\w$])devtools\s*\(", config_text
        ) is not None
        add(wired, "source injection",
            "@tanstack/devtools-vite wired (feedback reports file:line)",
            "not wired in vite.config - the feedback toolbar will record a "
            "selector but no file:line. React 19 removed fiber._debugSource, so "
            "the attribute must come from this plugin.", level="warn")

        # The Dev overlay asks the dev server which components are new on this
        # branch. Without the plugin the button is there and the answer is empty,
        # which reads as "nothing was reused" rather than "nothing was measured".
        overlay_wired = "component-map-plugin" in config_text and re.search(
            r"(?<![\w$])componentMapPlugin\s*\(", config_text
        ) is not None
        route_map_wired = "route-graph" in config_text and re.search(
            r"(?<![\w$])routeGraphPlugin\s*\(", config_text
        ) is not None
        add(route_map_wired, "route graph",
            "routeGraphPlugin wired (Map button shows the site map)",
            "not wired in vite.config - the Map button cannot build the site "
            "map.", level="warn")

        add(overlay_wired, "component map",
            "componentMapPlugin wired (Dev overlay shows reused vs new)",
            "not wired in vite.config - the Dev overlay cannot tell reused "
            "components from ones written for this feature.", level="warn")

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

    # --- CI -------------------------------------------------------------------
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

    add((project / "src" / "modules").is_dir() or (project / "app").is_dir(),
        "module slices", "src/modules/ present",
        "no src/modules/ - code will pile into shared buckets", level="warn")

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


# --------------------------------------------------------------------------- #
# pipeline status
# --------------------------------------------------------------------------- #

#: The pipeline, in order. Index into this to render progress.
STAGES: tuple[str, ...] = (
    "planned", "started", "specced", "clarified",
    "implemented", "verified", "shipped", "merged",
)


@dataclass
class FeatureStatus:
    number: str
    slug: str
    stage: str
    detail: str
    next_command: str


def _git(project: Path, *args: str) -> str:
    """Run git, returning stdout or '' — never raising."""
    import subprocess

    try:
        out = subprocess.run(
            ["git", *args], cwd=project, capture_output=True, text=True, timeout=15
        )
        return out.stdout.strip() if out.returncode == 0 else ""
    except Exception:  # noqa: BLE001 - git absent or not a repo
        return ""


def pipeline_status(project: Path) -> list[FeatureStatus]:
    """Where every planned feature sits in the pipeline.

    Derived, never stored. A stored stage drifts the moment anyone does anything
    outside the tool -- and people do. The filesystem and git already know.
    """
    roadmap_dir = project / "specs" / "roadmap"
    index = project / "specs" / "ROADMAP.md"
    if not roadmap_dir.is_dir() and not index.is_file():
        return []

    index_text = index.read_text(encoding="utf-8", errors="ignore") if index.is_file() else ""
    branches = _git(project, "branch", "--format=%(refname:short)").splitlines()
    merged_into_head = set(
        _git(project, "branch", "--merged").replace("*", "").split()
    )

    out: list[FeatureStatus] = []
    for plan in sorted(roadmap_dir.glob("[0-9][0-9][0-9]-*.md")) if roadmap_dir.is_dir() else []:
        number, _, slug = plan.stem.partition("-")
        work = project / "specs" / f"{number}-{slug}"
        branch = f"{number}-{slug}"

        # merged: the index says so, or the branch is merged and gone
        marked_done = bool(
            re.search(rf"\|\s*{int(number)}\s*\|[^|]*`{re.escape(slug)}`[^|]*(✅|done)", index_text)
        )
        if marked_done or (branch in merged_into_head and branch not in branches):
            out.append(FeatureStatus(number, slug, "merged", "landed", ""))
            continue

        if not work.is_dir():
            out.append(FeatureStatus(number, slug, "planned", "no work folder yet",
                                     f"react-feature {int(number)}"))
            continue

        spec = work / "spec.md"
        tasks = work / "tasks.md"
        review = work / "review.md"

        spec_text = spec.read_text(encoding="utf-8", errors="ignore") if spec.is_file() else ""
        tasks_text = tasks.read_text(encoding="utf-8", errors="ignore") if tasks.is_file() else ""
        review_text = review.read_text(encoding="utf-8", errors="ignore") if review.is_file() else ""

        if not spec_text.strip():
            stage, detail, nxt = "started", "spec.md is empty", "react-spec"
        elif "[NEEDS CLARIFICATION" in spec_text:
            n = spec_text.count("[NEEDS CLARIFICATION")
            stage, detail, nxt = "specced", f"{n} unresolved question(s)", "react-clarify"
        elif "- [ ]" in tasks_text:
            left = tasks_text.count("- [ ]")
            stage, detail, nxt = "clarified", f"{left} task(s) left", "react-implement"
        elif "## Automated verification" not in review_text or "pass" not in review_text:
            stage, detail, nxt = "implemented", "not verified yet", "react-verify"
        elif re.search(r"- \[ \].*blocker", review_text, re.I):
            stage, detail, nxt = "verified", "review blocker(s) open", "react-update"
        elif branch in branches and _git(project, "log", "--oneline", f"{branch}", "-1"):
            stage, detail, nxt = "verified", "ready to ship", "react-ship"
        else:
            stage, detail, nxt = "verified", "verified", "react-ship"

        out.append(FeatureStatus(number, slug, stage, detail, nxt))

    return out


@dataclass
class PrerequisiteStatus:
    number: str
    what: str
    state: str
    branch: str


def prerequisite_status(project: Path) -> list[PrerequisiteStatus]:
    """Prerequisites from the roadmap index, matched against pN-* branches.

    They are tracked because they are real work on real branches -- the index
    lists them, and a project that forgets one builds features on a decision
    nobody made.
    """
    index = project / "specs" / "ROADMAP.md"
    if not index.is_file():
        return []

    text = index.read_text(encoding="utf-8", errors="ignore")
    branches = set(_git(project, "branch", "--format=%(refname:short)").split())
    merged = set(_git(project, "branch", "--merged").replace("*", "").split())

    out: list[PrerequisiteStatus] = []
    for row in re.finditer(r"^\|\s*(P\d+)\s*\|\s*([^|]+?)\s*\|.*?\|\s*([^|]*?)\s*\|\s*$",
                           text, re.M):
        number, what, status_cell = row.group(1), row.group(2), row.group(3)
        slug_branch = next(
            (b for b in branches if b.lower().startswith(number.lower() + "-")), ""
        )
        if "✅" in status_cell or "done" in status_cell.lower():
            state = "done"
        elif slug_branch and slug_branch in merged:
            state = "merged"
        elif slug_branch:
            state = "in progress"
        else:
            state = "open"
        out.append(PrerequisiteStatus(number, what.strip(), state, slug_branch))
    return out


def current_branch(project: Path) -> str:
    return _git(project, "rev-parse", "--abbrev-ref", "HEAD")


@dataclass
class ParallelPlan:
    """A batch that is safe to build at the same time, and why the rest is not."""

    batch: list[FeatureStatus]
    excluded: list[tuple[FeatureStatus, str]]


def _module_column(index_text: str) -> int | None:
    """Which column of the features table holds the module, by its header.

    Found by NAME, never by position. Reading "the first cell after the number"
    silently returns the slug on a roadmap written before the column existed --
    and since every slug is unique, every feature then looks like its own module
    and the batch comes back MORE permissive than it should be. A lock that fails
    open is worse than no lock.
    """
    for line in index_text.splitlines():
        cells = [c.strip().strip("`").lower() for c in line.split("|")]
        if "module" in cells and "#" in cells:
            return cells.index("module")
    return None


def _module_of(index_text: str, number: str, column: int) -> str | None:
    for line in index_text.splitlines():
        cells = [c.strip().strip("`") for c in line.split("|")]
        if len(cells) <= column:
            continue
        if cells[1].strip() == str(int(number)):
            value = cells[column].strip()
            return value or None
    return None


def parallel_batch(project: Path, limit: int = 3) -> ParallelPlan:
    """Features that can honestly be built at the same time.

    Claim-plane selection: the MODULE is the lock. Two pages of one module share
    that module's `components/`, `lib/` and `types/`, so building them at once is
    two agents editing one file -- which git merges cleanly into something that
    does not build. Worktrees isolate files, not meaning.

    Three other things disqualify a feature, and each is a fact on disk rather
    than a judgement:

    * an unresolved `[NEEDS CLARIFICATION]` -- it would be built on a guess
    * a prerequisite or earlier feature it declares a dependency on, still open
    * already started -- it has a work folder, so it is somebody's current job
    """
    features = pipeline_status(project)
    index = project / "specs" / "ROADMAP.md"
    index_text = index.read_text(encoding="utf-8", errors="ignore") if index.is_file() else ""
    roadmap_dir = project / "specs" / "roadmap"

    module_column = _module_column(index_text)
    if module_column is None:
        # Refuse rather than guess: without the lock, parallel is unsafe.
        return ParallelPlan(
            batch=[],
            excluded=[
                (
                    f,
                    "roadmap has no Module column - re-run react-roadmap, or add it. "
                    "Without it there is no lock and parallel builds are unsafe",
                )
                for f in features
                if f.stage == "planned"
            ],
        )

    done = {f.number for f in features if f.stage == "merged"}
    # Prerequisites carry their own status in the index. Treating every `P<n>` as
    # permanently blocking meant a project that had FINISHED all of them could
    # never start anything in parallel, and the only escape was hand-editing
    # every feature file to delete the reference -- which erases the record of
    # what the feature actually depended on.
    open_prerequisites = {
        q.number.upper() for q in prerequisite_status(project) if q.state == "open"
    }
    batch: list[FeatureStatus] = []
    excluded: list[tuple[FeatureStatus, str]] = []
    claimed: set[str] = set()

    for feature in features:
        if feature.stage != "planned":
            excluded.append((feature, f"already {feature.stage}"))
            continue

        detail = roadmap_dir / f"{feature.number}-{feature.slug}.md"
        text = detail.read_text(encoding="utf-8", errors="ignore") if detail.is_file() else ""
        if "[NEEDS CLARIFICATION" in text:
            excluded.append((feature, "open questions - run react-clarify first"))
            continue

        needs = re.search(r"Needs \*\*([^*]+)\*\*", text)
        blocking = []
        for token in (needs.group(1).split(",") if needs else []):
            token = token.strip()
            if re.fullmatch(r"[Pp]\d+", token):
                if token.upper() in open_prerequisites:
                    blocking.append(token)
            elif token.rstrip(".").isdigit() and f"{int(token):03d}" not in done:
                blocking.append(f"feature {int(token)}")
        if blocking:
            excluded.append((feature, f"waiting on {', '.join(blocking)}"))
            continue

        module = _module_of(index_text, feature.number, module_column)
        if module is None:
            excluded.append((feature, "no module in the roadmap row"))
            continue
        if module in claimed:
            excluded.append((feature, f"module `{module}` is already being built"))
            continue

        if len(batch) >= limit:
            excluded.append((feature, f"over the limit of {limit}"))
            continue

        claimed.add(module)
        batch.append(feature)

    return ParallelPlan(batch=batch, excluded=excluded)
