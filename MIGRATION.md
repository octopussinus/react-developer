# Migration — v0.0.1 → v1.0.0

A rebuild, not an upgrade. Everything below traces to a finding in
[ENTERPRISE-READINESS-AUDIT.md](ENTERPRISE-READINESS-AUDIT.md); the finding ID is
in brackets. The old code is in git at `b78e5f8` if you need it.

## Agents: 9 → 3, with one source of truth

| Before | After |
|---|---|
| 8 prose `.md` files copied into 9 agent folders | 12 skills, canonical in `.agents/skills/` |
| Markdown→TOML by f-string interpolation | `tomli_w`, with a hostile-input test |
| No way to push prompt fixes to existing projects | `react-dev sync` |

`.agents/skills/` is read **natively** by Codex and Gemini CLI. Claude Code gets
symlinks (it does not read `.agents/skills` yet —
[anthropics/claude-code#31005](https://github.com/anthropics/claude-code/issues/31005)).
Gemini additionally gets TOML shims because it only invokes skills implicitly;
each shim *injects* the canonical `SKILL.md` with `@{...}` rather than copying
it. **[E3, E2, D3]**

Dropped: Copilot, Qwen, OpenCode, Windsurf, Roo, Amp. Adding one back is a ~15
line adapter in `src/react_dev/agents.py`.

## Workflow: 4 ungated steps → 12 gated skills

| Before | After |
|---|---|
| `prototype → requirements → typescript → page` | `constitution → feature → prototype → spec → clarify → implement → verify → analyze → feedback` |
| No clarification step | `react-clarify`: ≤5 questions, answers written into the spec **[C1]** |
| No consistency check | `react-analyze`: read-only spec↔code↔rules drift report **[C1]** |
| Self-review as prose assertions | `react-verify`: runs the gates, may only report what it ran **[A2]** |
| Corrections lost at session end | `react-feedback`: the escalation ladder **[D2]** |
| 87 KB of prompts, 607-line bodies, one duplicated verbatim | 37 KB, 44–76 line bodies, detail in `references/` **[C4]** |
| Global `prototypes/` + `requirements/`, old ones **deleted** | `specs/NNN-slug/` per branch, nothing deleted **[C2]** |

## Template: vendored dashboard → verified architecture

**Removed** `react-template` (TailAdmin, 116 files): type-based folders, magic
filename routing, ~90 demo images, 30 UI dependencies, React-19 `overrides`
hacks, zero tests. **[B1, B3, B4]**

**Added** `templates/react`:

| Audit finding | Fix |
|---|---|
| **[A1]** no test tooling | Vitest, Testing Library, Playwright, axe, Stryker, knip, jscpd, Prettier, CI |
| **[A3]** no visual review | Storybook, light + dark, story per component |
| **[B1]** type-based folders | atomic design + feature slices, enforced by `eslint-plugin-boundaries` |
| **[B2]** no data layer | TanStack Query + Zod + RHF + typed api client + OpenAPI codegen |
| **[B3]** magic routing | typed, lazy route registry with permissions and i18n keys |
| **[B5]** eager i18n, untyped keys | lazy per-locale chunks, typed keys, CI parity check |
| **[D1]** no agent context | `AGENTS.md` (4 KB), linked from `CLAUDE.md`/`GEMINI.md` |

`src/features/` ships empty. Run `npm run gen -- feature <name>`.

## CLI: `specify_cli` → `react_dev`

Deleted ~250 lines of unreachable code that fetched `github/spec-kit` releases,
plus the `--github-token` and `--skip-tls` flags that were documented and did
nothing, plus the `httpx`/`truststore` dependencies that existed only for it.
**[E1]**

Fixed: the Next Steps panel printed `/react.prototype-creator` while writing
`react-prototype-creator.md` — wrong for all nine agents. It is now derived from
the files actually written, with a test. **[C5]**

New: `react-dev doctor` (19 invariants), `react-dev sync`, `.react-dev.json`.

**Expo is not in v1.0.0.** The old template shipped NativeWind with zero
`className` usage while its docs described `StyleSheet` **[B6]** — that needs a
decision, not a port.

## Bugs found while rebuilding

Worth recording, because each one was invisible until something executed:

1. **The repo's `.gitignore` had an unanchored `lib/`**, so
   `templates/react/src/lib/` was never committed — every generated project
   would have shipped without its api client, `cn` and query client. It also
   made knip silently skip that directory.
2. **`npm run typecheck` was `tsc --noEmit`** against a references-only root
   config: it checked nothing and exited 0. Now `tsc -b`.
3. **The boundary rules were inert.** Element patterns used a trailing `/*`
   while `eslint-plugin-boundaries` defaults to folder mode, so nothing matched
   and every illegal import passed. `src/testing/architecture.test.ts` now
   proves the rules fire.
4. **`export const Error` in a story** shadowed the global `Error` constructor.
5. **Top-level `await`** in the i18n config broke the production build.
6. **A fresh project failed its own `npm run verify`** because the files the CLI
   copies in were not Prettier-formatted.

## Breaking changes

- `--type react-native` removed; `--type` now accepts only `react`
- `--ai` → `--agent`, repeatable
- `--github-token`, `--skip-tls`, `--ignore-agent-tools` removed
- Command names: `/react-prototype-creator` → `/react-prototype`, and so on
- `prototypes/` + `requirements/` → `specs/NNN-slug/`
- Python package `specify_cli` → `react_dev`

There is no automated upgrade from v0.0.1. Generate a new project and move your
`src/features` code into the new structure; `npm run lint` will tell you exactly
where each piece is allowed to live.
