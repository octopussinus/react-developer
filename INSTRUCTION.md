# Start here

**For someone who has never written code.** You will not write any. You will
type short commands and answer questions. The computer does the building.

Polska wersja: [INSTRUKCJA.md](INSTRUKCJA.md)

Making a phone app from your website: [INSTRUCTION-MOBILE.md](INSTRUCTION-MOBILE.md)

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

**Have your own designs?** (Optional.) Put them in the **`designs/`** folder of
your project before this step — PNG or JPG pictures of each screen (screenshots,
Figma exports, even a photo of a sketch) or HTML prototypes. One file per screen,
named after the page: `designs/home.png`, `designs/orders-list.png`. Phone-sized
versions can go in `designs/mobile/`. The assistant looks at them, plans from
them, builds each page to match, and compares its screenshots with them at the
end. `designs/README.md` in your project explains the naming.

**Step 2b — finish the prerequisites.**

The plan starts with a short list of **prerequisites** — things every page
depends on and that are not pages themselves: how data comes from the server,
signing in, your colours, the languages, the menu that frames every page. They
are listed as `P1`, `P2`… and `react-dev status` shows which are done.

```
/react-prerequisites
```

It goes through them in order. When one needs a decision from you it asks — one
question at a time, with a recommendation — then builds it, checks it and marks it
done. Run it until `react-dev status` shows them all done. **Do not start the
first page before that**: a page built on an open prerequisite is built on a
guess, and `/react-feature` will tell you so.

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

**Several features at once instead?** Once the plan and the prerequisites are
settled and their questions answered, you can build several features in
parallel — each by its own assistant, in its own copy of the project:

```
/react-parallel
```

