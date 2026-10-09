---
name: react-roadmap
description: Turn designed screens or a long brief into an ordered roadmap of features, with the mock data each one needs. Use once at the start of a project, after designing pages in Stitch, or whenever given a big description covering many screens.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Roadmap

**Stage 2 of 11** of the react-dev pipeline — after `react-constitution`, then `react-clarify`. `react-dev status` shows where every feature stands.

Converts **designed screens** (or a written brief) into `specs/ROADMAP.md`: an
ordered list of features, each sized for one pass of the loop, each with its mock
data specified. `react-feature` then takes one entry at a time.

**Write the roadmap. Do not build.** No branches, no generator, no code. A
roadmap nobody agreed to is a wrong plan executed quickly.

## 1. Get the screens

**Designed in Stitch?** `list_projects → list_screens → get_screen`, then
`list_design_systems` to check whether the screens were designed against your
codebase's tokens. Tool params, the polling rule and the token-direction decision:
[references/stitch.md](references/stitch.md).

**Your own design files?** `ls designs/` -- HTML prototypes and PNG/JPG
screens the user dropped in (see `designs/README.md`). Look at every one; each
is a screen to map, exactly like a Stitch screen, recorded by its path.

**Neither?** Read the brief in full before splitting anything — decomposing from
the first third produces overlapping features.

## 2. Inventory what exists

So you never propose something already built:

```bash
ls src/modules/ specs/ src/components/*/ src/testing/mocks/handlers/ 2>/dev/null
cat src/config/routes.ts && ls src/lib/api/generated 2>/dev/null
```

## 3. Map screens to features

**A screen is not a feature.** Several screens of one domain are one feature; one
screen spanning three domains is three. The binding constraint: a feature cannot
import a sibling, so screens sharing a data shape belong together. Tests and a
worked example: [references/decomposition.md](references/decomposition.md),
[references/example.md](references/example.md).
Record each screen's **resource name** (Stitch) or **path** (`designs/…`), not
just its title — `react-spec` fetches the design from it directly.

Separate **prerequisites** (API contract, auth, permissions, tokens, locales)
from features — they block everything and are not features.

## 4. Specify the mock data, per feature

Entities and fields, the extremes the design must survive, which states. It is
what makes the frontend buildable before any backend exists, and the step most
often skipped. Details, and the designs-contradict-themselves problem:
[references/mock-data.md](references/mock-data.md).

## 5. Write it SPLIT, never as one file

`specs/ROADMAP.md` is the **index** — table, order, tracks, shared components,
prerequisite summary. Detail goes in `specs/roadmap/`: `prerequisites.md` plus
`NNN-<slug>.md` per feature (behaviour, screens, mock data, its own questions).

**Keep the index under ~80 lines.** It is read on every feature; a feature file is
read only while that feature is built. One 500-line roadmap makes the agent read
14 features' mock data to build the first, and blending neighbouring features'
details is the failure that causes.

Both shapes, and the cross-linking: [references/format.md](references/format.md).

## 6. Report, then offer to resolve the questions

Report: prerequisite count, feature count, screens mapped, the first three
features, and **how many** open questions there are — not the questions
themselves.

**Do not end with a list of questions.** A wall of questions gets one vague
reply or none. They are already recorded as markers in the roadmap; the list adds
nothing and buries the three the user actually needs to decide now.

Instead, name only the ones that block feature 1 in the `## Next` block below.

## Hard rules

- NEVER create branches, feature work folders (`specs/NNN-<slug>/`) or code.
  `specs/ROADMAP.md` and `specs/roadmap/*.md` are planning output, not work.
- NEVER write one monolithic roadmap. The index links; the detail lives per
  feature.
- NEVER let the index exceed ~80 lines. Move detail into the feature file.
- NEVER emit an `L` feature as actionable — split it and say so.
- NEVER invent a requirement. A gap in the design is an open question.
- NEVER list a shared component as a feature.
- NEVER skip the mock data section. A feature with no mock spec cannot be built
  before its API exists, which defeats the point of designing first.
- NEVER dump the open questions as a flat list in your report. Record them as
  markers, name only what blocks the next feature, and hand off to
  `react-clarify` — which asks them one at a time, as a choice list.

## Next

> **Stage 2 of 11 complete.** N prerequisites, M features, S screens mapped →
> `specs/ROADMAP.md` + `specs/roadmap/` (one file per feature). Q open questions,
> K of them blocking feature 1: <name them>.
> **Do next:** `react-clarify` — decides those K one at a time, as a choice list.
> Planning a whole product is a long conversation and all of it is now in
> `specs/`, so **`/clear` once the questions are answered**, before feature 1.
> **Questions answered?** `react-prerequisites` -- then `react-feature 1`.
