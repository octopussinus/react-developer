# `src/modules/`

Domain code, nested two levels:

```
modules/<module>/            a group of related pages
  components/ lib/ types/    shared by THIS module's pages only
  <page>/                    one page, and everything it owns
    index.ts                 its public surface
    <page>-page.tsx          the page component
    api/ components/ hooks/
    lib/ types/ constants/ validation/
```

Three levels of sharing, and the rules enforce the direction:

| Something is needed by  | It belongs in                        |
| ----------------------- | ------------------------------------ |
| one page                | that page's own folder               |
| two pages of one module | `modules/<module>/components` (etc.) |
| two modules             | an atomic layer in `src/components/` |

A page may import its own module's shared code and the global layers. It may
**not** import another module, another page, or reach sideways — and module
shared code may not import a page, or it stops being shareable the moment that
page changes.

`eslint-plugin-boundaries` enforces every line of that, and
`src/testing/architecture.test.ts` proves the rules are not silently inert.

Generate, never hand-create:

```bash
npm run gen -- feature <module> <page> --route=/path
npm run gen -- component <module> <page> <Name>
npm run gen -- hook <module> <page> use<Name>
npm run gen -- promote <module> <page> <Name> --to=module
```
