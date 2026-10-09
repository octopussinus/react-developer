---
name: react-prerequisites
description: Finish every open roadmap prerequisite (API contract, auth and session, permissions, brand tokens, themes, locales, app shell, mock data) before any feature is built - decide, build, verify and land each one in order. Use after react-roadmap and react-clarify, or whenever react-dev status shows prerequisites still open.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Prerequisites

**Toolbox skill** -- runs between the plan (`react-roadmap`, `react-clarify`)
and the first `react-feature`. A prerequisite is a decision plus the code that
makes it real, and every feature after it is built on top of it. A feature
started while one is open is built on a guess.

## 1. See what is open

```bash
react-dev status          # the Prerequisites panel: ○ open, ◐ in progress, ● done
```

Read `specs/ROADMAP.md` (the `P1…Pn` rows) and `specs/roadmap/prerequisites.md`
(what each one is). Work them **in index order** -- later ones lean on earlier
ones (the app shell needs the tokens; auth needs the API contract).

## 2. One prerequisite at a time

For each open `Pn`:

1. **Decide.** If its section still has an open question or
   `[NEEDS CLARIFICATION]`, ask the user now -- one question at a time, as a
   choice list, with your recommendation first (`react-clarify` rules). Write
   the answer into `prerequisites.md` as **Decided (date):** before any code.
   A prerequisite is never built on an assumption nobody approved.
2. **Branch.** `git checkout -b pN-<slug>` from an up-to-date main (status
   tracks prerequisites by that `pN-` prefix).
3. **Build it** with the recipe for its kind:
   [references/kinds.md](references/kinds.md). Use the toolbox skills where
   one exists -- `react-theme` for tokens and themes, `react-i18n` for locales,
   the generator (`npm run gen`) for anything it owns.
4. **Verify.** `npm run verify` green, plus `npm run e2e` when it changed what
   a page does (auth, guards, the shell). Fix the cause; three attempts, then
   stop and report.
5. **Land.** Commit, merge into main the way `react-merge` does (squash, one
   commit per prerequisite), and set its Status cell in `specs/ROADMAP.md` to
   `✅ done`. `react-dev status` must now show it ●.

Then the next one. Report after each: what was decided, what was built, the
gate results.

## 3. When every row is done

`react-dev status` shows the Prerequisites panel all ●. Only then hand over to
the first feature.

## Hard rules

- NEVER start a prerequisite whose decision is still open -- ask first.
- NEVER build a feature's screens here. A prerequisite is shared ground
  (contract, session, tokens, shell); the first feature that uses it is
  `react-feature`'s job.
- NEVER mark one done without `npm run verify` green on main after the merge.
- NEVER invent an API field. The contract comes from the roadmap's mock-data
  sections and the user's answers -- unknowns are questions.

## Next

> **Prerequisites done.** P1…Pn landed; `react-dev status` shows them all ●.
> **Do next:** `react-feature 1` -- the first feature, on settled ground.
> **One still open?** Run `react-prerequisites` again; it picks up where it stopped.
