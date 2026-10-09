---
name: react-mobile
description: Make the mobile (Expo / React Native) version of this web app in a separate repository, or bring an existing one up to date - copying all the code that runs on a phone and translating the screens. Use when the user wants a mobile app, an Expo Go version, an iOS/Android app, or to sync the mobile app after web changes.
allowed-tools: Bash, Read, Glob, Grep
---

# React Mobile

**Toolbox skill** -- the way from this web app to its mobile app. The mobile app
is its **own repository**, next to this one. This repository is only read,
never written: nothing here changes.

## 1. Find or create the mobile app

Default location: a sibling folder, `../<this-folder>-mobile`. Use another only
if the user names one.

```bash
ls ../<name>-mobile/.react-dev.json 2>/dev/null   # exists already?
```

**New** -- create it (the CLI copies the Expo template, wires the agents and
records which web app it ports from):

```bash
react-dev init ../<name>-mobile --type react-native --from .
cd ../<name>-mobile && npm install && npm run port && npm install
```

The second `npm install` is not a typo: the port aligns the mobile app's
dependencies with the versions this web app's code was written against.

**Existing** -- bring it up to date:

```bash
cd ../<name>-mobile && npm run port
```

## 2. Report what the port says

From the mobile app's `PORT.md` header: files copied verbatim, files to
translate, screens live. Then the three facts the user needs to try it:

- `cd ../<name>-mobile && npm start`, scan the QR code with **Expo Go**;
- the app targets Expo SDK 57 -- on iPhone the App Store's Expo Go may lag
  behind; the mobile app's README.md says what to do;
- screens not translated yet show a "Not ported yet" placeholder, never a crash.

## 3. Hand over to the mobile repository

To translate many screens at once, from the mobile app's folder after a
commit: `react-dev dispatch` (parallel headless agents, wave by wave).



The translation is done there, by the agent opened **in that folder**, with
the skills `react-dev init` installed in it: `react-native-port` (the loop) and
`react-native-verify` (the gates and a real run in Expo Go). Do not translate
screens from here -- this session's rules and checks are the web app's.

## Hard rules

- NEVER write into this web repository: no files, no branches, no commits.
- NEVER create the mobile app inside this repository (not in a subfolder
  either) -- the web app's lint, tests and builds would sweep it up.
- NEVER copy files across by hand. `npm run port` tracks what came from where;
  a hand copy is invisible to it and breaks the next update.

## Next

> **Mobile app ready** at `../<name>-mobile` -- N files copied, T to translate, S/R screens live.
> **Do next:** open your agent in `../<name>-mobile` and run `react-native-port`.
