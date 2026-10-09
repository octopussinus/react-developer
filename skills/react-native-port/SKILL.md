---
name: react-native-port
description: Port the web app this mobile app was made from - copy what runs on React Native as it is, then translate the remaining screens to native one at a time until PORT.md is empty. Use in a react-native project made by `react-dev init --type react-native`, to start the port, to continue it, or after the web app changed.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Native Port

**Toolbox skill** -- the mobile app's main loop. It lives in its own repository;
the web app is never written to.

A web React app does not convert to native; it migrates, screen by screen. The
mechanical part is done by a tool, so you only do the part that needs judgment:

| `npm run port` does | You do |
|---|---|
| Copies every file that runs on React Native **verbatim** (logic, API, schemas, hooks, mocks, locales, the web's own tests) | Translate UI and browser code to React Native |
| Generates env (`VITE_*` -> `EXPO_PUBLIC_*`), design tokens -> Uniwind themes, one Expo Router screen per web route | Re-implement the web shell (guards, nav chrome) as layouts |
| Writes `PORT.md`: what is left, in order, re-derived every run | Run it again after every step |

## 1. Run the port

```bash
npm run port                       # remembers --from after the first run
npm install                        # when it says dependencies changed
```

Read `PORT.md`. Report the table at its top in one line before doing anything.
**Never** edit a copied file (no header on line 1, listed in
`.react-dev-port.json`): it belongs to the web app and the next port would
report it as diverged. If it is wrong, it is wrong on the web too.

## 2. Work PORT.md top-down, one item per pass

1. **Platform code** (section 1) -- small, and each unblocks many files.
2. **Shared components, atoms first** (section 2). Translate a layer before the
   one above it: a molecule cannot render before its atoms exist.
3. **Screens** (section 3), in registry order unless the user names one.
4. **Everything else** (section 4).

For each file: read the web file, write the native one **at the same path**
(PORT.md shows it; web `src/app/pages/x.tsx` lands in `src/screens/x.tsx`), then
`npm run port`. Translating one platform file often unblocks hundreds of copies
(one `locale.ts` brought 293 files of a real app across). A screen's route
switches from its stub to the real page by itself once every file it pulls in
is native -- barrels are generated per member, so a screen never waits for
components it does not use.

**How to translate** -- the rules, the element/event/class map, forms, lists,
navigation, and the Uniwind classes that do NOT work:
[references/translate.md](references/translate.md). The template already holds
translations of react-dev's own atoms, molecules and pages -- open
`src/components/atoms/button.tsx` before writing your first component and match it.

**The web shell** (router, guards, app frame, sidebar):
[references/shell.md](references/shell.md).

## 3. Verify every pass

```bash
npm run typecheck && npm run test
```

after each file; `react-native-verify` (all gates, plus the screen opened in
Expo Go) after each screen. A screen is done when it **runs**, not when it
compiles: a blank screen bundles fine.

## Faster: several agents at once

`react-native-parallel` runs this port as parallel waves of headless agents
(`react-dev dispatch`) -- Claude Code, Codex or Gemini:
[references/parallel.md](references/parallel.md).

## 4. When the web app changes

`npm run port` again. Copies update themselves. A translation whose web file
changed shows as **stale**, and holds back everything that imports it until it
is current: `git -C <web app> diff` that file, port the change, then
`npm run port -- --done <native file>`. (The template's own translations start
stale in an app that changed react-dev's defaults -- that is the same job.) A **diverged**
copy (edited here and on the web) needs a person: show both diffs and ask.

**Made by react-dev?** Routes, env and tokens are converted from react-dev's
web conventions (`src/config/routes.ts`, `src/config/env.ts`, Tailwind v4
tokens in `src/styles/index.css`). A web app without them still gets the
file-by-file copy and the worklist; say so, and do those three by hand.

## Hard rules

- NEVER write to the web app's repository. It is read-only to this skill.
- NEVER add a dependency Expo Go does not ship -- `npm run expo-go:check`. If a
  screen truly needs one, stop and ask: it means leaving Expo Go
  ([references/expo-go.md](references/expo-go.md)).
- NEVER `npm install` an Expo or React Native package; `npx expo install` it.
- NEVER invent behaviour. Same props, same keys, same states (loading, empty,
  error), same validation. Native idiom (sheets, FlatList, safe areas) where
  the platform requires it; the web file is the spec for everything else.
- NEVER hand-edit PORT.md, a route stub, `src/styles/tokens.css` or
  `src/config/env.ts` -- they are regenerated. Fix their web source.
- NEVER mark a translation current with `--done` without having diffed the web
  change it follows.

## Next

> **Port pass complete.** PORT.md: copied N, translated T/U, screens S/R live.
> **Do next:** `react-native-verify` -- the gates, then the screen in Expo Go.
> **Items left?** Run `react-native-port` again for the next one.
