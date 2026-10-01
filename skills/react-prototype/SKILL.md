---
name: react-prototype
description: Get the screen's design into the feature's spec folder - pulled from Stitch if it was designed there, otherwise built as static HTML against the project's own Tailwind build. Use before implementing any screen that has a design.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Prototype

Produces `specs/NNN-<slug>/prototype.html`: a fast, throwaway-cheap artifact for
agreeing on layout before committing to components.

## Use the project's own CSS. Never a CDN.

A prototype built against a different Tailwind than the app is a contract
written in the wrong language. Tailwind v4 moved configuration into CSS
`@theme`, switched the default palette to OKLCH, and renamed utilities — so a
`cdn.tailwindcss.com` prototype can render classes that do not exist in the app,
and will not know this project's tokens at all.

So the prototype imports the real stylesheet and is served by the real dev
server:

```html
<!doctype html>
<html lang="en" class="h-full">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><Feature> prototype</title>
  <!-- the project's actual Tailwind entry, with its @theme tokens -->
  <link rel="stylesheet" href="/src/styles/index.css" />
</head>
<body class="min-h-full bg-background text-foreground">
  <!-- prototype here -->
</body>
</html>
```

View it at `http://localhost:5173/specs/NNN-<slug>/prototype.html` while
`npm run dev` runs. Confirm it actually renders before reporting done — a
prototype you never loaded is a guess.

## Designed in Stitch already? Fetch it, do not redraw it

If the screen exists in Stitch, the MCP has it:

```
list_screens  →  get_screen (name: projects/{p}/screens/{s})
              →  save what it returns into specs/NNN-<slug>/
```

Nothing is called `get_screen_code` or `get_screen_image`, whatever older guides
say — `get_screen` is the one tool, and generation calls must be **polled, never
retried** (see the `react-roadmap` skill's `references/stitch.md`).

Then **translate it rather than keeping it**, because Stitch output is a
reference, not an implementation:

| Stitch gives you | What you must do |
|---|---|
| Raw hex colours, px radii | Replace with role tokens: `bg-card`, `text-muted-foreground`, `rounded-lg` |
| One flat document | Map repeated blocks onto `src/components/*` — check the registry first |
| The populated state only | Add empty, loading and error sections; they are what reviews catch |
| A fixed width | Make it work at 375 / 768 / 1440 |

If its colours disagree with `@theme`, that is a **token** problem — say so and
let `react-theme` fix it once. Never hardcode the design's hex per component.

Keep any screenshot it returns in the spec folder: `react-verify` compares its
own screenshots against it.

## Procedure (no Stitch screen — build it by hand)

1. **Read the token vocabulary first.** `cat src/styles/index.css` and list the
   `@theme` tokens. Use `bg-card`, `text-muted-foreground`, `rounded-lg`
   and friends.
2. **Read the existing primitives.** `ls src/components/ui/` — match their
   markup and class patterns so translation to components is mechanical later.
3. Write the file. Semantic HTML, real-looking content, responsive at 375 /
   768 / 1440.
4. Cover every state the screen has: populated, **empty**, **loading**,
   **error**. Stack them as labelled sections in the one file — they are what
   gets forgotten, and they are cheapest to agree on here.
5. Load it in the browser and look at it. Screenshot all three widths.

## Hard rules

- NEVER delete another feature's prototype. Git is the history mechanism; each
  feature owns its own folder.
- NEVER invent a hex colour, a font size, or a radius. If a token is missing,
  list it under "Tokens needed" and let `react-theme` add it.
- No JavaScript, no custom CSS, no external assets beyond the project stylesheet.

## Report

The path, the three screenshots, the states covered, the tokens you needed that
do not exist yet, and any assumption you made about the design.

> Next: `react-spec`.
