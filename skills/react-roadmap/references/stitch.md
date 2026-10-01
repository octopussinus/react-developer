# Designing in Stitch, then building here

[Stitch](https://stitch.withgoogle.com) generates UI designs from prompts. Its MCP
server lets the agent read those designs and push your design system into them.

> **Tool names below were read from a live server, not from a blog post.** Several
> widely-circulated guides list `get_screen_code`, `get_screen_image`,
> `extract_design_context` and `build_site` — **none of those exist.** If a guide
> mentions them, it is out of date.

## Setup (once, user scope so every project sees it)

```bash
claude mcp add stitch --transport http https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: YOUR_KEY" -s user
```

Gemini CLI and Codex take the same URL and header; see `MCP.md` in a generated
project. Check it with `claude mcp get stitch` — it should say `✔ Connected`.

Keep the key out of the repo. User scope stores it in `~/.claude.json`; a
project-scope `.mcp.json` gets committed.

## Tools

| Tool | Params | Notes |
|---|---|---|
| `list_projects` | — | start here |
| `list_screens` | `projectId` | the inventory the roadmap maps |
| `get_screen` | `name` = `projects/{p}/screens/{s}` | one screen's details; also the way to poll |
| `generate_screen_from_text` | `projectId`, `prompt`, *`designSystem`*, *`deviceType`*, *`modelId`* | pass `designSystem` so it uses YOUR tokens |
| `edit_screens` | `projectId`, `selectedScreenIds[]`, `prompt` | iterate on existing screens |
| `generate_variants` | `projectId`, `selectedScreenIds[]`, `prompt`, `variantOptions` | `variantCount` 1–5, `creativeRange` REFINE\|EXPLORE\|REIMAGINE, `aspects[]` LAYOUT\|COLOR_SCHEME\|IMAGES\|TEXT_FONT\|TEXT_CONTENT |
| `upload_design_md` | `projectId`, `designMdBase64` | push a DESIGN.md; returns a screen instance |
| `create_design_system_from_design_md` | `projectId`, `selectedScreenInstance` | turns that into a reusable design system |
| `apply_design_system` | `projectId`, `selectedScreenInstances[]`, `assetId` | restyle existing screens onto it |
| `list_design_systems` | `projectId` | find an existing `assets/{id}` |
| `create_project` / `get_project` / `delete_project` | | **`delete_project` is destructive — always confirm first** |

`modelId` accepts `GEMINI_3_8_FLASH` or `GEMINI_3_5_FLASH_LITE`.

**Generation is slow and must not be retried.** `generate_screen_from_text`,
`generate_variants` and `edit_screens` can time out while still succeeding. Poll
`get_screen` every ~30s, up to ~10 times. Retrying the generate call duplicates
work and can produce extra screens.

## Push your tokens in; do not reconcile them afterwards

The design-system tools mean the right direction is **codebase → Stitch**, not the
reverse. Do this once per project, before designing anything:

1. Write a `DESIGN.md` from `src/styles/index.css`: the role tokens, the type
   scale, the radii. This is the same vocabulary the code already uses.
2. `upload_design_md` with it base64-encoded → returns a screen instance.
3. `create_design_system_from_design_md` with that instance → a reusable
   design system (`assets/{id}`).
4. Pass that `designSystem` to every `generate_screen_from_text`.

Screens then arrive already on your palette and scale, so there is nothing to
reconcile and no temptation to hardcode a design's hex. Existing screens can be
brought onto it with `apply_design_system`.

If someone has already designed without it, `list_design_systems` plus
`apply_design_system` is the retrofit.

## What Stitch still will not give you

- **Components.** Output is flat markup. Map repeated blocks onto
  `src/components/*`, and check the registry before writing anything new.
- **States.** It shows the populated case. Empty, loading and error are yours,
  and they are what reviews catch as missing.
- **Responsiveness.** `deviceType` picks one target; the review bar is
  375 / 768 / 1440.
- **Data.** A design shows five tidy rows; production has none, or 200, or one
  with a 90-character name. That is why the roadmap specifies mock data per
  feature and `react-feature` generates MSW handlers and factories — so a screen
  can be built and reviewed against realistic data with no backend at all.
