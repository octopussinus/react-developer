# The phone app — start here

**For someone who already has a website made with react-dev** and wants a phone
app (iPhone and Android) made from it. You will not write code. You will type
short commands and answer questions.

Polska wersja: [INSTRUKCJA-MOBILE.md](INSTRUKCJA-MOBILE.md) · The website itself:
[INSTRUCTION.md](INSTRUCTION.md)

---

## What this actually is

Your website stays exactly as it is. Next to it, a **separate folder** gets the
phone app, built with **Expo**. The website's folder is only read — nothing in
it changes.

It happens in two stages:

1. **Copying.** One command brings across everything that runs on a phone as it
   is: data, calls to the server, form rules, translations, your colours and
   themes, even your tests. On a real project that is hundreds of files in
   seconds. Every page of the website gets its own screen in the app.
2. **Rewriting the screens.** What draws the screen has to be rewritten for a
   phone. An assistant does that — one file at a time, or several assistants at
   once.

Screens not rewritten yet show a **"Not ported yet"** card. The app never
crashes because of them.

---

## Words you will see

| Word        | What it means                                                                                |
| ----------- | -------------------------------------------------------------------------------------------- |
| **Expo Go** | A free phone app. You scan a QR code with it and see your app without installing it.         |
| **Port**    | Copying the website into the phone app. The `npm run port` command does it.                  |
| **PORT.md** | The list of what is left to rewrite, in order. It writes itself — do not edit it.            |
| **Screen**  | What a page is on the website.                                                               |
| **Wave**    | One round of several assistants working at once. Everything is checked and saved after each. |
| **Commit**  | A saved point in the project's history that you can always go back to.                       |

---

## Part 0 — set up once

**1. You need a working website made with react-dev** and everything from Part 0 of the
main guide ([INSTRUCTION.md](INSTRUCTION.md)): Node.js, `react-dev`, the assistant.

**2. Install Expo Go on your phone.** Search for "Expo Go" in the Play Store or
the App Store.

- **Android:** works straight away — the computer offers the right Expo Go.
- **iPhone:** the App Store's Expo Go can be a version behind this app (Expo SDK 57) for a while. If the phone says the project is incompatible, the
  `README.md` in the phone app's folder says what to do.

**3. Update react-dev** if you installed it a while ago:

```
uv tool install react-developer --reinstall --from https://github.com/octopussinus/react-developer.git
```

---

## Part 1 — make the phone app

Type everything in the Terminal. Replace `mysite` with your website's folder name.

**1. Go into the website's folder:**

```
cd mysite
```

**2. Create the phone app next to it:**

```
react-dev init ../mysite-mobile --type react-native --from .
```

The dot at the end means "from this folder". The app is created **next to** the
website, never inside it.

**3. Go into it:**

```
cd ../mysite-mobile
```

**4. Download what it needs.** A few minutes, lots of text — that is expected.

```
npm install
```

**5. Bring the website across:**

```
npm run port
```

It ends with a summary: how many files were copied, how many are left to
rewrite, and how many screens already work (0 at first — that is normal).

**6. Download once more** — the port matched versions to the website:

```
npm install
```

**7. Check nothing is broken:**

```
npm run verify
```

If the last line is not an error, everything is healthy.

**8. Save this point:**

```
git add -A
git commit -m "phone app: first port"
```

---

## Part 2 — see it on your phone

```
npm start
```

A QR code appears. Scan it with **Expo Go** (on iPhone, with the normal camera).
The phone and the computer must be on the same Wi-Fi.

**Phone cannot connect?** Stop it (Ctrl+C) and use this instead:

```
npx expo start --tunnel
```

At first every screen shows the "Not ported yet" card. That is expected — time
to rewrite them.

---

## Part 3 — rewriting the screens

Open your assistant **in the phone app's folder** (not the website's):

```
claude
```

There are two ways. You can mix them.

### Way A — one at a time, you see every step

```
/react-native-port
```

The assistant reads `PORT.md` and rewrites the next file or screen. It starts
with the files that unlock the most — sometimes one small file brings hundreds
of others across with it. Type the command again to keep going, or tell it:
_"keep going until PORT.md is empty; only stop when you need a decision from me"_.

### Way B — several assistants at once, faster

```
/react-native-parallel
```

The assistant first checks everything is saved and healthy, then **asks you**:

- which assistant to work with (Claude Code, Codex or Gemini — whichever you have),
- how many at once, and how many files each,
- one wave to try it, or all the way.

**Start with one wave** and look at the result on your phone. Every background
assistant is a paid run (with Claude roughly $0.50–2 per wave of a few files).

After every wave everything is checked and saved as a commit, so nothing
half-done ever lands. Each assistant's work is in the `.ai/runs/` folder.

You can run the same thing yourself, without the assistant:

```
react-dev dispatch --dry-run
react-dev dispatch --limit 3 --files 3 --waves 1
```

`--dry-run` shows the plan and starts nothing. `--agent gemini` or
`--agent codex` picks another assistant.

### Decisions that are yours

Sometimes an assistant reaches something it may not decide alone — for example
how a map should work on a phone. It stops on that one file and asks you. You
answer, it finishes.

### Checking

After each rewritten screen:

```
/react-native-verify
```

It runs every check and, where it can, opens the screen in Expo Go.

---

## Part 4 — when the website changes

Changed something on the website? In the phone app's folder:

```
npm run port
```

- Copied files update themselves.
- A screen already rewritten is marked **stale** when the page it came from
  changed. The assistant carries the change across on the next
  `/react-native-port`.
- A file changed **both** on the website and in the app is marked **diverged** —
  that one is your call.

---

## Part 5 — when Expo Go is no longer enough

Expo Go contains a fixed set of phone features. If the app needs something
outside it (payments, maps with your own key, other native libraries), you
switch to a **development build** — your own version of Expo Go. The code does
not change. The commands are in `README.md` in the phone app's folder.

---

## When something goes wrong

| What you see                                    | What to do                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| `npm run verify` is red                         | Type `/react-native-verify` and ask the assistant to fix it.             |
| The phone cannot reach the computer             | `npx expo start --tunnel`                                                |
| "Project is incompatible with this Expo Go"     | A different Expo Go version — see the phone app's `README.md`.           |
| `react-dev dispatch` says "Uncommitted changes" | Save first: `git add -A` and `git commit -m "..."`.                      |
| The assistant asks for a decision               | Answer it. It is a question it should not settle by itself.              |
| You have a phone app from an earlier version    | `react-dev sync --with-template`, then `npm install` and `npm run port`. |

---

## Things not to do

- **Do not edit the website's files from the phone app.** Change the website on
  the website, then `npm run port`.
- **Do not edit `PORT.md`.** It rewrites itself on every `npm run port`.
- **Do not create the phone app inside the website's folder.** Always next to it.
- **Do not install libraries with `npm install <name>`.** Ask the assistant — it
  checks they work in Expo Go.