It shows which features are safe to build together, asks how many, and starts
them. Faster, but you do not watch each one as it works — for your first few
features, stay with `/react-implement`. Details:
[Building several features at once](#building-several-features-at-once).

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

## Giving the assistant a clean slate

The assistant remembers everything said so far in the session. That is useful
while you build one thing and a liability once you move to the next: the old
conversation crowds out the new one and the answers get worse.

You clear it by typing:

```
/clear
```

**Only in three places**, and the assistant tells you when you reach them:

| After                              | Why                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------- |
| **Step 1** (`/react-constitution`) | The rules are written to a file the assistant always reads anyway       |
| **Step 2** (`/react-roadmap`)      | The plan is saved; planning a whole product is a very long conversation |
| **Step 11** (`/react-merge`)       | The feature is finished and everything about it is saved                |

**Never in the middle of a feature.** Steps 3 to 10 are one piece of work: the
decisions you made in step 5 are what step 7 builds from. Clearing there throws
them away and the assistant guesses again, worse.

The simple test: _would you have to explain the last task to a new person before
asking them to start this one?_ If no — clear. If yes — do not.

If a single feature runs very long and the assistant starts slowing down, there
is a gentler option that summarises instead of forgetting:

```
/compact
```

Use that one **while** working on something; use `/clear` **between** things.

### Letting it happen by itself

You can skip remembering any of this:

```
react-dev next
```

It looks at where your project is, closes nothing, and opens a **brand new
assistant session** already pointed at your next step — whichever assistant you
have installed, phrased the way that one expects. A new session has no memory of
the old one by definition, so the clean slate is automatic rather than something
you have to do at the right moment.

One honest limit, and it tells you: only what is **written into files** comes
along. At a feature boundary that is everything. In the middle of a feature, if
you just agreed something in chat that nobody wrote down, say it again or write
it down first.

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

Each button has an **(i)** next to it. Click it and you get one sentence on what
choosing that option will actually make the assistant do — worth reading once.

That records exactly which file and which line drew that thing. Next time you
type anything to the assistant, it already knows what you pointed at and what you
asked for — so you never have to describe where something is.

### Nothing you send disappears

The **List** button, next to Feedback, shows everything you have sent and where
it stands. It opens **beside** whatever is already open rather than on top of it,
so you can read your list while the feedback panel is still up — and the same
goes for every other panel in that corner:

| Label           | Means                                                         |
| --------------- | ------------------------------------------------------------- |
| **waiting**     | Sent. Nobody has started yet                                  |
| **in progress** | The assistant is on it, or has finished and is waiting on you |
| **done**        | You confirmed it is actually fixed                            |

When the assistant finishes something, it writes a short note saying what it
changed and what to look at — and the entry shows **Yes, done** and **Not fixed**
underneath. **Only you can press those.** The assistant cannot mark its own work
done, which is deliberate: the only real test of "is it fixed" is you looking at
the screen.

**Not fixed** sends it back to the top of the list and clears the assistant's
note, so the next attempt starts fresh. Once you confirm something as done the
assistant never reads it again.

Every entry, at any stage, also has two buttons of its own:

- **Edit** — reword it. Useful when you reread what you wrote and it is vaguer
  than you meant. It stays exactly where it is: rewording a report does not
  change whether it is done.
- **Delete** — remove it for good. It asks first, and it is the only thing in
  the whole system that deletes anything. The assistant can never do this; if it
  thinks something is finished, all it can do is say so and wait for you.

## Seeing what was reused and what is new

Next to **Feedback** there is a **Dev** button. Click it and every piece of the
page gets a coloured outline:

| Colour         | What it means                                                                |
| -------------- | ---------------------------------------------------------------------------- |
| **Green**      | Reused — this already existed, the assistant did not rebuild it              |
| **Purple**     | New, but put in the shared pile — only right if another page will use it too |
| **Blue**       | Written specially for the feature you are working on                         |
| **Light blue** | Feature code that is older than this piece of work                           |
| **Grey**       | The frame around the page: menu, layout                                      |

This is the quickest way to answer "did it reuse my stuff, or quietly build a
second version of the same thing?" Lots of blue where you expected green usually
means something was rebuilt that already existed.

The panel in the corner looks and works like the feedback panel: it counts each
group, and every row has an **(i)** that explains what that colour means and what
to do about it — so you never have to guess what "New, placed as shared" is
telling you. Click a row to hide that group. Press **Esc** or click **Dev** again
to turn it off.

**About "I want this elsewhere too":** the assistant will ask you _which page_
needs it as well. That is on purpose. Making something shared before two pages
really use it tends to create a component that fits neither — so "just in case"
is not a good enough reason, and it will say so.

---

## Seeing the whole site as a map

The **Map** button, next to Feedback, draws every page of your site and every
button or link that moves between them.

It opens on **half the screen, beside your site** rather than over it — your page
is still there, still working, just narrower. **Drag the left edge of the map** to
give either side more room; it remembers the width you chose.

It does not throw all of it at you at once. It starts at the home page, and any
page that leads somewhere shows a small `▸` and a number — `▸ +6` means six ways
out. **Click the page and it opens**, showing exactly which pages it can send you
to. Click it again to fold it away. `Expand all` and `Collapse` are in the
top-left corner.

- the name on each arrow is **the component responsible for that jump** — the
  file to open if you want to change where it goes
- a **blue line** is a normal link
- a **purple line** is an automatic redirect — nobody clicks it, it just happens
- an **amber page** is one nothing links to — usually a mistake worth checking
- a **lock** means the page needs a permission

**Click any arrow** and a panel tells you the rest: the text you click (or, for
an automatic redirect, the condition that triggers it, like
`if status === 'unauthenticated'`), whether it is a link or a button, which
component contains it, and the **file and line number** — with a button to copy
that. So the map does not just say "these two pages are connected", it says
where to go and change it.

### Show me, on the page

Every box has a small **↗**. Press it and two things happen at once: your site
jumps to that page in the other half, and **every link out of that page gets a
coloured outline, on the page itself**, labelled with where it goes.

Links to the same destination share a colour, and the arrow in the map is drawn in
that same colour — so "the pink ones go to the dog profile" is something you can
see in both halves at once. If the first outlined link is below the fold, the page
scrolls to it.

Under the map you get the count: **"4 of 6 on screen"**. The other two are greyed
out, and that is the useful part — a link can exist in the code and not be drawn
right now, because it lives inside a closed menu, or in an empty state, or in a
branch this data never reaches. Four outlines with no count would simply read as
"there are four".

A page with a `:` in its name (`/dogs/:dogId`) cannot be visited as written, so it
opens with a `1` in place of the parameter (`/dogs/1`) and says so.

Some buttons decide where to go while the app is running, and no amount of
reading the code can tell you that in advance. Those are drawn as a dashed arrow
to a **"? decided at runtime"** box rather than hidden — clicking it still shows
you the component and the line, so you can go and read what it does.

Worth opening after building a few pages: it is the fastest way to spot a page
you built but forgot to link to from anywhere.

---

## Seeing your building blocks on their own

The **Storybook** button, next to Map, opens your project's component
library — every button, badge, card and form field on its own, away from any
page, with the knobs to try each variation.

It is the place to answer "what do I already have?" before asking for something
new, and to see a component in every state at once: a badge in all four tones, a
button disabled, a form field with an error on it.

It needs one thing running. In a second terminal, in your project:

```
npm run storybook
```

If it is not running, the button says so and shows you that exact command. The
address it uses is **this project's own** — two projects open at the same time
cannot end up showing you each other's components, which is the sort of mix-up
you would not notice.

## Using the same component in another project

Three levels, and the assistant handles the first two by itself:

| Level                       | When                          | What happens                                                      |
| --------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| Inside one feature          | always                        | The component is created in that feature's folder                 |
| Shared in this project      | a second page needs it        | `promote` moves it to a shared folder, and every use is rewritten |
| **Shared between projects** | a **second project** needs it | You publish it to the registry — see below                        |

The third one is **not automatic, on purpose**. Once a component is published,
other projects install it, and you cannot un-publish it — so it is a decision you
make, not something that happens quietly in the background.

To publish, ask for it:

```
> /react-publish
```

It will not just do it. First it checks four things, and stops if any fails:

1. **A second project actually needs it** — it will ask you which one, by name.
   "It feels generic" is not a reason; that is how a shared library fills up with
   things nobody uses.
2. **It knows nothing about your business.** A component that mentions `Order` or
   `Dog` is useless in a project that has neither.
3. **It uses your theme's colour names, not fixed colours.** Otherwise it drags
   your brand into somebody else's app.
4. **It is in the right folder level**, because that is baked in and every
   project that installs it gets it in the same place.

If it passes, the assistant adds it to the registry, checks it installs cleanly
into a fresh project, and tells you to push.

### Getting it into another project

In the other project's folder:

```
npx shadcn@latest add @react-dev/NAME
```

Replace `NAME` with the component's name in lowercase-with-dashes — for example
`npx shadcn@latest add @react-dev/data-table`. It drops the component, its story
and its test into the right folder and installs anything extra it needs. Then run
`npm run verify`.

**This short form only works once the registry is published.** Until then — and
right now it is not published — use the full path to the file instead:

```
npx shadcn@latest add /path/to/react-developer/registry/public/r/NAME.json
```

That does exactly the same thing and works today on your own machine. Ask the
assistant to publish the registry if you want the short form; it needs the
project's code hosting set up once.

## Switching theme and language while you work

Two more buttons sit to the left of **Feedback**:

**The theme button** shows what is active, like `Default · system`. Click it for
a menu with **three themes** and light/dark/system. The themes are not just
different colours — buttons and inputs genuinely change shape: corners,
thickness, weight, shadow. Flipping between them is the fastest way to catch
anything with a colour or a corner radius baked in instead of taken from the
design tokens.

**The language button** shows `EN` or `PL` and toggles between them. Your project
always has both, even when the design shows only one, because a layout that only
survives English is a layout nobody tested — German and Polish words are longer
and break things.

Both are developer tools, not part of your site. If your design wants a real
theme or language picker for your users, ask for one; these two keep working
either way.

Every project starts with three themes and two languages whether or not the
design mentions them. If you have a design, ask the assistant to reshape the
three to match it — **do not drop to one**. The spare themes cost nothing and
they are what catches a hardcoded colour early.

## Three more things worth knowing

### Storybook — seeing every state of a component

Your site shows a loading spinner for half a second and an error screen only when
something actually breaks. Storybook shows every one of those states on demand,
each component on its own page:

```
npm run storybook
```

Then open the address it prints — normally **http://localhost:6006**, but if that
number is taken it quietly uses another one, so read the line rather than
assuming. Leave it running in its own Terminal, like the site itself.

Every component the assistant builds gets a page here — that part is automatic,
and the project rules require it. The extra states (loading, empty, error, very
long text) are written in as it implements the component, so if one is missing,
that is a fair thing to ask for. A switch in the top bar flips the whole thing
between light and dark.

At the bottom of every page there is a **grey bar with the file path** of the
component you are looking at — `src/components/atoms/badge.tsx` — and a **Copy
path** button that copies the full path from your disk. That is the quickest way
to answer "where does this thing actually live?"

Separately, `npm run visual` photographs your **real pages** in light and dark
and tells you if anything moved since last time. Different tool, same idea.

Think of it as the workshop. The site is the finished room.

### `/react-i18n` — languages

Your project starts with **English and Polish**. No visible text is written
directly into the code — it all lives in translation files, so adding a language
never means hunting through components.

```
> /react-i18n
```

Use it to add a language, or when a translation is missing. The automatic check
(`npm run i18n:check`) compares the languages and **fails if one is missing a
line** — so a half-translated screen cannot quietly ship showing English in the
middle of Polish.

### `/react-feedback` — teaching it to stop repeating a mistake

If you correct the same thing three times, that is not a correction any more —
it is a missing rule.

```
> /react-feedback
```

It reads everything you sent with the **Feedback** button plus the corrections
you typed, groups them, and when something has come up **three or more times** it
turns that into a permanent rule: either a line in `AGENTS.md` that the assistant
reads every single time, or — if the rule can be checked by a machine — an
automatic check that fails the build.

Worth running every week or so, and after any review. It is the only part of the
system that makes the assistant get better at _your_ project rather than staying
the same.

## Building several features at once

The normal loop is one feature at a time, and for your first few that is the
right way. Once the plan is settled, the assistant can also build several at
once — each one in its own **separate copy of your project**, by its own
assistant, all at the same time.

What you type:

```
react-dev parallel
```

That prints which features are safe to build together **and why the rest are
not**. Two features that touch the same part of the app are never in the same
batch: both copies would edit the same file, and the two edits would be
combined into something that does not work.

Then:

```
react-dev dispatch
```

Each one gets its own assistant, running on its own, with no window for you to
watch. You see a live table instead:

```
  #    Feature        Status     Time   Doing
  011  medications    ok          14m   ok
  017  matches        blocked      3m   stopped on a [NEEDS CLARIFICATION]
  024  product        running     11m   Bash npm run verify
```

- **ok** — finished, all checks green
- **blocked** — it hit a question it is not allowed to answer by itself, and
  stopped. That is the correct behaviour, not a failure
- **failed** — something broke; the reason is printed

**Nothing is lost.** Every one of those assistants writes its whole session to
`.ai/runs/`, and you can read it afterwards: every command it ran, every file it
touched, what it said at the end, and how long it took. Open
`transcript.md` inside the folder it names. `react-dev runs` lists every batch
you have ever run, and `react-dev runs --id <name>` opens one of them.

This works the same with Claude Code, Codex or Gemini CLI — `--agent codex` and
`--agent gemini` pick one. The pipeline does not change; only who runs it.

**They do not publish anything.** Each one stops at "finished and checked". You
land them one at a time afterwards, and the assistant walks you through it —
because two finished features are not the same as two features that work
together, and the only way to find out is to check them combined.

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
4. **Do not run two features at once by hand.** Finish one through step 11,
   then start the next. When you genuinely want several, use `react-dev
dispatch` — it keeps them apart properly.

---

## The one thing to remember

**Read the last block of every reply. Type the command it gives you.**

Everything else in this file is detail you can look up when you need it.
