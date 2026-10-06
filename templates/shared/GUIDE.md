# Building a frontend app with react-dev

A practical walkthrough: empty directory → shipped feature. Follow it in order
the first time; after that you will mostly live in step 5.

**Two kinds of instruction appear below.** `$ terminal` lines you run yourself.
`> agent` lines you type to Claude Code, Codex or Gemini CLI.

---

## 1. Before you start

| Need          | Check                         |
| ------------- | ----------------------------- |
| Node 20.19+   | `node -v`                     |
| One agent CLI | `claude` / `codex` / `gemini` |
| Both          | `react-dev check`             |

```bash
uv tool install react-developer --from https://github.com/octopussinus/react-developer.git
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
src/modules/           empty. your code: modules/<module>/<page>/
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

| Agent           | Setup                                                      | How you invoke a skill |
| --------------- | ---------------------------------------------------------- | ---------------------- |
| **Claude Code** | none — `.mcp.json` and `.claude/skills/` are already there | `/react-verify`        |
| **Codex**       | copy the TOML from `MCP.md` into `~/.codex/config.toml`    | `$react-verify`        |
| **Gemini CLI**  | `npx shadcn@latest mcp init --client gemini`               | `/react:verify`        |

Examples below use Claude Code's `/name`. Translate the prefix for your agent.

Sanity check:

```
> /react-verify
```

It should run the gates and report a table. If it just _talks_ about verifying
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

**The output is split, not one big file**, because building one feature should not
mean reading the plan for all of them:

```
specs/
├── ROADMAP.md              the index: table, order, tracks, shared components  (~80 lines)
└── roadmap/
    ├── prerequisites.md    the blocking decisions
    ├── decisions.md        answered questions, and why each split was made
    ├── canonical-records.md  one seeded value set so no two screens disagree
    └── NNN-<slug>.md       per feature: behaviour, mock data, its own questions
```

`react-feature 2` reads the index plus **only** `roadmap/002-*.md`. On a 15-feature
plan that is ~160 lines instead of ~530 — and it cannot blend a neighbouring
feature's mock data into yours, which is the actual failure a single file causes.
Each feature's open questions live in its own file too, so `react-clarify` never
has to sweep the whole plan.

It ends by telling you how many open questions there are and which ones block
feature 1 — not by printing all of them. Use `/react-clarify` to decide those
one at a time.

**A screen is not a feature.** Several screens of one domain are one feature; one
screen spanning three domains is three. Screens sharing a data shape must live
together, because a feature cannot import a sibling.

**No Stitch?** It works from a written brief too:

```
> /react-roadmap  docs/brief.md
```

It reads the whole thing, inventories what already exists, and writes
`specs/ROADMAP.md` with four sections:

| Section               | What it holds                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **Prerequisites**     | blocking decisions that are _not_ features — API contract, auth, permissions, tokens, locales |
| **Features**          | one row per slice: slug, what the user can do, dependencies, size (S/M/L)                     |
| **Shared components** | tables, charts, pickers — these go to an atomic layer or the registry, never a feature        |
| **Mock data**         | per feature: entities, fields, the extremes the design must survive, which states             |
| **Open questions**    | `[NEEDS CLARIFICATION]` at plan level, and the out-of-scope list                              |

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

This is the whole method: stages 3 to 11 of the pipeline, repeated once per
feature.

```
 3 feature → 4 spec → 5 clarify → 6 implement
                                       ↓
 11 merge ← 10 ship ← 9 review ← 8 analyze ← 7 verify
     └─────────── back to 3 for the next feature
```

`react-spec` is where the design enters: if the screen was designed in Stitch it
fetches it there and translates it into your tokens. There is no separate
prototype step.

Lost your place? `react-dev status` derives it from the files and from git:

```
   #  Feature        Pipeline    Stage        Next
●  1  landing        ━━━━━━━━    merged
◐  2  dog-profile    ━━━━┄┄┄┄    clarified    react-implement
○  3  weight         ━┄┄┄┄┄┄┄    planned      react-feature 3

