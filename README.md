# React Developer CLI

Bootstraps a **feature-sliced React project with atomic design**, wired for
**Claude Code, Codex and Gemini CLI**, where the agent can prove its own work.

```bash
uv tool install react-developer --from https://github.com/Mil000D/react-developer.git

react-dev init my-app
cd my-app && npm install && npm run verify
```

**Never written code before?** Start with **[START-HERE.md](START-HERE.md)** —
every step in plain words, no jargon. Polish: **[ZACZNIJ-TUTAJ.md](ZACZNIJ-TUTAJ.md)**.

**Comfortable with a terminal? [GUIDE.md](GUIDE.md)** walks you from an empty
directory to a shipped feature. The rest of this file is what the project is and
why.

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

Eleven stages, one sequence. Every skill names its own stage and the next one,
so the agent never has to guess what comes after it — and `react-dev status`
tells you where every feature in the project currently sits.

```
     ┌─ once per project ────────────────────────────────────────┐
 1   react-constitution   writes AGENTS.md — the rules all agents obey
 2   react-roadmap        design → specs/ROADMAP.md + specs/roadmap/NNN-*.md
     └──────────────────────────────────────────────────────────┘

     ┌─ once per feature, repeat ────────────────────────────────┐
 3   react-feature        branch + specs/NNN-slug/ + npm run gen
 4   react-spec           fetches the Stitch screen, then marks every unknown
 5   react-clarify        one question at a time, as a choice list
 6   react-implement      code, via the generator — never by hand
 7   react-verify         runs every gate; records real results in review.md
 8   react-analyze        read-only drift check: spec ↔ code ↔ AGENTS.md
 9   react-review         React defects the gates cannot see — races, focus, keys
10   react-ship           commit, push, open the PR — refuses on red gates
11   react-merge          squash, land, tick the roadmap, name what unblocked
     └──────────────────────── back to 3 ───────────────────────┘
```

Stages 10 and 11 are deliberately separate commands. `react-ship` refuses to
run on failing gates, unticked tasks or a surviving `[NEEDS CLARIFICATION]`;
`react-merge` refuses to land a PR that was never reviewed. Collapsing them
into one step removes the only two places where the pipeline can say no.

`react-review` is deliberately **not** a wrapper around a host command. It runs
the same in all three agents, and it only reports defects the gate is
structurally blind to — races, stale closures, `key` identity, focus handling —
with an explicit list of what it must never report because ESLint, `tsc`, axe or
`react-analyze` already fail the build on it. That exclusion list is what keeps
an LLM review from drowning you in false positives.

Every skill ends with a `Next` block — what now exists, the one command to run,
and at most one branch. Nothing follows it, so the pipeline never ends on a
summary that leaves you guessing. `AGENTS.md` makes this binding for all three
agents, and a test enforces that every skill has one.

**Toolbox skills** sit outside the sequence and are called when needed:
`react-component`, `react-feedback`, `react-update`, `react-i18n`,
`react-theme`.

Stage 2 is skippable when you already know the next feature. There is no
separate prototype stage: if the screen was designed in Stitch, `react-spec`
fetches it and translates it into the project's own tokens and components.

### Where am I?

```bash
react-dev status
```

Prints the roadmap prerequisites, then every feature with a progress bar
through the stages, and ends with the single next command to run. The stage is
**derived** from the files on disk and from git — never stored — so it stays
correct when you edit a spec by hand or merge a branch yourself.

```
●  P1    OpenAPI contract            p1-api-contract
○  P2    Auth & session model        open
   #  Feature        Pipeline    Stage      Next
●  1  landing        ━━━━━━━━    merged
○  2  dog-profile    ━┄┄┄┄┄┄┄    planned    react-feature 2
```

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
| `react-dev doctor [path]` | Check a project against 40 invariants the workflow depends on, including template drift and missing capabilities |
| `react-dev sync [path]` | Re-install skills and agent wiring; never touches `AGENTS.md`. `--with-template` also updates untouched template files |
| `react-dev status [path]` | Where every feature sits in the 11-stage pipeline, and the next command to run |

Inside a generated project:

| Command | What it does |
|---|---|
| `npm run gen -- …` | Deterministic scaffolding: `feature`, `component`, `hook`, `page`, `atom`, `molecule`, `organism`, `template`, `promote`, `mock` |
| `npm run verify` | The gate |
| `npm run components:check` | Fails if a component was copied into a second feature instead of promoted |
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
