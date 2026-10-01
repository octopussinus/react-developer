# `registry/` — the react-dev component registry

A [shadcn-format registry](https://ui.shadcn.com/docs/registry). It exists so the
opt-in widgets removed from the template core (audit finding **B4**) can come
back **into the correct atomic layer**, with their dependency, instead of being
improvised per feature.

## How the atomic mapping works

Two mechanisms, both from the shadcn docs:

| Case | Mechanism |
|---|---|
| Public shadcn primitives (`button`, `select`, `dialog`) | `aliases.ui` in the consumer's `components.json` points at `src/components/atoms`, so `shadcn add select` lands in **atoms** with no per-item config. |
| Anything that is not an atom | the item declares its own `files[].target`, e.g. `@components/organisms/data-table.tsx`. `target` is supported for every item type. |

So the layer is a property of the **item**, not of the installing project. A
`data-table` cannot land in `atoms` by accident.

Each item also records `meta.atomicLayer` and a one-line `why`. That is for the
agent: it is the rule it needs when deciding where a *new* component belongs.

## Layer rules

| Layer | Test |
|---|---|
| **atom** | Presentational, props only. No store, no fetch, no `t()`, no router. Imports only `lib`. |
| **molecule** | Composes atoms. May translate and read a store. No domain knowledge. |
| **organism** | A distinct section of UI. Owns state, composes molecules. |
| **template** | Layout and slots. Never fetches. |
| **page** | A feature's `pages/` — real data meets a template. Never in this registry. |

`eslint-plugin-boundaries` enforces the import direction, and
`src/testing/architecture.test.ts` proves the enforcement still fires.

## Build and host

```bash
npx shadcn@latest build --output public/r   # from this directory
```

Serve `public/r/*.json` anywhere static (GitHub Pages, S3, a Worker). Consumers
register the namespace once:

```bash
npx shadcn@latest registry add @react-dev=https://<host>/r/{name}.json
npx shadcn@latest add @react-dev/chart
```

For a private/internal registry, `components.json` supports auth headers with
`${ENV_VAR}` expansion — that is the enterprise path: one internal registry
carrying your components, your tokens and your conventions.

## Adding an item

1. Write the component in `items/`, using **role tokens only** (`bg-card`,
   `text-muted-foreground`) so it inherits any consumer's theme.
2. Add it to `registry.json` with a `target` for the right layer and a
   `meta.atomicLayer`.
3. Declare its npm `dependencies`. Keeping them out of the template core is the
   entire point of the registry.
4. Re-run the build.

**Charts:** the palette in `--chart-1..5` is validated, not chosen by eye. Never
add or reorder a hue without re-running the validator — my first hand-picked set
failed two hard colourblind-separation gates.
