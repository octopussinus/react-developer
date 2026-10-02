# Start here

**For someone who has never written code.** You will not write any. You will
type short commands and answer questions. The computer does the building.

Polska wersja: [INSTRUKCJA.md](INSTRUKCJA.md)

---

## What this actually is

You are going to build a website by **talking to an assistant**. The assistant
can write files on your computer. This project gives it a strict set of
instructions so it builds things the same careful way every time, and checks its
own work before telling you it is done.

There are **eleven steps**. You do them in order. Each step is one short command.
After every command the assistant tells you the next one, so you never have to
remember the list.

You will do steps 3–11 **once for every page or feature** you want. The first two
steps happen only once, at the very beginning.

---

## Words you will see

| Word         | What it means                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Terminal** | A window where you type commands instead of clicking. On Windows search for "Terminal", on Mac search for "Terminal". |
| **Command**  | A line of text you type and then press Enter.                                                                         |
| **Folder**   | Exactly what you think. Your project lives in one.                                                                    |
| **Feature**  | One thing a person can do on your site: sign up, see a list, pay.                                                     |
| **Gate**     | An automatic check. Think of a car inspection: it either passes or it tells you what is broken.                       |
| **Branch**   | A safe copy of your project to work in, so a mistake cannot damage the finished parts.                                |

When you see a box like this, type the line inside it and press Enter:

```
npm run dev
```

---

## Part 0 — set up once (about 20 minutes)

You only ever do this once on a computer. There are four things, and you install
them in this order.

**1. Install Node.js.** Go to <https://nodejs.org> and download the big green
button. Install it like any normal program. You need version 20 or newer; the
site gives you a newer one anyway.

**2. Install a helper called `uv`.** This is what installs the project tool.
Open Terminal and paste **one** line, depending on your computer.

On Mac or Linux:

```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

On Windows:

```
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Then close Terminal completely and open it again.** This matters — the new
command only exists in a fresh window.

**3. Install the project tool:**

```
uv tool install react-developer --from https://github.com/octopussinus/react-developer.git
```

**4. Install the assistant:**

```
npm install -g @anthropic-ai/claude-code
```

**5. Check all of it worked.** Type each of these three lines:

```
node --version
react-dev version
claude --version
```

You should get a version number from each one, like `v22.22.0`. If any of them
says **"command not found"**, that one did not install:

- `node` → redo step 1
- `react-dev` → redo steps 2 and 3, and make sure you closed and reopened Terminal
- `claude` → redo step 4

---

## Part 1 — make your project

**1. Make the project.** In Terminal, type this (change `mysite` to any name you
like, no spaces):

```
react-dev init mysite
```

**2. Go into it:**

```
cd mysite
```

`cd` means "go into this folder". You will use it often.

**3. Download the parts it needs.** This takes a few minutes and prints a lot of
text. That is normal.

```
npm install
```

**4. Check nothing is broken:**

```
npm run verify
```

This runs every automatic check. If the last line is not an error, everything is
healthy. **If it fails here, before you have changed anything, something went
wrong with the download** — say so and ask for help rather than continuing.

---

## Part 2 — see your website

This is the part people want first.

**1. Start it:**

```
npm run dev
```

**2. Look at what it printed.** Among the text there is a line like this:

```
  ➜  Local:   http://localhost:5173/
```

**Open that exact address in your browser.** Usually it is `5173`, but if that
number was already taken it quietly uses `5174` or `5175` instead — so read the
line rather than assuming. In many Terminals you can just Ctrl+click it.

Your site is now on the screen. **Leave this Terminal window alone** — closing it
or pressing Ctrl+C turns the site off. The site updates by itself the moment the
assistant changes anything, so keep this browser tab open while you work.

To stop it later: click that Terminal window and press **Ctrl+C**.

> `localhost` means "this computer". Nobody else can see this address. Your site
> is not on the internet yet, and nothing you do here is public.

---

## Part 3 — open the assistant

Open a **second** Terminal window, so the first one can keep running your site.

Go into your project folder and start the assistant:

```
cd mysite
claude
```

You are now talking to it. Type in normal sentences. The special commands start
with a slash, like `/react-spec` — you type those exactly.

---

## Part 4 — the eleven steps

Do these in order. **You do not have to memorise them.** Every single one ends by
telling you the next command. Read the last three lines of what the assistant
says and ignore everything above them:

```
> Stage 4 of 11 complete. spec.md written — 7 open questions.
> Do next: /react-clarify — it asks them one at a time.
> Zero questions? /react-implement directly.
```

That is the whole trick. **Last block, one command, type it.**

### Once per project

**Step 1 — agree the rules.**

```
/react-constitution
```

It asks a few questions about your project and writes the rules down. Everything
afterwards obeys them. Takes a couple of minutes.

**Step 2 — plan the whole site.**

```
/react-roadmap
```

Describe what you want, in your own words, as long as you like. "A site where dog
owners keep vaccination records and meet other owners nearby." It turns that into
a numbered list of features in a sensible order, and writes down every question it
could not answer.

If you designed your pages in **Google Stitch** first, tell it so and it will use
those designs.

### Then once per feature, over and over

**Step 3 — answer the important questions.**

```
/react-clarify
```

It asks you **one question at a time**, with a few options to choose from and a
recommendation. Pick a number. This is the most useful ten minutes you will
spend: a wrong assumption caught here costs nothing, and caught later costs days.

If you genuinely do not know, say "you decide" — it will choose, write down what
it assumed, and flag it.

**Step 4 — start one feature.**

```
/react-feature 1
```

The `1` is the feature number from the plan. It sets up a safe copy to work in
and creates the files.

**Step 5 — write down exactly what will be built.**

```
/react-spec
```