In flight: 2 dog-profile — 6 unticked tasks. Next: react-implement
```

### Clearing context — three moments, and no others

The agent cannot clear its own context; `/clear` is yours to run. Three places
in the pipeline are real boundaries, and the three skills that end there say so:

| After                 | Why the previous conversation is dead weight                       |
| --------------------- | ------------------------------------------------------------------ |
| `/react-constitution` | The rules are in `AGENTS.md`, which every agent reads on its own   |
| `/react-roadmap`      | The plan is in `specs/`; planning a product is a long conversation |
| `/react-merge`        | The feature is landed and everything about it is on disk           |

The test is the one from Anthropic's own guidance: **would you brief a new
teammate on the previous task before asking them to start this one?** After a
merge — no. Mid-feature — obviously yes, which is why nothing between
`react-feature` and `react-ship` ever suggests it. Clearing there throws away the
spec decisions, the clarifications and what was already tried, and the agent
re-derives them worse.

**Within one feature, use `/compact`, not `/clear`** — and run it around 60% of
the context, not at 95%. At 60% there is room for a good summary; at 95% the
automatic one is squeezed until detail is lost. You can aim it:

```
/compact keep the spec decisions and the failing test
```

Order matters: clear **before** the next command, not after.

### The agent clearing context by itself

It cannot clear _its own_ thread — nothing can, from inside a session. But it can
run work in a **fresh, isolated context without being asked**, and three stages
do exactly that:

| Stage           | Why it runs isolated                                                                     |
| --------------- | ---------------------------------------------------------------------------------------- |
| `react-verify`  | The gate prints hundreds of lines nobody needs afterwards; the results go to `review.md` |
| `react-analyze` | Reads the spec and every touched file, returns findings, not files                       |
| `react-review`  | Worth more _because_ it has not sat through the decisions that produced the code         |

They are subagents (`.claude/agents/*.md`), each preloading its own skill. Claude
delegates to them on its own, each starts with an empty context, and only a short
verdict comes back. The main conversation stays about the feature.

Nothing between `react-feature` and `react-ship` is a subagent, and that is
deliberate: `react-clarify` asks one question at a time and waits for you, and
`react-spec`/`react-implement` are the work itself. Isolating those would cut you
out of the loop the pipeline exists to keep you in.

The read-only two have **no write tools**, so a finding cannot be quietly
repaired inside the analysis that found it.

### Doing it manually, or per feature

`/clear` cannot be automated from inside a session. Every hook output field is
decision control or context injection; `PreCompact` can _block_ compaction but
not start one, and nothing can trigger `/clear`. Checked against the hooks
reference, not assumed.

A new **process** can, which is what this does:

```bash
react-dev next
```

It reads where the pipeline is, then `exec`s a fresh agent session already
pointed at the next command. The clean slate is structural — you cannot forget
it at the wrong moment.

It works at any stage, because every stage reads its input from `specs/` — which
is also the limit, and it says so: **only what is on disk carries over.** At a
feature boundary it tells you nothing is needed from the last one; mid-feature it
warns that anything you agreed in chat and did not write down is lost.

### Read the last block, ignore the rest

Every skill ends with a `Next` block, and nothing comes after it:

```
> Stage 4 of 11 complete. spec.md written — 7 [NEEDS CLARIFICATION] markers.
> Do next: /react-clarify — resolves them one at a time, as a choice list.
> Zero markers? /react-implement directly.
```

Three lines, always in that order: **what now exists**, **the one command to
run**, and **at most one branch** if the result could go two ways. Never a menu —
if you are looking at a list of options, something went wrong.

So in practice you can read only that block and keep going. The stages exist so
the agent can also **stop**: `react-ship` refuses on red gates, `react-merge`
refuses on an unreviewed PR. A refusal arrives in the same block, with the
command that fixes it.

### 5.1 Open the feature

```
> /react-feature order tracking      # or: /react-feature 1 (from the roadmap)
```

Creates branch `001-order-tracking`, folder `specs/001-order-tracking/`, and runs
the generator. Expect to see roughly:

```
create   src/modules/order-tracking/api/use-order-tracking-list.ts
create   src/modules/order-tracking/pages/order-tracking-page.tsx
create   src/modules/order-tracking/index.ts
create   src/locales/{en,pl}/order-tracking.json
modify   src/config/routes.ts
```

**Never create these by hand.** Generated code has a known shape, which is what
lets `react-dev sync` migrate it later.

### 5.2 Spec it

```
> /react-spec
```

**Designed in Stitch?** This is where it enters. The skill fetches the screen
with `get_screen` into `specs/001-order-tracking/design/`, then **translates**
rather than copying it: raw hex values → role tokens, repeated blocks →
`src/components/*`, plus the empty/loading/error states Stitch never shows. A
colour your `@theme` cannot express is listed under `## Tokens needed` for
`/react-theme` to add once — never hardcoded per component.

**No Stitch screen?** It works from your description and marks the layout
decisions as questions instead of inventing them.

Either way it produces `spec.md` with every unknown marked inline:

```markdown
3. The list shows 20 orders per page.
   [NEEDS CLARIFICATION: cursor or offset pagination? the API contract shows neither]
```

**Markers are the point.** A spec with twelve honest markers beats a confident
one that invented twelve answers. Read them — they are the questions you would
otherwise discover in review.

### 5.3 Answer the questions

```
> /react-clarify
```

**One question per message, as a multiple-choice list**, with a recommendation
and what each option costs:

```
Brand tokens. The design is terracotta/cream; the codebase is still template blue.

1. Adopt the design into @theme  (recommended — the codebase has no brand to
   protect, and 12 screens already use this one)
2. Push the codebase tokens into Stitch and restyle the 12 screens
3. Adopt now, then mirror back so future screens generate correct
```

In Claude Code this renders as a proper option picker you can click. Each answer
is written into the file before the next question is asked, so decisions are
recorded rather than remembered.

**It asks at most 5 per run, and only what blocks the next feature.** A roadmap
can easily have 16 open questions; the ones about checkout do not need answers
before the landing page is built. The rest stay marked and come up when their
feature does — so you are never handed a wall of questions.

"You decide" is a valid answer; it gets recorded as an assumption, with a note on
what would have to change if it turns out wrong.

Run it again any time to work through more.

### 5.4 Implement

```
> /react-implement
```

The agent calls the generator for structure and writes only the logic. It ticks
`tasks.md` as it goes.

### 5.5 Verify — do not skip this

```
> /react-verify
```

Runs everything and reports what it actually ran:

| Gate                  | What it catches                                        |
| --------------------- | ------------------------------------------------------ |
| format, lint          | wrong layer, `any`, raw colours, cross-feature imports |
| types                 | `tsc -b` with `noUncheckedIndexedAccess`               |
| unit                  | logic regressions                                      |
| dead code, duplicates | orphaned exports, copy-paste                           |
| locale parity         | a key missing from any language                        |
| e2e                   | the happy path actually works                          |
| a11y                  | zero critical/serious axe violations                   |
| visual                | pixels you did not mean to change                      |

A gate it did not run must be reported as `not run`. If it claims a pass without
output, push back.

### 5.6 Final read

```
> /react-analyze
```

Read-only. Checks the code against the spec and `AGENTS.md`: unimplemented
requirements, scope creep, surviving `[NEEDS CLARIFICATION]`, missing states.
Reports; never fixes.

### 5.7 Review the code

```
> /react-review
```

Reads the diff and reports React defects the gates cannot see: a response applied
without checking it is still the current request, a `key={i}` on a list that
filters, a `setInterval` capturing the first render's state, focus going nowhere
after a dialog closes. Findings land in `specs/001-order-tracking/review.md` with
a severity, and an unticked `**blocker**` stops `/react-merge`.

It is deliberately strict about what it will **not** report: anything ESLint,
`tsc`, axe or `/react-analyze` already fails the build on. That exclusion list is
why it produces a handful of real findings instead of forty plausible ones.

Works identically in all three agents — nothing here depends on a host command.

### 5.8 Ship it

```
> /react-ship
```

Commits with a conventional message referencing the spec, pushes the branch and
opens the PR — `specs/001-order-tracking/` goes with it, so a reviewer sees what
was agreed and what was built in one diff. With no git remote it says so and
prepares a local merge instead.

It **refuses** if the gates are red, if `tasks.md` still has unticked boxes, if
`review.md` has no recorded results, if a `[NEEDS CLARIFICATION]` survived, or
if files you did not expect are staged. That refusal is the point: it is the
last place a half-finished feature can be caught before a human spends time on
it.

`react-ship` attaches the review from 5.7 to the PR, so a human starts from what
was already found. In Claude Code you can also run `/code-review` for a second
opinion — but nothing in the pipeline requires it.

### 5.9 Land it

```
> /react-merge
```

Checks the PR is green (`gh pr checks`), that a review actually happened, and
that no `**blocker**` in `review.md` is unresolved. Then squash-merges, deletes
the branch, **ticks the roadmap entry with the merge sha**, and tells you what
that unblocked.

If the review taught the project something general, it runs `react-feedback` so
the lesson becomes a rule instead of a comment nobody reads again.

It never deletes `specs/001-order-tracking/`. That folder is the record of why
the code looks the way it does.

> If you rebase or merge the base branch in after verifying, the gate run is
> stale. Re-run `/react-verify`. `react-merge` checks for this.

---

## 6. Worked example

Building an orders screen, exactly as typed:

```
$ npm install && npm run verify
$ npm run dev

> /react-feature orders
> /react-spec  a table of orders: id, customer, total, status badge, and a
               status filter. include empty and loading states.
```

_(read the markers; they are the questions review would have found)_

```
> /react-clarify
```

_(answers: cursor pagination; status is one of pending|paid|failed; filter is
client-side for now)_

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
> /react-review
> /react-ship
```

_(the PR is open; get it reviewed)_

```
> /code-review
> /react-merge
```

`react-merge` ticks the roadmap entry with the merge sha and says what that
unblocked — which is the next feature you run.

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
npm run gen -- component orders list OrderCard

# used by TWO or more -- a shared atomic layer
npm run gen -- atom     Chip
npm run gen -- molecule DateRangeFilter
npm run gen -- organism FilterBar
npm run gen -- template AuthLayout
```

Each writes the component, a **test**, a **story** and the barrel export.

| Layer        | Test                                                 | May import        |
| ------------ | ---------------------------------------------------- | ----------------- |
| **atom**     | props only — no store, no fetch, no `t()`, no router | `lib`, `types`    |
| **molecule** | composes atoms; may translate and read a store       | atoms + above     |
| **organism** | a section of UI; owns state, composes molecules      | molecules + above |
| **template** | layout and slots; never fetches                      | organisms + above |
| **page**     | a feature's `pages/` — real data meets a template    | anything shared   |

Get it wrong and `npm run lint` names both layers in the error.

A component that knows what an _Order_ is belongs in a **feature**, however
reusable its markup looks.

### When a component graduates

A second feature needs it? **Promote it, never copy it:**

```bash
npm run gen -- promote orders list OrderCard --to=module
```

```
move     src/modules/orders/components/order-card.tsx -> src/components/molecules/order-card.tsx
move     order-card.test.tsx, order-card.stories.tsx
modify   order-card.stories.tsx          # title: Orders/OrderCard -> Molecules/OrderCard
rewrite  src/modules/orders/pages/orders-page.tsx   # -> '@/components/molecules'
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

`npm run gen -- feature orders list` already wrote an MSW handler and a factory and
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
npm run gen -- mock orders-list Invoice
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

**More than one backend?** Adding one is an `.env` change and nothing else:

```bash
VITE_API_URL=https://api.example.com
VITE_API_URLS={"auth":"https://auth.example.com","payments":"https://pay.example.com"}
```

```ts
import { api, apiFor } from '@/lib/api-client';

await api.get('/orders'); // the default API
await apiFor('auth').post('/sessions', c); // a named one
```

Both go through the same client, so timeouts, `ApiError` normalisation and the
ban on raw `fetch` apply equally. A name that is not configured throws at the
call site naming the ones that are, rather than requesting `undefined/sessions`
and failing as a confusing 404. The JSON is validated at startup, so a typo in a
URL breaks the boot, not the first request that happens to use it.

Two things that are easy to forget: each backend needs **its own MSW handlers**
while mocks are on (handlers match the full URL), and a second OpenAPI contract
needs its own config — `openapi-ts -f openapi-ts.auth.config.ts` with a
different `output.path`, since `defineConfig` takes one config, not a list.

### See every component state — Storybook

```bash
npm run storybook        # http://localhost:6006
npm run build-storybook  # static site for a PR or a reviewer
```

**What you get.** A sidebar that mirrors the atomic layers, so the catalogue
_is_ the design system:

```
Atoms/Badge          Neutral · Success · Warning · Danger
Atoms/Button         Primary · Secondary · Ghost · Danger · Loading · Disabled · LongLabel
Molecules/FormField  Default · WithHint · WithError · Disabled
Molecules/States     Loading · Empty · Error
```

**You rarely write a story by hand.** `npm run gen -- component <module> <page> <Name>`
writes one next to the component:

```tsx
const meta = {
  title: 'Orders/OrderCard',
  component: OrderCard,
  tags: ['autodocs'], // generates a props-table docs page
} satisfies Meta<typeof OrderCard>;

export const Default: Story = {};
// TODO: add a story per state -- loading, empty, error, long content.
```

Dev server picks it up immediately — no registration anywhere.

**Your job is that TODO.** A story per _state_, not per component:

| Story                         | Why it earns its place                               |
| ----------------------------- | ---------------------------------------------------- |
| `Default`                     | the happy path                                       |
| `Loading` / `Empty` / `Error` | the three states reviews most often catch as missing |
| `LongContent`                 | `'ü'.repeat(80)` — where layouts actually break      |
| `Disabled`                    | if it is interactive                                 |

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
is the _human_ gate. Build it for the PR and a reviewer can see every state in
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

| Kind                   | Becomes                                                      |
| ---------------------- | ------------------------------------------------------------ |
| mechanically checkable | an ESLint rule in `eslint-rules/` + a test → can never recur |
| a judgment call        | one line in `AGENTS.md` under `## Learned rules`             |
| a missing capability   | a GitHub issue — a gap is not fixed by a rule                |

It asks before adding a lint rule, because that fails CI for everyone.

Feedback typed into a chat window lasts one session. Feedback in a lint rule
lasts the project. That ladder is the whole idea.

---

## 9. When something goes wrong

| Symptom                                   | Cause                         | Fix                                                                    |
| ----------------------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| Agent "verifies" without running anything | skills not loaded             | `react-dev doctor`                                                     |
| `/react-...` not found                    | wrong prefix for your agent   | Codex `$name`, Gemini `/react:name`                                    |
| Blank page on `npm run dev`               | env validation threw          | the console names the missing var; `.env.development` has dev defaults |
| `boundaries/element-types` error          | component in the wrong layer  | move it; the message names both layers                                 |
| `boundaries/entry-point` error            | deep-imported another feature | import from its `index.ts`, or promote the shared part                 |
| `npm run visual` fails                    | pixels changed                | look at `test-results/`. Intended? `npm run visual:update`             |
| `i18n:check` fails                        | key missing in a locale       | add it everywhere, `TODO:<lang>` if untranslated                       |
| `knip` flags a file                       | genuinely unused              | delete it, or add an entry in `knip.json` with a reason                |
| Agent wants `any` / `@ts-ignore`          | it is stuck                   | ask it to explain the type error. Do not grant the exception           |
| `shadcn add` keeps adding a `cn` package  | upstream dependency           | safe to remove; your `@/lib/cn` already provides it                    |

## 9b. Updating react-dev

After upgrading the CLI, existing projects need a look. The two commands do
different jobs, and the difference matters:

```bash
react-dev doctor        # what is wrong
react-dev sync          # fix the half that can be fixed automatically
```

| `sync` **does** update                        | `sync` **never** touches                       |
| --------------------------------------------- | ---------------------------------------------- |
| `.agents/skills/` (new and changed skills)    | `package.json` scripts                         |
| `.claude/skills/`, `.gemini/commands/` wiring | `tools/gen/index.mjs`                          |
| `CLAUDE.md` / `GEMINI.md` links               | `src/`, `eslint.config.js`, anything you wrote |
| the version stamp in `.react-dev.json`        | `AGENTS.md` — your rules are yours             |

That is deliberate: sync must not clobber your code. But it leaves a trap — new
skills telling the agent to run `npm run gen -- mock` in a project whose
generator predates that target. The agent then runs a command that does not
exist.

**So `doctor` checks for capability drift**, not just agent wiring:

```
● cli version                 template stamped 0.9.0, CLI is 1.0.0
● npm run visual              missing - screenshot baselines (react-verify step 4)
● generator targets           missing: promote, mock
● src/testing/mocks/server.ts missing - MSW for Vitest
```

Run `sync` first — it clears the skill and version rows. Whatever remains is
**template** drift, and the fix is manual:

- **Few gaps:** copy the missing surface across from a freshly generated project.
- **Many gaps:** generate a new project and move your `src/modules/*/*` into it.
  The boundary lint rules will tell you exactly where each piece is allowed to
  live, so this is more mechanical than it sounds.

**Health check any time:** `react-dev doctor`

---

## 10. The rhythm

**Per feature:** `feature → spec → clarify → implement → verify → analyze →
review → ship → merge`

**Lost?** `react-dev status` — it reads the files and git, not a stored state,
so it is right even after you edit something by hand.

**Before every PR** — `/react-ship` checks all of this and refuses if any of it
fails, so this list is a description of its behaviour rather than a chore:

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
   failure that propagates silently into code _and_ tests.
4. **Do not accept "done" without gate output.** A gate that was not run is not
   a gate. This is the single most useful habit on the list.

---

## Reference

### The eleven stages

| #   | Command               | Produces                                             |
| --- | --------------------- | ---------------------------------------------------- |
| 1   | `/react-constitution` | `AGENTS.md`                                          |
| 2   | `/react-roadmap`      | `specs/ROADMAP.md` + `specs/roadmap/NNN-*.md`        |
| 3   | `/react-feature`      | branch, `specs/NNN-slug/`, generated feature slice   |
| 4   | `/react-spec`         | `spec.md` with `[NEEDS CLARIFICATION]` markers       |
| 5   | `/react-clarify`      | answers recorded in the spec, one question at a time |
| 6   | `/react-implement`    | code + tests + i18n, `tasks.md` ticked               |
| 7   | `/react-verify`       | `review.md` with real gate output                    |
| 8   | `/react-analyze`      | drift findings, read-only                            |
| 9   | `/react-review`       | findings in `review.md`, by severity                 |
| 10  | `/react-ship`         | commit, push, PR — refuses on red                    |
| 11  | `/react-merge`        | squash merge, roadmap ticked with the sha            |

Toolbox, called when needed: `/react-component`, `/react-publish`, `/react-parallel`,
`/react-feedback`,
`/react-update`, `/react-i18n`, `/react-theme`.

### Docs

| Doc                      | For                           |
| ------------------------ | ----------------------------- |
| `AGENTS.md`              | your rules. Edit this first   |
| `.ai/README.md`          | the feedback loop in detail   |
| `specs/README.md`        | the per-feature folder layout |
| `MCP.md`                 | MCP setup per agent           |
| `eslint-rules/README.md` | writing a promoted rule       |
