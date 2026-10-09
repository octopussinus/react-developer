---
name: react-native-verify
description: Prove the mobile app works - run every gate (format, lint, types, the web's tests against the copied code, native UI tests, Expo Go compatibility, expo-doctor, iOS and Android bundles), then open the changed screens in Expo Go on an Android emulator and check them. Use after each ported screen and before saying a port step is done.
allowed-tools: Bash, Read, Glob, Grep
---

# React Native Verify

**Toolbox skill** -- the mobile app's gate. Claims are only allowed for commands
you ran.

## 1. Static gates

```bash
npm run verify
```

| Step | What it proves |
|---|---|
| `format:check`, `lint` | style; copied files are linted on the web side, not here |
| `typecheck` | regenerates Uniwind's className types, then `tsc` |
| `test` | `test:logic` (the web's own tests, Vitest) + `test:native` (`*.native.test.tsx`, jest-expo) |
| `expo-go:check` | no dependency with native code Expo Go lacks |
| `doctor` | expo-doctor: versions match the SDK, config is valid |
| `bundle` | iOS **and** Android bundles build -- every screen compiles, on Linux |

Never weaken a gate to pass it: no skipped test, no `eslint-disable`, no
dependency removed from the check. Fix the cause; after three failed attempts
stop and report the exact output.

**A copied web test fails?** Run the same file in the web app first
(`npx vitest run <file>` there). If it fails there too, it is a web bug the
port carried faithfully: report it as one, to be fixed on the web side and
re-ported -- never by editing the copy here.

## 2. Run it -- a bundle that builds can still render blank

When `adb` and an Android emulator exist (`emulator -list-avds`), open every
screen changed in this pass in **Expo Go**, exactly as the user will:
[references/emulator.md](references/emulator.md). Check, per screen:

- it renders content -- not a stub, not blank, not a red error screen;
- `npm start`'s log has no `ERROR` and no red-box `Uncaught Error`;
- the mocked data shows (mocks are on in development);
- text is legible in light and dark, nothing runs under the status bar.

No emulator? Say so in the report and give the user the one command to check
it themselves: `npm start`, then scan the QR code with Expo Go.

## 3. Compare with the web

Same screen on the web (its dev server, same route): same content, same
actions, same states. It should look like a phone app, not identical -- but a
missing button or a missing empty state is a bug.

## Report

| Gate | Result | Detail |
|---|---|---|
| verify | pass/FAIL | the failing step and its first error |
| Expo Go | pass/FAIL/not run | screens opened, errors seen, screenshots |
| web parity | pass/FAIL/not run | what differs |

End with one line: ready, or blocked on X.

## Next

> **Verified.** Gate table above; screens checked in Expo Go: N.
> **Do next:** `react-native-port` -- the next item in PORT.md.
> **Anything red?** Fix it first; do not port on top of a red gate.
