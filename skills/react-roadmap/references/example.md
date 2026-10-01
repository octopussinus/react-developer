# Worked example

A real brief decomposed. Produced by following this skill's procedure on a
27-line description of an internal ops portal (orders, invoices, customers,
dashboard, settings, SSO, two roles, tablets, accessibility).

The instructive parts are the **"Splits I made, and why"** section and the
shared-component table — those are the two judgements that go wrong most often.

---

# Roadmap

Source: `brief.md` (Internal Ops Portal) · Generated: 2026-10-01

## Prerequisites

Blocking, and not features. Each needs a decision before slice work starts.

| #   | What                                        | Why it blocks                                                      | Status |
| --- | ------------------------------------------- | ------------------------------------------------------------------ | ------ |
| P1  | Reconcile `openapi.json`                    | every feature's types generate from it; the brief says it is stale | open   |
| P2  | SSO session model                           | nothing renders without a session                                  | open   |
| P3  | Permissions model (`agent` / `supervisor`)  | three features gate actions on it; must be one mechanism           | open   |
| P4  | Tablet breakpoint floor + a11y bar          | warehouse tablets; a complaint already happened                    | open   |
| P5  | Locale set (`en`, `pl`)                     | key structure must be right before 6 features add keys             | open   |

## Features

| #   | Slug        | What the user can do                                                   | Depends on | Size |
| --- | ----------- | ---------------------------------------------------------------------- | ---------- | ---- |
| 1   | `orders`    | browse/filter/search orders, open one, see payment timeline, refund it | P1–P4      | M    |
| 2   | `invoices`  | list and filter invoices by month, export a month as CSV, void one     | P1–P3      | M    |
| 3   | `customers` | search customers, open a profile, read LTV and orders, add notes       | P1–P3      | M    |
| 4   | `dashboard` | see this week's counts, revenue, refund rate, 30-day revenue chart     | P1, P2     | S    |
| 5   | `settings`  | set language and theme; supervisors manage refund reasons              | P1–P3, P5  | M    |

Size: S = one loop pass · M = one pass, bigger spec · L = **split it before starting**

1–4 are parallelisable: no shared dependency, and no feature may touch another's
folder. 5 is last because refund reasons must exist before `orders` can finish
its refund flow — build the reason list as a stub in 1 and wire it in 5.

### Splits I made, and why

- **`orders` is one feature, not `order-list` + `order-detail`.** They share the
  `Order` schema and the same `api/` module; splitting them forces a
  cross-feature import, which lint forbids. Domain, not screen.
- **Refund is inside `orders`**, not its own feature. It has no life of its own.
- **`dashboard` is its own feature** even though it shows order data: it owns a
  different query (aggregates) and a different audience. It must not import
  `features/orders` — it reads the generated API types, like everyone else.

## Shared components this implies

Not features. These land in an atomic layer or come from the registry.

| Component           | Layer    | Source                                 |
| ------------------- | -------- | -------------------------------------- |
| data table (sorted) | organism | `shadcn add @react-dev/data-table`     |
| revenue chart       | molecule | `shadcn add @react-dev/chart`          |
| theme toggle        | molecule | `shadcn add @react-dev/theme-toggle`   |
| status badge        | atom     | already in the template (`Badge`)      |
| date-range filter   | molecule | build — no registry item yet           |
| search input        | molecule | `shadcn add input` + build the wrapper |
| order summary list  | organism | build — used by `customers` **and** `orders`; must live above both |

## Open questions

- [ ] [NEEDS CLARIFICATION: `openapi.json` is "a bit out of date" — which fields are authoritative, the spec or production? Everything downstream types off this.]
- [ ] [NEEDS CLARIFICATION: does refund call the payment provider, or only mark state and let a backend job settle it? Changes error handling and whether the action is optimistic.]
- [ ] [NEEDS CLARIFICATION: CSV export — server endpoint, or built client-side? A month of invoices may be too large for the browser.]
- [ ] [NEEDS CLARIFICATION: lifetime value — computed by the API or in the client? If client-side it needs every order, which the list endpoint may not return.]
- [ ] [NEEDS CLARIFICATION: notes — can an agent edit or delete their own note, or append-only?]
- [ ] [NEEDS CLARIFICATION: German is "maybe later" — activate `de` now with `TODO:de` markers, or leave it out? Adding a locale later is cheap; retrofitting key structure is not.]
- [ ] [NEEDS CLARIFICATION: tablet floor — which viewport is the minimum supported? The template's visual baselines are 375/768/1440.]

## Out of scope

- **Deleting customers** — the brief explicitly forbids it, so no delete path anywhere.
- **German** — pending the locale question above.
- **Supervisor user management** — the brief says two roles exist but never asks
  to manage them; assumed to come from SSO.
