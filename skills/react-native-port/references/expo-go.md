# Expo Go, and leaving it

## What Expo Go is

A prebuilt app from Expo with a fixed set of native modules (the list is
`node_modules/expo/bundledNativeModules.json`). Your JavaScript runs inside it,
so there is no native build: scan a QR code and the app is on the phone.

Anything JavaScript-only works. Anything with native code works **only** if
Expo Go ships it -- maps, camera, location, notifications, Skia, WebView,
secure storage, haptics, image picker and most of the Expo SDK do. A native
module outside that list builds, bundles and passes every test, then crashes
on the device. `npm run expo-go:check` turns that into a failing gate.

## Versions

Expo Go opens exactly one SDK. This app targets SDK 57 (see `package.json`).
On Android, `npm start` installs the matching Expo Go on a phone or emulator.
On iPhone the App Store's Expo Go can lag behind the latest SDK while Apple
reviews it; `npx eas-cli@latest go` installs one for SDK 57 through TestFlight
(Apple Developer account), or use a development build.

Never upgrade the SDK by hand-editing versions. `npx expo install expo@^58.0.0`
then `npx expo install --fix`, then `npm run verify`.

## When a screen needs something Expo Go does not have

Stop and tell the user -- it changes how they run the app. The switch is small
and nothing in the code changes:

```bash
npx expo install expo-dev-client <the-native-package>
npx eas-cli@latest build --profile development --platform android
```

Install the build it produces on the phone; `npm start` now opens the app in
it. Then remove `npm run expo-go:check` from the `verify` script. `ios/` and
`android/` stay generated and out of git (`npx expo prebuild` makes them when a
local `npx expo run:android` needs them); native settings go in `app.json`.

## Not native modules, but often mistaken for them

JavaScript-only, so fine in Expo Go: `victory-native` and `@gorhom/bottom-sheet`
(they sit on Skia/Reanimated, which Expo Go ships), `react-hook-form`, `zod`,
`zustand`, TanStack Query, i18next, date libraries, `lucide-react-native`.
