# `designs/` — your screens, if you have them

Optional. Put the designs you want the app to look like here, and the agent
builds from them. No designs? Leave this folder empty; the agent works from
Stitch (if connected) or from your description instead.

## What to put here

- **PNG / JPG / WebP** — screenshots or exports from Figma, Penpot, a mock-up
  tool, a photo of a sketch. The agent looks at the picture.
- **HTML** — a prototype page (from Stitch, v0, a hand-made mock-up). The agent
  reads its structure, text and colours.

One file per screen. Name it after the page, so it is obvious which is which:

```
designs/
├── home.png
├── orders-list.png
├── orders-detail.html
├── sign-in.png
└── mobile/                 optional: phone-sized versions of the same screens
    └── orders-list.png
```

A screen with several states can have one file each: `orders-list.png`,
`orders-list--empty.png`, `orders-list--error.png`.

## How it is used

- `react-roadmap` lists every file here and maps it to a feature, the same way
  it maps Stitch screens.
- `react-spec` copies the feature's files into `specs/NNN-<slug>/design/` and
  translates them into this project's colours and components -- it never
  copies a hex value or a pixel size from a design.
- `react-verify` compares its screenshots of the finished page with them.

A design shows how a screen looks, not what it does: anything it cannot tell
(empty states, errors, what a button does) the agent asks you about.
