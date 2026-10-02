# Specifying mock data from designs

`react-feature` generates an MSW handler and a factory per feature. This section
of the roadmap tells it what to put in them — without it, the generated factory
is an empty stub and the screen gets built against three tidy rows.

## Per feature, record

**Entities and their fields**, read off what the screen actually shows. Not what
you imagine the API returns — what the design renders. If the screen shows a
compatibility percentage, that is a field.

**Fields the design implies but no API provides.** Mark each
`[NEEDS CLARIFICATION]`. This is the single most valuable thing this section
produces: it catches, before any code, that the detail screen shows a
`refundReason` nobody has an endpoint for.

**The extremes the design must survive.** The screen looks fine with the
designer's data. Name what will break it:

| Extreme | Why |
|---|---|
| longest realistic string | 90-character names wrap, truncate or overflow |
| zero / empty / negative | "0 walks" and "-0.3 kg" both have to read correctly |
| `null` where the API allows it | an optional date renders as "Invalid Date" if missed |
| a 200-row list | pagination, virtualisation and scroll behaviour |
| the maximum count the design shows | 3 avatars designed, 40 in production |

**States**: empty, loading, error, partial. Stitch shows the populated case only.

## Designs contradict themselves — resolve it here, once

Generated designs are per-screen, so the same entity drifts between them. Real
example from a dog-care project: the dog weighed 18.4 kg on one screen and 18.2
on another; her age was "1.5 years" and "3 years 4 months"; the vet was
"Dr. Marta" on one screen and "Dr. Anna" on three others; the vaccination dates
did not add up.

None of that is a bug in the design — each screen was generated independently.
But if it reaches the factories, every screen shows different numbers and nobody
can tell a mock inconsistency from a real one.

**So: pick one canonical record per entity in the roadmap, and say so.** Note
which screens disagreed and which value won, so a reviewer comparing the built
screen to the design does not file it as a defect.

```markdown
### Canonical `Dog` record

One seeded `Luna` used by every screen. The designs disagreed; these win:

| Field | Value | Designs showed |
|---|---|---|
| `weightKg` | `18.4` | 18.4 (profile), 18.2 (dashboard) |
| `bornOn` | `2023-06-02` → "3y 4m" | "1.5 years" (profile), "3y 4m" (passport) |
| `vet.name` | `Dr. Anna Kowalska` | "Dr. Marta" (1 screen), "Dr. Anna" (3) |
```

Seeded faker makes this reproducible, so the same values appear on every run and
visual baselines do not churn.
