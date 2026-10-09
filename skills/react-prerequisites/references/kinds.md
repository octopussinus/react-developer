# Building each kind of prerequisite

The roadmap names them in its own words; these are the kinds that come up, and
what "done" means for each. Always read the decision in
`specs/roadmap/prerequisites.md` first -- it overrides anything here.

## API contract (`openapi.json`)

- No backend yet: write `openapi.json` (OpenAPI 3.1) from the entities in the
  feature files' **Mock data** sections -- the shared schemas (user, session,
  money, page, error) plus the endpoints the first features need. Features
  add their own endpoints later, on their own branches.
- A backend exists: fetch its spec into `openapi.json` instead of writing one.
- Then `npm run api:generate`. Nothing in `src/` hand-writes a response type.
- Mocks: MSW handlers and factories for those endpoints
  (`npm run gen -- mock <slug> <Entity>`), seeded from the canonical records.
- Done: the generated client compiles, the handlers answer, `verify` green.

## Auth and session

- Decide (with the user): providers, where the session lives (httpOnly
  cookie vs token), which routes are public.
- Build: the session query/hook, sign-out, the redirect for signed-out users
  (`?next=` back to where they were), mock handlers for sign-in and the
  session. No sign-in SCREEN -- that is a feature.
- Done: an e2e that hits a private route signed-out lands on the sign-in path.

## Roles and permissions, route guards

- Permissions come from the server as a list; the guard checks that list,
  never a role name. `meta.permission` on a route is the only per-page code.
- Done: a test per guard outcome (allowed, forbidden, signed out).

## Brand tokens and themes

- `react-theme`: role tokens in `src/styles/index.css` from the design system
  (Stitch's, or the colours in `designs/`), every pair checked for contrast,
  the named themes and dark mode the decision asked for.
- Done: no raw hex outside the token file; the theme switcher shows each one.

## Locales and formatting

- `react-i18n`: the locale set, the default, number/currency/date formatting.
- Done: `npm run i18n:check` green; a formatter test per locale.

## App shell and navigation

- The frame every signed-in page sits in: header, sidebar or bottom nav,
  responsive behaviour, the not-found and error pages. Built from the
  registry (`meta.sidebar`), never a hand-kept list of links.
- Done: e2e opens the shell at 375 / 768 / 1440 px; a11y has no serious issue.

## Mock clock and canonical records

- One set of seeded records every factory and handler uses, and a fixed
  "now", so two screens never disagree about the same dog or order and
  dates in tests do not drift.
- Done: factories import the records; tests pass on any day.

## Design export or design files

- Screens that only exist outside the repo go into `designs/` (PNG or HTML,
  named after the page -- `designs/README.md`). Ask the user to drop them in;
  you cannot fetch a private Figma.
- Done: every screen the roadmap lists has a file there (or a Stitch screen).

## Anything else

Name what "done" means in one sentence, agree it with the user, and write it
under the prerequisite before building. A prerequisite without a done-line is
the one that never finishes.
