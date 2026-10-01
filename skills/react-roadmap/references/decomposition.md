# Decomposing a brief into feature slices

## The binding constraint

`eslint-plugin-boundaries` forbids a feature importing a sibling feature. That
is not a style rule here — it is the test for whether your split is right.

**If two candidate features would need each other's internals, they are one
feature.** Shared parts graduate upward into `components/*` or `lib/`, never
sideways.

## Prerequisite or feature?

| It is a **prerequisite** if... | It is a **feature** if... |
|---|---|
| Everything depends on it (API contract, auth, tokens, layout shell) | A user can do something end to end with it |
| It is a decision, not a screen | It owns its own data access |
| Getting it wrong forces rework everywhere | It could ship alone and be useful |

Common prerequisites that briefs hide: the API contract, the auth and session
model, the permissions model, the design tokens, the app shell and navigation,
and the locale set. Surface them — they are where "we'll figure it out later"
becomes a rewrite.

## Sizing

| Size | Test | Action |
|---|---|---|
| **S** | one screen, one data shape, under ~8 behaviours | ready |
| **M** | a few screens sharing one domain, ~8–15 behaviours | ready, expect a longer spec |
| **L** | more than ~15 behaviours, or two unrelated data shapes | **split before starting** |

A feature should finish in one pass of
`feature → spec → clarify → implement → verify`. If it cannot, the spec grows
past what anyone reviews and the gates arrive too late to be useful.

## Good and bad splits

**Bad — split by layer.** `orders-api`, `orders-ui`, `orders-types`. These
cannot ship independently and all three change together. That is one feature.

**Bad — split by CRUD verb.** `create-order`, `edit-order`, `delete-order`. They
share a schema and a form; the split forces cross-imports or triplicated code.
One feature, `order-management`.

**Bad — one giant feature.** `dashboard` covering orders, invoices, customers
and settings. Four data shapes, four audiences. Four features.

**Good — split by what the user is doing**, each owning its data:
`order-tracking`, `invoice-export`, `customer-profile`. Each ships alone and
needs nothing from the others except shared UI, which lives upward.

## Ordering

1. Prerequisites first — all of them.
2. Then features with no dependencies, cheapest first. An early finished slice
   validates the architecture while changing it is still cheap.
3. Then dependents, in dependency order.

Mark what is parallelisable. Two features with no shared dependency can run on
two branches without conflict, because neither may touch the other's folder.

## What is not a feature

- **A shared component.** A table, a chart, a date picker → atomic layer or
  registry. List it under "Shared components this implies".
- **A refactor.** Real work, but it has no user-facing behaviour to spec.
- **"Polish" or "improve UX".** Not specifiable, so not verifiable. Either name
  the concrete change or leave it out.
