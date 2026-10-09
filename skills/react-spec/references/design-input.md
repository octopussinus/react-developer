# Design input: getting a Stitch screen into the spec

Read this when the feature's screen was designed in Stitch. It replaces the old
`react-prototype` stage: the design already exists, so there is nothing to draw
— the job is to **fetch it, translate it into this project's vocabulary, and
write what it does not tell you into the spec as markers.**

## 1. Fetch it. Never redraw it.

**Read `specs/roadmap/NNN-<slug>.md` first** — its `## Screens` table already
holds the resource name, so you call one tool, not two:

```
get_screen (name: projects/{p}/screens/{s})
    →  save what it returns into specs/NNN-<slug>/design/
```

Only if that table is missing or has no resource name do you fall back to
`list_screens` and match on title. If it says `none — specify from prose`, there
is no design: skip to writing the spec. `get_screen` is the one tool. Nothing is called `get_screen_code` or
`get_screen_image`, whatever older guides say. Generation calls must be
**polled, never retried** — see `react-roadmap`'s `references/stitch.md`.

Keep whatever image it returns in `specs/NNN-<slug>/design/`. `react-verify`
compares its own screenshots against it, so deleting it costs you the visual
check later.

## 2. Translate it. The Stitch output is a reference, not an implementation.

| Stitch gives you | What the spec must say |
|---|---|
| Raw hex colours, px radii | The role token instead: `bg-card`, `text-muted-foreground`, `rounded-lg` |
| One flat document | Which `src/components/*` each repeated block maps to — check the registry first |
| The populated state only | What empty, loading and error look like. These are what reviews catch |
| A fixed width | The behaviour at 375 / 768 / 1440 |
| No interaction | What every control does, and what happens while it is doing it |

Read the token vocabulary before you write any of this down:

```bash
cat src/styles/index.css        # the @theme tokens that exist
ls src/components/atoms/        # the primitives that exist
```

## 3. Colours that disagree with `@theme` are a token problem

If the design uses a colour the token system cannot express, **do not record a
hex in the spec and do not let the implementation hardcode one per component.**
List it in the spec under `## Tokens needed` and say that `react-theme` must add
it once, centrally. A design whose palette keeps disagreeing with `@theme` means
the brand prerequisite (P4) was never finished.

## 4. What the design cannot tell you becomes a marker

A picture has no pagination, no error copy, no empty-state wording, no loading
strategy, no permission rules and no validation. Every one of those is a
`[NEEDS CLARIFICATION: ...]`, not a guess. The design being detailed is not
evidence that the behaviour is decided.

## Design files in `designs/`

The user's own screens -- PNG/JPG exports or screenshots, and HTML prototypes
-- in `designs/` at the project root (`designs/README.md` says how they are
named; `designs/mobile/` holds phone-sized variants, `name--empty.png` a state).

1. Find this feature's files: the roadmap's `## Screens` table names them; if
   it does not, match file names to the page and say which you matched.
2. Copy them into `specs/NNN-<slug>/design/` -- `react-verify` compares
   against what is there.
3. **PNG/JPG:** look at the image. **HTML:** read the markup for structure,
   copy and the colours it uses -- never paste its CSS or classes into the app.
   HTML exported from Google Stitch is the common case: Tailwind classes with
   the design's own hex values. Translate them to this project's tokens and
   components like any other Stitch screen; an `x.png` beside `x.html` is the
   same screen, and the picture wins where the two disagree.
4. Then section 2 above applies unchanged: tokens, not hex; components, not
   markup; every state the picture does not show becomes a marker.

A PNG is a picture of one moment. It cannot say what a button does or what
the list shows when empty -- those are questions, not guesses.

## No design for this feature?

Then there is no design step. Write the spec from the user's description and
mark the layout decisions as markers so `react-clarify` can resolve them. Do
not invent a design document nobody asked for — and if the layout is genuinely
hard to agree on in prose, say so and ask for a Stitch screen or a file in
`designs/` first.
