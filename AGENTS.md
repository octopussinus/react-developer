# AGENTS.md — working on react-developer itself

This is the CLI repo, not a generated project. The generated project's
constitution is `templates/react/AGENTS.md`.

## Layout

```
src/react_dev/        the CLI (typer): init · check · doctor · sync · dispatch
  agents.py           the 3 agent adapters: wiring, and how to launch each one
  runner.py           headless workers: spawn, stream, log, verdict
  project.py          .react-dev.json + the doctor invariants
skills/<name>/        CANONICAL skills: the single source of truth for all agents
templates/react/      the project template (must pass its own npm run verify)
templates/shared/     scaffolding copied into every project (CI, .mcp.json, .ai/)
tests/                pytest
```

## Hard rules

- **`skills/*/SKILL.md` is canonical.** Never edit a generated project's
  `.claude/` or `.gemini/` — those are derived and `sync` overwrites them.
- **Portable frontmatter only:** `name`, `description`, `license`,
  `compatibility`, `metadata`, `allowed-tools`. Claude-only keys break the
  Agent Skills validators Codex and Gemini use. A test enforces this.
- **Skill bodies stay under ~110 lines.** Detail goes in `references/`.
- **Never hand-roll TOML or YAML.** Use `tomli_w`. The old f-string serializer
  corrupted files silently.
- **Anchor `.gitignore` build-artefact rules** (`/lib/`, not `lib/`). An
  unanchored `lib/` once excluded `templates/react/src/lib/` from git entirely.
- **A template change is not done until `cd templates/react && npm run verify`
  passes**, and neither is a CLI change until `pytest` passes.
- **Printed command names must be derived from the files written**, never
  hardcoded. That mismatch shipped once already.
- **Format `templates/shared/` with the template's prettier config explicitly:**
  `cd templates/react && npx prettier --config .prettierrc --write '../shared/**/*.md'`.
  Prettier resolves config from the *file's* location, and this repo has none, so
  a plain run uses defaults (printWidth 80) while the generated project checks at
  100. Table padding then differs and a fresh `npm run verify` fails on a doc
  nobody touched. A test enforces this.

## Updating an installed CLI

```bash
rm -rf dist && uv build --wheel && uv tool install --reinstall ./dist/*.whl
```

`rm -rf dist` is not tidiness: a leftover wheel from an older version makes
`./dist/*.whl` expand to two paths and `uv` exits with a usage error. And never
write the version into this command — it was pinned to `1.0.0` here and broke
the moment the version moved, which is the same hardcoding this file forbids for
printed command names.

`sync` updates skills and agent wiring in existing projects but never project
code, so **any new template surface a skill depends on must be added to
`REQUIRED_SCRIPTS` / `REQUIRED_GEN_TARGETS` / `REQUIRED_PATHS` in
`src/react_dev/project.py`.** Otherwise `doctor` reports a drifted project as
healthy while the agent runs commands it does not have — which is exactly the
failure those lists exist to catch.

## Verifying a change

```bash
.venv/bin/python -m pytest tests/ -q
cd templates/react && npm run verify

# full chain: does a fresh project pass its own gate?
cd /tmp && rm -rf t && mkdir t && cd t \
  && python /path/to/run-cli.py init app --no-git \
  && cd app && npm install && npm run verify
```

## Adding an agent

**`agents.py` and `runner.py` are the only two files that may name a vendor's
CLI, flags or event types.** `agents.py` says how an agent is wired and
launched; `runner.py` says how its event stream is read. Everywhere else —
`dispatch`, `next`, the skills — goes through `invoke_prefix`, `cli_bin` and
`headless`, which is what makes the pipeline the same whichever agent you pick.
A test enforces it.

Three things, then:

1. One entry in `AGENTS` in `src/react_dev/agents.py`. Check its docs for: where
   it reads skills (`.agents/skills` natively?), its context filename, and
   whether skills are explicitly invocable or need a command shim.
2. A `Headless(...)` on that entry if it can run unattended — the subcommand and
   flags for non-interactive mode, **including the one that pre-grants
   approval**. A worker that stops to ask has nobody to ask and hangs until the
   deadline kills it.
3. A parser in `PARSERS` in `runner.py`, plus its set of known event types.
   Anything outside that set is logged verbatim rather than dropped, so a vendor
   adding an event degrades the transcript instead of silently losing it.

Then add a case to `tests/test_agents.py` and `tests/test_runner.py`.
