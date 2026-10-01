# `src/features/`

Empty on purpose. A new project ships no demo feature — the first thing in here
should be yours.

```bash
npm run gen -- feature orders --route=/orders
```

That creates `orders/{api,components,hooks,pages,types}` with a barrel, a test,
a story, a route entry and a locale namespace in every language — identically
every time. Never create these folders by hand; generated code has a known
shape, which is what lets `react-dev sync` migrate it later.

## The two rules

1. **A feature never imports another feature.** Shared code graduates into
   `src/components/{atoms,molecules,organisms,templates}` or `src/lib`.
2. **`index.ts` is the only public surface.** Deep imports fail `npm run lint`.

Both are enforced by `eslint-plugin-boundaries`, and
`src/testing/architecture.test.ts` proves the enforcement still works.
