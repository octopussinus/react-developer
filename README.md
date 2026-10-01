# React Developer CLI

Bootstraps a **feature-sliced React project with atomic design**, wired for
**Claude Code, Codex and Gemini CLI**, where the agent can prove its own work.

```bash
uv tool install react-developer --from https://github.com/Mil000D/react-developer.git

react-dev init my-app
cd my-app && npm install && npm run verify
```

**New here? [GUIDE.md](GUIDE.md) walks you from an empty directory to a shipped
feature.** The rest of this file is what the project is and why.

`npm run verify` is green on the first commit. That is the point: an agent with
a gate it must pass behaves differently from one producing plausible text.

---

## What makes this different

Most AI scaffolding tools optimise code *generation*. The expensive part of
enterprise frontend work is *verification* and *correction*, so this project
puts those first.

| | How it works |
|---|---|
| **The agent can check itself** | `npm run verify` = format → lint → types → unit → dead code → locale parity. Plus Playwright, axe and Stryker. The `react-verify` skill runs them and may only report what it actually ran. |
| **Structure is generated, not improvised** | `npm run gen -- feature orders` writes 9 files and updates 3 more — route registry, locale namespaces, type augmentation — identically every time. |
| **Architecture is a failing build** | Atomic layering and feature isolation are `eslint-plugin-boundaries` rules, and `src/testing/architecture.test.ts` proves the rules still fire. |
| **Corrections become permanent** | Click an element in the running app → `.ai/inbox/` → `.ai/feedback.md` → at 3 recurrences, an `AGENTS.md` rule or an ESLint rule. |
| **One source of truth, three agents** | Skills live once in `.agents/skills/`. Claude Code gets symlinks, Codex reads it natively, Gemini gets thin TOML shims that *inject* the skill rather than copy it. |

---

## The workflow

```
react-constitution   once per project — writes AGENTS.md
      ↓
react-roadmap        a long brief → specs/ROADMAP.md, features ordered and sized
      ↓
react-feature        branch + specs/NNN-slug/ + npm run gen
      ↓
react-prototype      static HTML using the project's OWN Tailwind build
      ↓
react-spec           spec with unknowns marked [NEEDS CLARIFICATION]
      ↓
react-clarify        ≤5 targeted questions, answers written into the spec
      ↓
react-implement      code, via the generator; references/web.md for detail
      ↓
react-verify         runs every gate; records real results in review.md
      ↓
react-analyze        read-only drift check: spec ↔ code ↔ AGENTS.md
      ↓
react-feedback       capture corrections; promote recurring ones to rules
```

Side skills: `react-component`, `react-update`, `react-i18n`, `react-theme`.

`react-roadmap` is optional — skip it if you already know the next feature.

### How you invoke them

| Agent | Invocation | Wiring |
|---|---|---|
| **Claude Code** | `/react-verify` | `.claude/skills/*` → symlinks to `.agents/skills/` |
| **Codex** | `$react-verify` | reads `.agents/skills/` and `AGENTS.md` natively — nothing generated |
| **Gemini CLI** | `/react:verify` | `.gemini/commands/react/*.toml` inject the canonical `SKILL.md` via `@{...}` |

All three read the same `AGENTS.md` (`CLAUDE.md` and `GEMINI.md` link to it).

---

## Architecture

Two axes, both machine-enforced. **Atomic design governs shared presentation;
feature slices govern domain code.**

```
src/components/atoms/        Button, Input, Badge, Skeleton   — props only, no logic
src/components/molecules/    FormField, EmptyState, ErrorState — composed atoms
src/components/organisms/    SidebarNav                        — a section of UI
src/components/templates/    AppShell                          — layout, slots, NO data
src/features/<slug>/         api · components · hooks · pages · types · index.ts
```

- Atomic flow is strictly downward: atoms → molecules → organisms → templates.
  An atom importing a molecule fails `npm run lint`.
- Atomic design's **pages** layer is a feature's `pages/` — where real data meets
  a template.
- Features never import each other. A feature's `index.ts` is its only public
  surface; deep imports fail lint.
- Placement rule: used by one feature → inside it; used by two → promote it.

Based on [bulletproof-react](https://github.com/alan2207/bulletproof-react)'s
feature slices and [atomic design](https://bradfrost.com/blog/post/atomic-web-design/)
for the shared layer.

---

## Commands

| Command | What it does |
|---|---|
| `react-dev init <name>` | Create a project. `--agent claude` (repeatable), `--here`, `--force`, `--no-git` |
| `react-dev check` | Which agent CLIs and build tools are available |
| `react-dev doctor [path]` | Check a project against 19 invariants the workflow depends on |
| `react-dev sync [path]` | Re-install skills and agent wiring; never touches `AGENTS.md` |

Inside a generated project:

| Command | What it does |
|---|---|
| `npm run gen -- …` | Deterministic scaffolding: `feature`, `component`, `hook`, `page`, `atom`, `molecule`, `organism`, `template`, `promote` |
| `npm run verify` | The gate |
| `npm run e2e` / `npm run a11y` | Playwright flows / axe |
| `npm run test:mutation` | Stryker — proves the tests actually test |
| `npm run storybook` | Every component state, light and dark |
| `npm run api:generate` | Types + client + Zod from the OpenAPI contract |

---

## Stack

React 19 · TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
· Vite · Tailwind v4 `@theme` tokens · TanStack Query · Zod · React Hook Form ·
i18next (lazy per-locale) · Vitest · Playwright + axe · Storybook 10 · Stryker · knip

No dashboard template, no demo content, no chart library you did not ask for.
`src/features/` starts empty on purpose.

---

## Development

```bash
python -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/python -m pytest tests/ -q          # 22 CLI tests

cd templates/react && npm install && npm run verify
```

`skills/*/SKILL.md` is the canonical source for all three agents — edit there,
never in a generated project's `.claude/` or `.gemini/`.

| Doc | For |
|---|---|
| [GUIDE.md](GUIDE.md) | **how to build an app with this** — start here |
| [ENTERPRISE-READINESS-AUDIT.md](ENTERPRISE-READINESS-AUDIT.md) | the analysis this rebuild came from |
| [MIGRATION.md](MIGRATION.md) | what changed from v0.0.1 |
| [registry/README.md](registry/README.md) | adding a component to the registry |

## License

See [LICENSE](LICENSE).
