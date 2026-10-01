---
name: react-roadmap
description: Turn designed screens or a long brief into an ordered roadmap of features, with the mock data each one needs. Use once at the start of a project, after designing pages in Stitch, or whenever given a big description covering many screens.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Roadmap

Converts **designed screens** (or a written brief) into `specs/ROADMAP.md`: an
ordered list of features, each sized for one pass of the loop, each with its mock
data specified. `react-feature` then takes one entry at a time.

**Write the roadmap. Do not build.** No branches, no generator, no code. A
roadmap nobody agreed to is a wrong plan executed quickly.

## 1. Get the screens

**Designed in Stitch?** Use the MCP — tool names, params and the polling rule are
in [references/stitch.md](references/stitch.md):

```
list_projects → list_screens → get_screen
```

**Check the token direction first.** `list_design_systems` tells you whether the
project was designed against your codebase's tokens. If it was not, that is a
prerequisite: write a `DESIGN.md` from `src/styles/index.css`, push it with
`upload_design_md` + `create_design_system_from_design_md`, and
`apply_design_system` to the existing screens. Pushing your tokens in beats
extracting theirs and reconciling afterwards — and it removes any reason to
hardcode a design's hex.

**No Stitch?** Read the brief in full before splitting anything. Decomposing from
the first third produces overlapping features.

## 2. Inventory what exists

So you never propose something already built:

```bash
ls src/features/ && ls specs/ 2>/dev/null
ls src/components/atoms src/components/molecules src/components/organisms
cat src/config/routes.ts && ls src/lib/api/generated 2>/dev/null
ls src/testing/mocks/handlers/
```

## 3. Map screens to features

**A screen is not a feature.** Several screens of one domain are one feature; one
screen spanning three domains is three. The binding constraint is that a feature
cannot import a sibling, so screens that share a data shape belong together.
Tests and worked examples: [references/decomposition.md](references/decomposition.md),
[references/example.md](references/example.md).

Separate **prerequisites** (API contract, auth, permissions, tokens, locales)
from features. They block everything and are not features.

## 4. Specify the mock data

Do this per feature, from what the screens actually display. It is the step that
makes a frontend buildable before any backend exists — and the step most often
skipped, which is why "it works" turns out to mean "it works with three tidy
rows".

For each feature record:

- **Entities** and their fields, taken from what the screen shows. Mark any field
  the design implies but no API provides.
- **The extremes the design must survive**: longest realistic string, zero,
  negative, null, a 200-row list. The screen will look fine with tidy data.
- **States**: empty, loading, error, partial.

## 5. Write `specs/ROADMAP.md`

Use the format in [references/format.md](references/format.md).

## 6. Report and stop

Prerequisite count, feature count, screens mapped, the first three features, and
every open question.

## Hard rules

- NEVER create branches, folders or code. Only `specs/ROADMAP.md`.
- NEVER emit an `L` feature as actionable — split it and say so.
- NEVER invent a requirement. A gap in the design is an open question.
- NEVER list a shared component as a feature.
- NEVER skip the mock data section. A feature with no mock spec cannot be built
  before its API exists, which defeats the point of designing first.

## Report

> N prerequisites, M features, S screens mapped. Review the roadmap, then:
> `react-feature 1`
