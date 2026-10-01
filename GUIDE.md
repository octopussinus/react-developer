# Building a frontend app with react-dev

A practical walkthrough: empty directory → shipped feature. Follow it in order
the first time; after that you will mostly live in step 5.

**Two kinds of instruction appear below.** `$ terminal` lines you run yourself.
`> agent` lines you type to Claude Code, Codex or Gemini CLI.

---

## 1. Before you start

| Need | Check |
|---|---|
| Node 20.19+ | `node -v` |
| One agent CLI | `claude` / `codex` / `gemini` |
| Both | `react-dev check` |

```bash
uv tool install react-developer --from https://github.com/Mil000D/react-developer.git
```

---

## 2. Create the project

```bash
react-dev init my-app          # all three agents wired
cd my-app
npm install
npm run verify                 # must be green BEFORE you build anything
```

If `npm run verify` is red on a fresh project, stop and report it — the floor is
broken and nothing you build on it can be trusted.

```bash
npm run dev                    # http://localhost:5173
```

You will see a near-empty page. That is correct: there is no demo content.

### What you just got

```
AGENTS.md              your rules — every agent reads this (CLAUDE.md, GEMINI.md link to it)
.agents/skills/        the 12 workflow skills
src/components/        atoms → molecules → organisms → templates
src/features/          empty. your code goes here, one folder per feature
src/lib/               api client, query client, theme, cn
specs/                 one folder per feature: spec, tasks, review
.ai/                   the feedback loop
eslint-rules/          where a repeated correction becomes a lint rule
```

### Only target some agents

```bash
react-dev init my-app --agent claude --agent codex
```

---

## 3. Point your agent at it

| Agent | Setup | How you invoke a skill |
|---|---|---|
| **Claude Code** | none — `.mcp.json` and `.claude/skills/` are already there | `/react-verify` |
| **Codex** | copy the TOML from `MCP.md` into `~/.codex/config.toml` | `$react-verify` |
| **Gemini CLI** | `npx shadcn@latest mcp init --client gemini` | `/react:verify` |

Examples below use Claude Code's `/name`. Translate the prefix for your agent.

Sanity check:

```
> /react-verify
```

It should run the gates and report a table. If it just *talks* about verifying
without running anything, your agent has not picked up the skills — run
`react-dev doctor`.

---

## 4. Write your rules once

```
> /react-constitution
```

It reads your actual stack and writes `AGENTS.md`. **Then open it and edit.**
This is the single highest-leverage file in the project: it is in context for
every piece of work, including ordinary chat that never touches a skill.

Keep it under 8 KB. Codex stops reading past its limit, and long rules get
skimmed by everyone.

Add your own absolutes. Good rules are checkable:

```markdown
- NEVER call an endpoint not in openapi.json. Stop and ask.
- ALWAYS use `useZodForm` for forms. No manual useState form state.
- Money is always minor units (integer cents). Never a float.
```

---

## 4b. Design the pages first, then roadmap them

