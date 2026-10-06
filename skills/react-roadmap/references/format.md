# Roadmap file shapes

Two shapes. The index is read constantly, so it stays short; the per-feature file
is read only while that feature is being built.

## `specs/ROADMAP.md` — the index (keep under ~80 lines)

```markdown
# Roadmap

Source: <Stitch project / brief path> · Generated: <date>
Screens: <n> designed, <m> mapped · Features: <k> · Open questions: <q>

## Order

Prerequisites first, then:

1–4 are parallelisable. Tracks: health (3→4→5), social (6–9), shopping (10→13).

## Prerequisites

Blocking, and not features. Detail: [roadmap/prerequisites.md](roadmap/prerequisites.md)

| #   | What                     | Blocks        | Status |
| --- | ------------------------ | ------------- | ------ |
| P1  | OpenAPI contract         | every feature | open   |
| P4  | Brand tokens             | all UI        | open   |

## Features

| #   | Module    | Page          | What the user can do          | Needs  | Size | Detail                          |
| --- | --------- | ------------- | ----------------------------- | ------ | ---- | ------------------------------- |
| 1   | `public`  | `landing`     | read the public page, sign up | P4     | S    | [→](roadmap/001-landing.md)     |
| 2   | `dogs`    | `profile`     | see and edit one dog          | P1, 1  | M    | [→](roadmap/002-dog-profile.md) |

**Module is required, not decoration.** It is where the code lands
(`src/modules/<module>/<page>/`) and it is the lock the parallel orchestrator
uses: two features of the SAME module are never built at the same time, because
they share that module's components, lib and types. Getting it wrong does not
produce a merge conflict — it produces two agents editing one file and a clean
merge that does not build.

Size: S = one loop pass · M = one pass, bigger spec · L = **split before starting**

## Shared components this implies

Not features — these go to an atomic layer or the registry.

| Component  | Layer    | Source                             |
| ---------- | -------- | ---------------------------------- |
| data table | organism | `shadcn add @react-dev/data-table` |

## Design reconciliation

Token-by-token: [roadmap/prerequisites.md](roadmap/prerequisites.md#p4-brand-tokens)

## Out of scope

What the design implies but this roadmap excludes, and why.
```

Nothing else belongs here. No mock data, no per-feature behaviour lists, no
question bodies — all of that lives in the file for the feature it concerns.

## `specs/roadmap/NNN-<slug>.md` — one per feature

This is what `react-feature <n>` reads. It should be everything needed to start
that feature and nothing about any other.

```markdown
# 2. `dog-profile`

Size **M** · Needs **P1, P3, feature 1**

## Screens

`react-spec` fetches these with `get_screen`, so record the **resource name**,
not just the title — a title match needs a `list_screens` round trip and breaks
when two screens are named alike.

| Screen                             | Stitch resource                      |
| ---------------------------------- | ------------------------------------ |
| Luna's Profile & Health Overview   | `projects/abc123/screens/scr_0042`   |

No Stitch screen for this feature? Write `Screens: none — specify from prose` so
`react-spec` does not go looking.

## What the user can do

1. See the selected dog's name, photo, breed, age and weight.
2. Switch to another of their dogs.
3. [NEEDS CLARIFICATION: is editing in scope? the design shows an Edit button
   but no form]
   a) read-only now, editing as its own feature
   b) inline editing in this feature

## Mock data

**Entity `Dog`** — `id`, `name`, `photoUrl`, `breed`, `bornOn`, `weightKg`,
`vet` (`{ name, clinic }`)

Not in any API yet: `compatibilityScore` [NEEDS CLARIFICATION].

**Extremes the design must survive**
- 40-character dog name, and a 90-character breed
- `photoUrl: null` → initials fallback
- `weightKg: 0.4` (puppy) and `92` (mastiff)
- an owner with 1 dog, and with 12

**States**: empty (no dogs yet) · loading · 404 (dog deleted) · 403 (not theirs)

## Canonical record

The designs disagreed; these values win, so every screen shows the same dog:

| Field      | Value       | Designs showed              |
| ---------- | ----------- | --------------------------- |
| `weightKg` | `18.4`      | 18.4 (profile), 18.2 (dash) |
| `vet.name` | `Dr. Anna`  | "Dr. Marta" ×1, "Dr. Anna" ×3 |

## Shared components needed

`data table` (organism, registry) · `avatar` (atom, `shadcn add avatar`)
