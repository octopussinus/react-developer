---
name: react-component
description: Create a component in the right place - or get it from the registry instead. Use when a component is needed, when deciding which atomic layer it belongs to, or when something inside a feature should become shared.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Component

**Toolbox skill** — not a pipeline stage. Called by `react-implement`, or directly whenever a component is needed.

Answers one question before any code is written: **does this component need to
exist, and where does it live?**

## 1. Does it already exist?

In this order, and stop at the first hit:

```bash
ls src/components/atoms src/components/molecules src/components/organisms
grep -rn "<ComponentName" src/           # someone may have built it in a feature
npx shadcn@latest add <name>             # a primitive: select, dialog, dropdown…
npx shadcn@latest add @react-dev/<name>  # chart, data-table, theme-toggle
```

The shadcn MCP is configured, so you can search the registries directly rather
than guessing names. A registry component arrives with its own story and test
and installs its dependency only then — so reaching for it is cheaper than
writing one, and keeps the core minimal.

**Only if nothing exists, continue.**

## 2. Feature-local, or shared?

| Used by | Where | Command |
|---|---|---|
| one feature | `src/features/<slug>/components/` | `npm run gen -- component <slug> <Name>` |
| two or more | the right atomic layer | `npm run gen -- <layer> <Name>` |

**Start feature-local when in doubt.** Promoting later is one command;
un-sharing something is a refactor across callers. Do not design for reuse that
has not happened.

## 3. Which layer?

Apply the tests top to bottom and take the first that fits:

| Layer | Test | May import |
|---|---|---|
| **atom** | Props only. No store, no fetch, no `t()`, no router. | `lib`, `types` |
| **molecule** | Composes atoms. May translate and read a store. No domain knowledge. | atoms + above |
| **organism** | A distinct section of UI. Owns state, composes molecules. | molecules + above |
| **template** | Layout and slots. **Never fetches.** | organisms + above |

A component that knows what an *Order* is belongs in a feature, not a shared
layer — however reusable its markup looks.

`eslint-plugin-boundaries` enforces the direction, so a wrong layer is a failing
lint rule with both layer names in the message, not a review argument.

## 4. Generate it

```bash
npm run gen -- atom Chip
npm run gen -- molecule DateRangeFilter
npm run gen -- organism FilterBar
npm run gen -- template AuthLayout
```

Each writes the component, a test, a story, and the barrel export. Never create
these by hand — generated code has a known shape, which is what keeps the
project migratable.

Then implement it: role tokens only (`bg-card`, `text-muted-foreground`), `t()`
for every string, and all four states on anything async.

## 5. When it graduates

A second feature needs it → promote, do not copy:

```bash
npm run gen -- promote <feature> <ComponentName> --to=molecule
```

That moves the component, its test and its story, retitles the story for the new
layer, rewrites every importer to the barrel, and updates the barrel. Doing it
by hand is where an importer gets left on the old path.

**After promoting, check it no longer reads domain state.** A shared layer must
not know about your domain; if it does, lift the domain bits into props.

## Report

What you reused or created, which layer and why, and the `npm run verify`
result. If you promoted, say which importers were rewritten.

## Next

> **Component done.** <name> at `src/components/<layer>/<name>.tsx` with story and
> tests; `npm run verify` green. Reused | created | promoted — and why.
> **Do next:** continue the skill that called you — usually `react-implement`.
> **Called directly?** `react-verify`, then use it in a feature.
