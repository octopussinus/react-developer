# AGENTS.md -- the native app

This is the **mobile version of a web app built with react-dev**: Expo SDK 57,
Expo Router, Uniwind (Tailwind v4 for React Native), TanStack Query, Zod,
i18next. It lives in its own repository, next to the web app, and most of its
code is the web app's code, copied across by `npm run port`.

## Where code comes from -- know this before you edit anything

| Kind of file    | Header on line 1                                 | Who owns it     | Edit it here?                                     |
| --------------- | ------------------------------------------------ | --------------- | ------------------------------------------------- |
| Copied verbatim | none (listed in `.react-dev-port.json`)          | the **web** app | No. Change it on the web, re-run `npm run port`.  |
| Translated (UI) | `// react-dev:translated-from <web file>@<hash>` | this app        | Yes. That is the work.                            |
| Generated       | `// react-dev:generated` / `react-dev:route`     | `npm run port`  | No. Edit the web source.                          |
| Route stub      | `// react-dev:route-stub`                        | `npm run port`  | No. Translate the page; the stub replaces itself. |
| Adapter         | `// react-dev:adapter`                           | this template   | Yes, carefully: the runtime under everything.     |

`PORT.md` is the worklist, re-derived on every `npm run port`. Never edit it.

## Rules

- **Expo Go first.** Never add a dependency with native code that Expo Go does
  not ship -- `npm run expo-go:check` fails if you do. Install with
  `npx expo install <pkg>`, never `npm install`, so versions match the SDK.
- **Translate, do not redesign.** Same component names, same file paths, same
  props (except DOM events: `onClick` -> `onPress`), same translation keys, same
  Tailwind classes wherever Uniwind supports them. The web file is the spec.
- **All text inside `<Text>`.** A bare string in a `<View>` crashes. Text does
  not inherit colour or size from its parent: put the classes on the `<Text>`.
- **Nothing scrolls unless told to.** Screens are `ScrollView` or `FlatList`.
  Lists of more than ~20 rows are `FlatList`, never `.map()` in a ScrollView.
- **Navigation is expo-router**: `useRouter()`, `useLocalSearchParams()`,
  `<Link href>`, `<Redirect>`. Never react-router.
- **Forms**: react-hook-form with `<Controller>` (a `TextInput` takes
  `value`/`onChangeText`, not `register()`'s DOM props). Same Zod schema.
- **Icons come from `@/platform/icons`** (generated: lucide names, styled by
  `className`). Give each icon its own `text-*` -- colour is not inherited.
- **No raw colours.** Role tokens only (`bg-card`, `text-muted-foreground`) --
  they come from the web app's stylesheets via `src/styles/tokens.css`.
- **Never edit `ios/` or `android/`.** They are generated (Continuous Native
  Generation) and gitignored. Native config lives in `app.json`.
- **Mocks are the web's.** `src/testing/mocks/handlers` is copied; the phone
  answers requests from it in development (`src/platform/mocks.ts`).

## Commands

```bash
npm run port            # copy/update from the web app, regenerate PORT.md
npm start               # Metro; scan the QR code with Expo Go
npm run verify          # format, lint, types, tests, Expo Go check, expo-doctor, bundles
npm run test:logic      # the web's own tests, against the copied code (Vitest)
npm run test:native     # native UI tests, *.native.test.tsx (jest-expo, RNTL 14: `await render`)
```

## Expo has changed -- do not trust your training data

Expo ships breaking changes every SDK. Before writing code against an Expo,
EAS or React Native API, read the major version of `expo` in `package.json` and
check `https://docs.expo.dev/versions/v<major>.0.0/` (index:
https://docs.expo.dev/llms.txt). Same for Uniwind: https://docs.uniwind.dev/llms.txt.
