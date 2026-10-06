# AGENTS.md — project constitution

Non-negotiable. If a request conflicts with this file, say so before proceeding.
`CLAUDE.md` and `GEMINI.md` link here, so every agent reads the same rules.

## Stack

React 19 · TypeScript (strict + `noUncheckedIndexedAccess`) · Vite · Tailwind v4
(`@theme` tokens) · TanStack Query · Zod · React Hook Form · i18next · Vitest ·
Playwright + axe · Storybook 10 · Stryker

## Architecture — two axes, both enforced by `eslint-plugin-boundaries`

**Atomic design governs shared presentation. Modules and pages govern domain code.**

```
src/components/atoms/        Button, Input, Badge, Skeleton   — props only, zero logic
src/components/molecules/    FormField, EmptyState, ErrorState — composed atoms
src/components/organisms/    SidebarNav                        — a section of UI
src/components/templates/    AppShell                          — layout, slots, NO data
src/modules/<module>/                shared by that module's pages: components · lib · types
src/modules/<module>/<page>/         api · components · hooks · lib · types · constants · validation
                                     plus <page>-page.tsx and index.ts
```

- **Atomic flow is strictly downward:** atoms → molecules → organisms → templates.
  An atom may not import a molecule. Atoms may only import `lib` and `types`.
- **A page owns its slice.** It may reach UP to its own module's shared folders
  and to the global layers — never sideways into another module or page.
- **Module shared code may not import a page.** It stops being shareable the
  moment that page changes.
- **`index.ts` is the only public surface**, for a page and for a module alike.
  Deep imports fail lint.
- Import direction: `app → module → page → templates → organisms → molecules → atoms → lib`.

Decide placement by reuse, one step at a time: one page → inside that page; two
pages of one module → `modules/<module>/components`; two modules → an atomic
layer. Promote, never copy — `npm run gen -- promote`.

## Commands

| Command                                           | Use                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run gen -- <generator>`                      | Scaffold. `feature`, `component`, `hook`, `page`.                                  |
| `npm run verify`                                  | format → lint → rule tests → types → unit → dead code → duplicates → locale parity |
| `npm run e2e` / `npm run a11y` / `npm run visual` | Playwright flows / axe / screenshot baselines                                      |
| `npm run test:mutation`                           | Proves the tests actually test                                                     |
| `npm run api:generate`                            | Regenerate the typed API contract                                                  |
| `npm run storybook`                               | Review every component state                                                       |

## Adding a component — use the registry, do not improvise

shadcn is **not** a dependency; it is a CLI that copies source files into this
repo. Tailwind remains the styling engine, and the `@theme` token names in
`src/styles/index.css` are shadcn's vocabulary **on purpose** — rename one and
every future `shadcn add` breaks.

| Need                                            | Command                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| A primitive (select, dialog, dropdown, tooltip) | `npx shadcn@latest add select` → lands in `atoms` via `aliases.ui`     |
| A chart, table or theme toggle                  | `npx shadcn@latest add @react-dev/chart` → lands in its declared layer |

Both install their own npm dependency at that moment. That is deliberate: the
core stays minimal and nothing ships a chart library you never render.

**Which layer does a NEW component belong to?**

| Layer        | Test                                                                 |
| ------------ | -------------------------------------------------------------------- |
| **atom**     | Props only. No store, no fetch, no `t()`, no router.                 |
| **molecule** | Composes atoms. May translate and read a store. No domain knowledge. |
| **organism** | A distinct section of UI. Owns state, composes molecules.            |
| **template** | Layout and slots. Never fetches.                                     |
| **page**     | A feature's `pages/`. Real data meets a template.                    |

Charts specifically: `--chart-1..5` is a **validated** colourblind-safe palette
in fixed order. Never add, reorder or hand-pick a hue — re-run the validator.
Five series is the cap; past that fold into "Other" or use small multiples.

## Hard rules

- **NEVER hand-write a component the registry already has.** Check
  `npx shadcn@latest add` first; the shadcn MCP lets you search it directly.
- **NEVER hand-create a feature, page, component or hook.** Run `npm run gen`.
  Generated code has a known shape, which is what makes it migratable later.
- **NEVER hand-write an API response type.** Import from `src/lib/api/generated`.
  If a field is missing, STOP and report it — do not invent fields.
- **NEVER call `fetch` directly.** Use `api` from `@/lib/api-client` (lint-enforced).
- **NEVER use `any`, `as any`, `@ts-ignore`, or `!` non-null assertions.**
- **NEVER add `eslint-disable` without an issue link** explaining it.
- **NEVER hardcode a user-facing string.** `t('ns.key')`, and add the key to
  every locale (`TODO:<locale>` where untranslated).
- **NEVER hardcode a colour, radius or spacing value.** Use `@theme` tokens:
  `bg-surface`, `text-muted-foreground`, `rounded-card`. No `dark:` colour
  variants — roles already change per scheme.
- **NEVER import across features**, and never deep-import another layer's internals.
- **ALWAYS handle all four states** on every async surface: loading, error,
  empty, populated. Use the `molecules` states.
- **ALWAYS run `npm run verify`** before reporting work complete.

## Definition of done

`npm run verify` green · E2E spec for the happy path · zero critical/serious axe
violations · a `.stories.tsx` per component (import CSF types from `@storybook/react-vite`,
add `tags: ['autodocs']`) and a test per hook and api module ·
`npm run visual` clean (or baselines intentionally updated) ·
`specs/<feature>/tasks.md` fully ticked ·
`specs/<feature>/review.md` has real `## Automated verification` results

## Workflow

Eleven stages: `react-constitution` → `react-roadmap` → `react-feature` →
`react-spec` → `react-clarify` → `react-implement` → `react-verify` →
`react-analyze` → `react-review` → `react-ship` → `react-merge`. Skills live in `.agents/skills/`.
`react-dev status` says which stage each feature is at. Never resolve a
`[NEEDS CLARIFICATION]` marker by guessing.

### Always end with what to do next

**Every reply ends with a `Next` block and nothing after it** — no summary, no
closing remark. The user reads only that block to decide what to run:

1. **What now exists** — one line: paths, counts, the verdict.
2. **`Do next:` one exact command**, never a menu. Use this host's form:
   `/react-spec` (Claude Code), `$react-spec` (Codex), `/react:spec` (Gemini).
3. **At most one branch** — "gate red? fix and re-run". Two is a menu, and a menu
   is not an answer.

Each skill's `## Next` has its exact wording. Did work outside a skill? Write the
block anyway.

## Learned rules

<!-- Owned by react-feedback. Appended when a correction recurs 3+ times. -->
<!-- Do not edit by hand. -->
