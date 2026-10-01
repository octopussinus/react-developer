# Why `knip.json` looks like this

**`entry` includes several modules that generated code consumes.** `api-client.ts` and `use-zod-form.ts`
are template surface consumed by _generated_ code — every feature that
`npm run gen -- feature` produces imports `api` from the client, and generated
forms use `useZodForm`. Knip cannot see code that does not exist yet, so without
these entries it correctly reports them as dead.

`src/testing/mocks/factories/index.ts` exports the seeded `faker` that every
generated factory imports, and `src/testing/render.tsx` exports `QueryWrapper`
for generated hook tests. Neither has an importer in an empty template, so
without these entries knip correctly calls them dead — and `npm run verify`
fails the moment you generate a feature, which is the worst time to find out.

**Remove an entry once real features import it.** Then knip resumes reporting it
as dead code if the last consumer disappears, which is the behaviour you want.

**`ignoreDependencies`** holds four deliberate cases:

| Dependency                       | Why knip cannot see it                                                         |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `tailwindcss`                    | required as a peer by `@tailwindcss/vite`, imported internally                 |
| `zustand`                        | the chosen client-state store; used once a feature needs cross-component state |
| `msw`                            | used by generated tests to mock at the network boundary                        |
| `@tanstack/react-query-devtools` | mounted ad hoc while debugging                                                 |

**`ignore` holds `src/types/**`** because ambient module augmentation
(`i18next.d.ts`) has no importer by design.

**A gitignore footgun worth knowing:** knip honours `.gitignore`. An unanchored
rule like `lib/` in any parent `.gitignore` silently hides `src/lib` from knip —
and from git. Anchor build-artefact rules (`/lib/`, not `lib/`).
