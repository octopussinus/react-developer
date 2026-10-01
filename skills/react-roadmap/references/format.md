# ROADMAP.md format

```markdown
# Roadmap

Source: <Stitch project / brief path>  ·  Generated: <date>
Screens: <n> designed, <m> mapped

## Design reconciliation

From `extract_design_context`, compared with `src/styles/index.css`.

| Token | Design | Project | Action |
|---|---|---|---|
| primary | `#4f46e5` | `oklch(0.52 0.19 264)` | close enough, keep project |
| radius | `12px` | `0.625rem` (10px) | prerequisite: update `--radius` |

## Prerequisites

Blocking, and not features.

| # | What | Why it blocks | Status |
|---|------|---------------|--------|
| P1 | OpenAPI contract at `openapi.json` | every feature's types generate from it | open |

## Features

| # | Slug | Screens | What the user can do | Depends on | Size |
|---|------|---------|----------------------|-----------|------|
| 1 | `orders` | Order list, Order detail | browse, filter, open one, refund | P1 | M |

Size: S = one loop pass · M = one pass, bigger spec · L = **split before starting**

### Splits I made, and why

Record the non-obvious ones. A reviewer needs to check your judgement, not just
your list.

## Mock data

What `react-feature` will generate handlers and factories for.

### 1. `orders`

- **Entity `Order`**: `id`, `customer`, `total` (minor units), `status`
  (`pending|paid|failed|refunded`), `createdAt`
- **Not in any API yet**: `refundReason` — the detail screen shows it
  `[NEEDS CLARIFICATION]`
- **Extremes the design must survive**: 90-char customer name · `total: 0` ·
  a 200-row list · `refundedAt: null`
- **States**: empty · loading · 500 · 403 for an agent attempting a refund

## Shared components this implies

Not features.

| Component | Layer | Source |
|---|---|---|
| data table | organism | `shadcn add @react-dev/data-table` |

## Open questions

- [ ] [NEEDS CLARIFICATION: ...]

## Out of scope

What the design implies but this roadmap excludes, and why.
```
