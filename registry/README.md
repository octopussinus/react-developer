# `registry/` — the react-dev component registry

A [shadcn-format registry](https://ui.shadcn.com/docs/registry). It exists so the
opt-in widgets removed from the template core (audit finding **B4**) can come
back **into the correct atomic layer**, with their dependency, instead of being
improvised per feature.

## How the atomic mapping works

Two mechanisms, both from the shadcn docs:

| Case                                                    | Mechanism                                                                                                                                             |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public shadcn primitives (`button`, `select`, `dialog`) | `aliases.ui` in the consumer's `components.json` points at `src/components/atoms`, so `shadcn add select` lands in **atoms** with no per-item config. |
| Anything that is not an atom                            | the item declares its own `files[].target`, e.g. `@components/organisms/data-table.tsx`. `target` is supported for every item type.                   |

So the layer is a property of the **item**, not of the installing project. A
`data-table` cannot land in `atoms` by accident.

Each item also records `meta.atomicLayer` and a one-line `why`. That is for the
agent: it is the rule it needs when deciding where a _new_ component belongs.

## Layer rules

| Layer        | Test                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------- |
| **atom**     | Presentational, props only. No store, no fetch, no `t()`, no router. Imports only `lib`. |
| **molecule** | Composes atoms. May translate and read a store. No domain knowledge.                     |
| **organism** | A distinct section of UI. Owns state, composes molecules.                                |
| **template** | Layout and slots. Never fetches.                                                         |
| **page**     | A feature's `pages/` — real data meets a template. Never in this registry.               |

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

## Publishing (required before any other project can install from it)

`.github/workflows/registry-pages.yml` rebuilds the registry on every push to
`main` that touches `registry/`, validates each built file, publishes
`registry/public` to GitHub Pages, and then **fetches each item by URL** to
prove the published registry answers.

**One manual step, once:** GitHub Pages must be set to the _GitHub Actions_
source — repo **Settings → Pages → Build and deployment → Source: GitHub
Actions**. Without that the workflow has nothing to deploy to, and the URL in
every generated project's `components.json` keeps 404ing.

```bash
# the URL a consumer actually hits
curl -I https://<user>.github.io/react-developer/r/chart.json   # expect 200
```

This matters more than it looks: a 404 here is a **silent** failure. The
`registry` job in `ci.yml` installs each item from a local path, so the registry
can be perfectly valid and perfectly unreachable at the same time — which is
exactly the state this repo was in until the publish workflow existed.

If you fork or rename the repo, the install URL lives in
`templates/react/components.json` and the `homepage` in `registry/registry.json`
(and its built copy). Update them together — a test compares the owner across
all three, because a stale URL stays green in CI and 404s in every generated
project.

## Adding an item

**Generated, never hand-written** — the entry has to be consistent across four
places at once, and a missing `target` installs the component into the wrong
atomic layer of every consumer's project:

```bash
cd registry
npm run gen -- molecule Chart                      # from the template's own tree
npm run gen -- organism DataTable --from ../../my-app/src/components/organisms/data-table.tsx
npm run build
```

It copies the component, its story and its test, writes the `registry.json`
entry with the right `target` for the layer, and works out which npm
dependencies the consumer needs by subtracting what the template already ships.
It refuses a name that is already registered — editing an existing item is a
source change in `items/`, not a new entry.

Then replace the two `TODO` fields it leaves (`description` and `meta.why`) and
rebuild. The `react-publish` skill drives all of this, including the checks that
decide whether the component should be published at all.

Components must use **role tokens only** (`bg-card`, `text-muted-foreground`),
carry no domain knowledge, and import nothing from `@/features`.

**Charts:** the palette in `--chart-1..5` is validated, not chosen by eye. Never
add or reorder a hue without re-running the validator — my first hand-picked set
failed two hard colourblind-separation gates.