It writes a description of the feature and marks everything it is unsure about.
**The marks are good news.** A plan with seven honest questions beats a confident
one that invented seven answers.

**Step 6 — answer those questions.**

```
/react-clarify
```

Same as step 3, now about this one feature.

**Step 7 — build it.**

```
/react-implement
```

This is the long one. It writes the actual code. Look at your browser tab when it
finishes — the page will have changed.

**Step 8 — check it works.**

```
/react-verify
```

It runs every automatic check, opens a real browser invisibly, clicks through
your page, and takes pictures to compare against last time. It reports what
actually happened, not what it hopes happened.

**If something is red, do not continue.** The assistant will say what broke and
what to run. Red here is the system working.

**Step 9 — final read-through.**

```
/react-analyze
```

Compares what was built against what you agreed in step 5. Finds things that
quietly drifted. It only reports — it never changes anything.

**Step 10 — have the code checked properly.**

```
/react-review
```

Step 8 checked that the machine is happy. This step looks for the mistakes a
machine cannot notice — things like a list that shuffles rows when you filter it,
or a spinner that never stops if two things load at once.

It writes what it found into a file, with a label on each one. Anything labelled
`blocker` will **stop** the next step until it is fixed. If that happens, run
`/react-implement` to fix it, then `/react-verify`, then this step again.

**Step 11 — finish and put it away.**

```
/react-ship
```

Packages the work up neatly, with the review attached. It **refuses** if the
checks are failing or something is unfinished — that refusal is the point.

Then:

```
/react-merge
```

This folds the finished feature into your main site and ticks it off the plan. It
then tells you which feature is now possible next.

**Now go back to step 4 with the next number.** That is the whole loop.

---

## If you get lost

Type this in the Terminal where you are **not** running the site:

```
react-dev status
```

It prints every feature, how far along each one is, and the single command to run
next. It works this out by looking at your actual files, so it is right even if
you did something by hand or took a week off.

```
   #  Feature        Pipeline    Stage      Next
●  1  landing        ━━━━━━━━    merged
◐  2  dog-profile    ━━━━┄┄┄┄    clarified  /react-implement
○  3  weight         ━┄┄┄┄┄┄┄    planned    /react-feature 3
```

Full circle = done. Half circle = in progress. Empty circle = not started.

---

## When something looks wrong on the page

You do not need to describe where it is. **Point at it.**

While your site is running in the browser, there is a small **Feedback** button
in the corner.

1. Click **Feedback**. It changes to "Click an element…".
2. Click the thing on your page you want to talk about.
3. A small panel opens. Add a note if you want, then pick what you want:

| Button                         | What it does                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------- |
| **Something is wrong with it** | Reports it as a problem to fix                                                |
| **I want this elsewhere too**  | Asks for it to be made reusable on other pages                                |
| **Change how it looks**        | Treated as a colour/spacing change across the whole site, not a one-off patch |
| **Fix the wording**            | Sends it to the translation files, so both languages stay in step             |
| **Explain what this is**       | Just explains it; changes nothing                                             |

That records exactly which file and which line drew that thing. Next time you
type anything to the assistant, it already knows what you pointed at and what you
asked for — so you never have to describe where something is.

## Seeing what was reused and what is new

Next to **Feedback** there is a **Dev** button. Click it and every piece of the
page gets a coloured outline:

| Colour     | What it means                                                                |
| ---------- | ---------------------------------------------------------------------------- |
| **Green**  | Reused — this already existed, the assistant did not rebuild it              |
| **Purple** | New, but put in the shared pile — only right if another page will use it too |
| **Blue**   | Written specially for the feature you are working on                         |
| **Grey**   | The frame around the page: menu, layout                                      |

This is the quickest way to answer "did it reuse my stuff, or quietly build a
second version of the same thing?" Lots of blue where you expected green usually
means something was rebuilt that already existed.

The panel in the corner counts each group; click a row to hide it. Press **Esc**
or click **Dev** again to turn it off.

**About "I want this elsewhere too":** the assistant will ask you _which page_
needs it as well. That is on purpose. Making something shared before two pages
really use it tends to create a component that fits neither — so "just in case"
is not a good enough reason, and it will say so.

---

## When something goes wrong

| What you see                                           | What to do                                                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command not found: react-dev`                         | You are not in the right place, or Part 0 did not finish. Try `cd mysite` first.                                                                          |
| `command not found: npm`                               | Node.js is not installed. Go back to Part 0, step 1.                                                                                                      |
| The browser says "can't be reached"                    | Either your site is not running — go to the first Terminal and type `npm run dev` — or you opened the wrong number. Re-read the `Local:` line it printed. |
| The page loads but it is somebody else's project       | You opened `5173` while your site is on `5174`. Read the `Local:` line again.                                                                             |
| The page is blank and white                            | Look at the Terminal running the site. The error is in there — copy the red text and paste it to the assistant.                                           |
| A check is red and you do not understand it            | Paste the whole thing to the assistant and say "explain this in plain words". That is a completely reasonable request.                                    |
| The assistant stopped without telling you what is next | Type `react-dev status`.                                                                                                                                  |
| You think you broke everything                         | You almost certainly did not — your finished work is in a separate safe copy. Type `react-dev status` and say what you were doing.                        |

---

## Four things not to do

1. **Do not skip steps 8 and 10.** Unchecked work piles up, and the pile is what becomes
   impossible to fix later.
2. **Do not write files yourself** in the project folder. Ask the assistant. It
   keeps everything in a shape the tools understand.
3. **Do not answer "whatever you think" to everything** in step 3 and 6. Two or
   three real decisions there save days.
4. **Do not run two features at once.** Finish one through step 11, then start the
   next. The system is built around one at a time.

---

## The one thing to remember

**Read the last block of every reply. Type the command it gives you.**

Everything else in this file is detail you can look up when you need it.
