# AGENTS.md — working on react-developer itself

This is the CLI repo, not a generated project. The generated project's
constitution is `templates/react/AGENTS.md`.

## Layout

```
src/react_dev/        the CLI (typer): init · check · doctor · sync
  agents.py           the 3 agent adapters — the only place agent specifics live
  project.py          .react-dev.json + the doctor invariants
skills/<name>/        CANONICAL skills: the single source of truth for all agents
templates/react/      the project template (must pass its own npm run verify)
templates/shared/     scaffolding copied into every project (CI, .mcp.json, .ai/)
tests/                pytest — 22 tests
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
uv build --wheel && uv tool install --reinstall ./dist/react_developer-1.0.0-py3-none-any.whl
```

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

One entry in `AGENTS` in `src/react_dev/agents.py`. Check its docs first for:
where it reads skills (`.agents/skills` natively?), its context filename, and
whether skills are explicitly invocable or need a command shim. Then add a case
to `tests/test_agents.py`.