The intended flow: **design in [Stitch](https://stitch.withgoogle.com) → roadmap →
feature → build against mocks.**

Connect Stitch once. It is not pre-wired because the credential must not be
committed — `-s user` keeps it in `~/.claude.json`, outside the repo:

```bash
claude mcp add stitch --transport http https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: YOUR_KEY" -s user

claude mcp get stitch        # expect: ✔ Connected
```

Gemini CLI and Codex snippets are in `MCP.md`.

**Push your tokens into Stitch; do not extract its tokens afterwards.** Write a
`DESIGN.md` from `src/styles/index.css`, then `upload_design_md` →
`create_design_system_from_design_md`, and pass that design system to every
`generate_screen_from_text`. Screens then arrive already on your palette —
nothing to reconcile, and no reason to hardcode a hex.

Then:

```
> /react-roadmap
```

It inventories your screens (`list_screens` / `get_screen`), checks whether they
were designed against your tokens (`list_design_systems`), maps screens to
features, and — critically — **specifies the mock data each feature needs**.

**A screen is not a feature.** Several screens of one domain are one feature; one
screen spanning three domains is three. Screens sharing a data shape must live
together, because a feature cannot import a sibling.

**No Stitch?** It works from a written brief too:

```
> /react-roadmap  docs/brief.md
```

It reads the whole thing, inventories what already exists, and writes
`specs/ROADMAP.md` with four sections:

| Section | What it holds |
|---|---|
| **Prerequisites** | blocking decisions that are *not* features — API contract, auth, permissions, tokens, locales |
| **Features** | one row per slice: slug, what the user can do, dependencies, size (S/M/L) |
| **Shared components** | tables, charts, pickers — these go to an atomic layer or the registry, never a feature |
| **Mock data** | per feature: entities, fields, the extremes the design must survive, which states |
| **Open questions** | `[NEEDS CLARIFICATION]` at plan level, and the out-of-scope list |

It writes the roadmap and **stops** — no branches, no code. Review it; the
decomposition is the most expensive thing to get wrong.

**It will push back on your splits.** Asked for `order-list` and `order-detail`
as separate features, it merges them: they share one schema and one `api/`
module, so splitting them forces a cross-feature import that lint forbids. Split
by **domain**, not by screen. Anything sized **L** it refuses to start until you
split it.

Then work the list one at a time:

```
> /react-feature 1
```

`react-feature` reads that entry, takes its slug and dependencies from the
roadmap, warns you if its prerequisites are not done, and marks it in progress.

**No brief?** Skip this and just name the feature: `/react-feature order tracking`.

---

## 5. The loop — one feature, start to finish

This is the whole method. Seven steps, and you can skip 3 if there is no design.

```
feature → [prototype] → spec → clarify → implement → verify → analyze
```

### 5.1 Open the feature

```
> /react-feature order tracking      # or: /react-feature 1 (from the roadmap)
```

Creates branch `001-order-tracking`, folder `specs/001-order-tracking/`, and runs
the generator. Expect to see roughly:

```
create   src/features/order-tracking/api/use-order-tracking-list.ts
create   src/features/order-tracking/pages/order-tracking-page.tsx
create   src/features/order-tracking/index.ts
create   src/locales/{en,pl}/order-tracking.json
modify   src/config/routes.ts
```

**Never create these by hand.** Generated code has a known shape, which is what
lets `react-dev sync` migrate it later.

### 5.2 Prototype — pulled from Stitch, or drawn

```
> /react-prototype
```

**Designed in Stitch?** It fetches the screen with `get_screen` into
`specs/001-order-tracking/`, then **translates** rather than keeping it: raw values
→ role tokens, repeated blocks → `src/components/*`, plus the empty/loading/error
states Stitch never shows.

**No design?** It draws the prototype using **your project's own Tailwind build
and tokens**, so what you approve is what gets built. View it at
`http://localhost:5173/specs/001-order-tracking/prototype.html`.

Look at it. Cheapest possible moment to change your mind.

### 5.3 Spec it

```
> /react-spec
```

Produces `spec.md` with every unknown marked inline:

```markdown
3. The list shows 20 orders per page.
   [NEEDS CLARIFICATION: cursor or offset pagination? the API contract shows neither]
```

**Markers are the point.** A spec with twelve honest markers beats a confident
one that invented twelve answers. Read them — they are the questions you would
otherwise discover in review.

### 5.4 Answer the questions

```
> /react-clarify
```

Up to five questions, one at a time, each with concrete options and a
recommendation. Answers are written into the spec, so the decision is recorded
rather than remembered.

"You decide" is a valid answer — it gets recorded as an assumption.

### 5.5 Implement

```
> /react-implement
```

The agent calls the generator for structure and writes only the logic. It ticks
`tasks.md` as it goes.

### 5.6 Verify — do not skip this

```
> /react-verify
```

Runs everything and reports what it actually ran:

| Gate | What it catches |
|---|---|
| format, lint | wrong layer, `any`, raw colours, cross-feature imports |
| types | `tsc -b` with `noUncheckedIndexedAccess` |
| unit | logic regressions |
| dead code, duplicates | orphaned exports, copy-paste |
| locale parity | a key missing from any language |
| e2e | the happy path actually works |
| a11y | zero critical/serious axe violations |
| visual | pixels you did not mean to change |

A gate it did not run must be reported as `not run`. If it claims a pass without
output, push back.

### 5.7 Final read

```
> /react-analyze
```

Read-only. Checks the code against the spec and `AGENTS.md`: unimplemented
requirements, scope creep, surviving `[NEEDS CLARIFICATION]`, missing states.
Reports; never fixes.

Then open the PR. `specs/001-order-tracking/` goes with it, so a reviewer sees
what was agreed and what was built in one diff.

---

## 6. Worked example

Building an orders screen, exactly as typed:

```
$ react-dev init shop && cd shop && npm install && npm run verify
$ npm run dev

> /react-feature orders
> /react-prototype  a table of orders: id, customer, total, status badge, and a
                    status filter. include empty and loading states.
```

*(look at the prototype, ask for changes, iterate)*

```
> /react-spec
> /react-clarify
```

*(answers: cursor pagination; status is one of pending|paid|failed; filter is
client-side for now)*

```
> I'll need a sortable table. Check the registry first.
```

The agent runs `npx shadcn@latest add @react-dev/data-table` — it lands in
`src/components/organisms/` with its own story and tests, and pulls no
dependency you did not need.

```
> /react-implement
> /react-verify
> /react-analyze
$ git push -u origin 001-orders
```

Second feature: `/react-feature invoices`. Same loop. The orders code is
untouched, because a feature cannot import a sibling — lint stops it.

---

## 7. Common tasks

### Add a component

Check the registry before writing one:

```bash
npx shadcn@latest add select                 # primitive → src/components/atoms/
npx shadcn@latest add @react-dev/chart       # → src/components/molecules/
npx shadcn@latest add @react-dev/data-table  # → src/components/organisms/
```

Each lands in the right atomic layer automatically, brings its own story and
test, and installs its dependency only then. The shadcn MCP is configured, so
you can also just say:

```
> add a date picker
```

**Nothing in the registry?** Let the skill decide where it goes:

```
> /react-component a date range filter
```

It checks what exists first, then picks between feature-local and shared, then
the layer, then generates. Or do it yourself:

```bash
# used by ONE feature -- start here when unsure
npm run gen -- component orders OrderCard

# used by TWO or more -- a shared atomic layer
npm run gen -- atom     Chip
npm run gen -- molecule DateRangeFilter
npm run gen -- organism FilterBar
npm run gen -- template AuthLayout
```

Each writes the component, a **test**, a **story** and the barrel export.

| Layer | Test | May import |
|---|---|---|
| **atom** | props only — no store, no fetch, no `t()`, no router | `lib`, `types` |
| **molecule** | composes atoms; may translate and read a store | atoms + above |
| **organism** | a section of UI; owns state, composes molecules | molecules + above |
| **template** | layout and slots; never fetches | organisms + above |
| **page** | a feature's `pages/` — real data meets a template | anything shared |

Get it wrong and `npm run lint` names both layers in the error.

A component that knows what an *Order* is belongs in a **feature**, however
reusable its markup looks.

### When a component graduates

A second feature needs it? **Promote it, never copy it:**

```bash
npm run gen -- promote orders OrderCard --to=molecule
```

```
move     src/features/orders/components/order-card.tsx -> src/components/molecules/order-card.tsx
move     order-card.test.tsx, order-card.stories.tsx
modify   order-card.stories.tsx          # title: Orders/OrderCard -> Molecules/OrderCard
rewrite  src/features/orders/pages/orders-page.tsx   # -> '@/components/molecules'
modify   src/components/molecules/index.ts
```

It moves the component with its test and story, retitles the story, rewrites
**every** importer to the barrel, and updates the barrel. By hand, this is where
one importer gets left on the old path and nobody notices until build time.

Afterwards, check it no longer reads domain state — a shared layer must not know
your domain. Lift the domain bits into props.

### Change something you already built

```
> /react-update the status filter should also allow 'refunded'
```

Maps the blast radius first, updates the spec if behaviour changed, updates tests
in the same pass.

### Add a language

```
> /react-i18n add German
```

Mirrors every namespace, marks anything uncertain `TODO:de`, and `npm run
i18n:check` fails if a key is missing anywhere.

### Change the look

```
> /react-theme make the primary colour our brand teal
```

Edits tokens in `src/styles/index.css`, both schemes, with contrast ratios
reported. Every component picks it up — no component edits.

Those token names are **shadcn's vocabulary on purpose**. Rename one and every
future `shadcn add` breaks.

### Mock data — build the whole frontend with no backend

`npm run gen -- feature orders` already wrote an MSW handler and a factory and
registered them. `npm run dev` therefore shows **realistic data immediately**,
before any API exists.

```
src/testing/mocks/
├── handlers/
│   ├── index.ts      the ONE composed list
│   └── orders.ts     happy path for this domain
├── factories/
│   └── orders-item.ts  buildOrdersItem(overrides) + buildOrdersItemList(n)
├── browser.ts        dev + Storybook
└── server.ts         Vitest
```

**One list, three environments** — dev, Storybook and tests all consume the same
handlers, so they cannot drift and you never test something you do not run.

**Your job: make the factory produce the extremes.** The generated stub is
minimal on purpose:

```ts
export const orderWithLongName = () => buildOrder({ customer: 'ü'.repeat(90) });
export const orderAtZero = () => buildOrder({ total: 0 });
export const orderMinimal = () => buildOrder({ refundedAt: null });
```

A factory that only makes tidy data hides every layout bug — and a screenshot
will not find it later.

**Keep default handlers to the happy path.** A 500 in `handlers/orders.ts` breaks
every other test. Unhappy paths are per-test overrides:

```ts
server.use(http.get('*/orders', () => HttpResponse.json(null, { status: 500 })));
```

The generated api test already does this for success, 500 and empty.

**Another entity in the same feature:**

```bash
npm run gen -- mock orders Invoice
```

**Switch mocks off** once an API is reachable: `VITE_ENABLE_MOCKS=false` in
`.env.local`.

More in `src/testing/mocks/README.md`.

### Connect a real API

```bash
cp your-openapi.json openapi.json
npm run api:generate
```

Now response types are generated, and `AGENTS.md` forbids hand-writing them. If
a field is missing the agent must stop and say so instead of inventing it — the
most expensive AI frontend bug class, closed.

### See every component state — Storybook

```bash
npm run storybook        # http://localhost:6006
npm run build-storybook  # static site for a PR or a reviewer
```

**What you get.** A sidebar that mirrors the atomic layers, so the catalogue
*is* the design system:

```
Atoms/Badge          Neutral · Success · Warning · Danger
Atoms/Button         Primary · Secondary · Ghost · Danger · Loading · Disabled · LongLabel
Molecules/FormField  Default · WithHint · WithError · Disabled
Molecules/States     Loading · Empty · Error
```

**You rarely write a story by hand.** `npm run gen -- component <feature> <Name>`
writes one next to the component:

```tsx
const meta = {
  title: 'Orders/OrderCard',
  component: OrderCard,
  tags: ['autodocs'],          // generates a props-table docs page
} satisfies Meta<typeof OrderCard>;

export const Default: Story = {};
// TODO: add a story per state -- loading, empty, error, long content.
```

Dev server picks it up immediately — no registration anywhere.

**Your job is that TODO.** A story per *state*, not per component:

| Story | Why it earns its place |
|---|---|
| `Default` | the happy path |
| `Loading` / `Empty` / `Error` | the three states reviews most often catch as missing |
| `LongContent` | `'ü'.repeat(80)` — where layouts actually break |
| `Disabled` | if it is interactive |

**Light and dark.** The toolbar has a Theme switch. It toggles the `.dark` class
on `<html>` — the same mechanism the app uses, not a Storybook-only emulation —
so what you see is what ships. Review both before approving anything.

**Types come from the framework package**, which is Storybook 10's convention:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
```

Not `@storybook/react`, and do not add that package to `package.json` — the
framework re-exports it.

**Never name a story `Error`.** `export const Error` shadows the global `Error`
constructor in that module. Use `Failed` with `name: 'Error'`.

**Components from the registry arrive with their stories already written** —
`shadcn add @react-dev/chart` brings `chart.stories.tsx` and `chart.test.tsx`.

**Where it fits the loop.** `/react-verify` runs the automated gates; Storybook
is the *human* gate. Build it for the PR and a reviewer can see every state in
both schemes without checking out your branch — which is the whole point of
`AGENTS.md` requiring a story per component.

---

## 8. The feedback loop

The part that makes the project improve instead of repeating itself.

**Spot something wrong on screen** → click **Feedback** (bottom-right, dev only)
→ click the element → type what is wrong. The agent receives the exact
`file:line`, the component, computed styles and your words, in `.ai/inbox/`.

**Then:**

```
> /react-feedback
```

It logs each correction with a category and a count, and at **three or more
occurrences** proposes a promotion:

| Kind | Becomes |
|---|---|
| mechanically checkable | an ESLint rule in `eslint-rules/` + a test → can never recur |
| a judgment call | one line in `AGENTS.md` under `## Learned rules` |
| a missing capability | a GitHub issue — a gap is not fixed by a rule |

It asks before adding a lint rule, because that fails CI for everyone.

Feedback typed into a chat window lasts one session. Feedback in a lint rule
lasts the project. That ladder is the whole idea.

---

## 9. When something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Agent "verifies" without running anything | skills not loaded | `react-dev doctor` |
| `/react-...` not found | wrong prefix for your agent | Codex `$name`, Gemini `/react:name` |
| Blank page on `npm run dev` | env validation threw | the console names the missing var; `.env.development` has dev defaults |
| `boundaries/element-types` error | component in the wrong layer | move it; the message names both layers |
| `boundaries/entry-point` error | deep-imported another feature | import from its `index.ts`, or promote the shared part |
| `npm run visual` fails | pixels changed | look at `test-results/`. Intended? `npm run visual:update` |
| `i18n:check` fails | key missing in a locale | add it everywhere, `TODO:<lang>` if untranslated |
| `knip` flags a file | genuinely unused | delete it, or add an entry in `knip.json` with a reason |
| Agent wants `any` / `@ts-ignore` | it is stuck | ask it to explain the type error. Do not grant the exception |
| `shadcn add` keeps adding a `cn` package | upstream dependency | safe to remove; your `@/lib/cn` already provides it |

**Health check any time:**

```bash
react-dev doctor        # 19 invariants
react-dev sync          # reinstall skills + agent wiring; never touches AGENTS.md
```

---

## 10. The rhythm

**Per feature:** `feature → [prototype] → spec → clarify → implement → verify → analyze`

**Before every PR:**

- [ ] `npm run verify` green
- [ ] `npm run e2e` and `npm run a11y` green
- [ ] `npm run visual` green, or baselines intentionally updated
- [ ] `specs/<feature>/tasks.md` fully ticked
- [ ] `specs/<feature>/review.md` has real automated results
- [ ] `/react-analyze` says ready

**Weekly:** `/react-feedback` to promote what keeps recurring.

---

## 11. Four things not to do

1. **Do not hand-create a feature, page, component or hook.** Use `npm run gen`.
   Hand-made structure is structure nothing can migrate later.
2. **Do not let a gate be silenced.** No skipped test, no `eslint-disable`
   without an issue link, no lowered threshold. If a rule genuinely blocks
   correct code, change the rule deliberately — in a commit of its own.
3. **Do not resolve a `[NEEDS CLARIFICATION]` by guessing.** That is the one
   failure that propagates silently into code *and* tests.
4. **Do not accept "done" without gate output.** A gate that was not run is not
   a gate. This is the single most useful habit on the list.

---

## Reference

| Doc | For |
|---|---|
| `AGENTS.md` | your rules. Edit this first |
| `README.md` | what the project is |
| `.ai/README.md` | the feedback loop in detail |
| `specs/README.md` | the per-feature folder layout |
| `MCP.md` | MCP setup per agent |
| `eslint-rules/README.md` | writing a promoted rule |
| `ENTERPRISE-READINESS-AUDIT.md` | why any of this is shaped the way it is |
