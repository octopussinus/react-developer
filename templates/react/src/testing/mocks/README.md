# `mocks/` — build the frontend before the backend

One handler list, three environments. That is the whole design:

| Environment               | Entry                        | Unhandled requests                                 |
| ------------------------- | ---------------------------- | -------------------------------------------------- |
| Browser (dev + Storybook) | `browser.ts` → `setupWorker` | `bypass` — assets and HMR are real                 |
| Vitest                    | `server.ts` → `setupServer`  | `error` — an unmocked request is a bug in the test |

```
mocks/
├── handlers/
│   ├── index.ts      the ONE composed list; the generator registers domains here
│   └── <feature>.ts  per-domain handlers, HAPPY PATH ONLY
├── factories/
│   ├── index.ts      seeded faker
│   └── <entity>.ts   build<Entity>(overrides) + build<Entity>List(count)
├── browser.ts
└── server.ts
```

If tests and the dev server had separate mocks they would drift, and you would be
testing something you never run. Hence one list.

## Adding mocks

`npm run gen -- feature <slug>` writes a handler and factory for the feature and
registers them. For another entity:

```bash
npm run gen -- mock orders Invoice
```

## Happy path here, unhappy paths in the test

Default handlers describe success. A 500 baked in here breaks every other test:

```ts
it('shows the error state', async () => {
  server.use(http.get('*/orders', () => HttpResponse.json(null, { status: 500 })));
  // ...
});
```

`src/testing/setup.ts` calls `server.resetHandlers()` after each test, so an
override cannot leak.

## Factories must include the extremes

A factory that only makes tidy data hides every layout bug:

```ts
export const orderWithLongName = () => buildOrder({ customer: 'ü'.repeat(90) });
export const orderAtZero = () => buildOrder({ total: 0 });
```

Faker is seeded (`seedMocks()`), so runs are reproducible and visual baselines do
not churn.

## Turning mocks off

```
VITE_ENABLE_MOCKS=false   # in .env.local, once a real API is reachable
```

## MSW 3 note

`onUnhandledRequest` was renamed **`onUnhandledFrame`** in v3 — it intercepts
WebSocket frames too. Guides written for v2 use the old name and will not
typecheck.
