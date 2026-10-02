# `specs/` — one feature, one folder, one branch

Planning output lives alongside, split so that building one feature never means
reading the plan for all of them:

```
specs/
├── ROADMAP.md              the index: table, order, tracks, shared components
├── roadmap/
│   ├── prerequisites.md    the blocking decisions
│   └── NNN-<slug>.md       one per planned feature: behaviour, mock data, questions
└── NNN-<slug>/             the WORK folder, created by react-feature
    ├── spec.md  plan.md  tasks.md  review.md
```

`react-roadmap` writes the first two; `react-feature <n>` reads the index plus
that one feature file and creates the work folder.

Each feature gets `specs/NNN-<slug>/` on branch `NNN-<slug>`. Everything about
the feature lives there, so the spec and the code arrive in the same diff and
"what was this built from, and who agreed to it?" has an answer.

```
specs/001-order-tracking/
├── design/          # react-spec       (the Stitch screen, if there was one)
├── spec.md          # react-spec       (unknowns marked [NEEDS CLARIFICATION])
├── plan.md          # react-implement  (only when the approach is non-obvious)
├── tasks.md         # react-implement  (ticked as work lands)
└── review.md        # react-verify + the human reviewer
```

Nothing here is ever deleted to make room for the next feature. Git is the
history mechanism; the old numbered folders are the record.

`NNN` is zero-padded and strictly increasing. `react-feature` allocates it.
