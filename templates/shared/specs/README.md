# `specs/` — one feature, one folder, one branch

Each feature gets `specs/NNN-<slug>/` on branch `NNN-<slug>`. Everything about
the feature lives there, so the spec and the code arrive in the same diff and
"what was this built from, and who agreed to it?" has an answer.

```
specs/001-order-tracking/
├── prototype.html   # react-prototype  (optional; built with the project's own CSS)
├── spec.md          # react-spec       (unknowns marked [NEEDS CLARIFICATION])
├── plan.md          # react-implement  (only when the approach is non-obvious)
├── tasks.md         # react-implement  (ticked as work lands)
└── review.md        # react-verify + the human reviewer
```

Nothing here is ever deleted to make room for the next feature. Git is the
history mechanism; the old numbered folders are the record.

`NNN` is zero-padded and strictly increasing. `react-feature` allocates it.
