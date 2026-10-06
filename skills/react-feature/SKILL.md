---
name: react-feature
description: Start a new feature - create its branch, its spec folder, and its scaffolded code via the generator. Use at the beginning of any new piece of work, when the user describes something to build.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Feature

**Stage 3 of 11** of the react-dev pipeline — after `react-clarify`, then `react-spec`. `react-dev status` shows where every feature stands.

Opens a feature correctly so that nothing downstream has to guess where things
live. One feature, one branch, one spec folder.

## Why a generator and not prose

Structure is mechanical: folder layout, barrel exports, route registration,
locale key stubs, test and story files. A generator does all of that identically
every time and either completes or fails loudly. You are needed for the part
that takes judgment — what the feature *does*. Do not hand-create any file the
generator already produces.

## Procedure

0. **Check for a roadmap.** If `specs/ROADMAP.md` exists and the user named a
   number or slug (`react-feature 3`, `react-feature order-tracking`):
   - read the **index** for the slug, size and dependencies;
   - read **only that feature's file**, `specs/roadmap/NNN-<slug>.md`, for its
     behaviour, mock data and questions. Do not read the other feature files —
     their mock data is not yours, and reading it is how two features end up
     sharing a shape they should not.
   Take the slug and dependencies from there; do not re-derive them.
   - If its dependencies are not built yet, say so and ask before continuing.
   - If it is sized **L**, stop: it needs splitting in the roadmap first.
   - Mark the entry in-progress in `ROADMAP.md`.
   With no roadmap, carry on from step 1 using what the user described.
1. **Derive the slug.** Kebab-case, domain language, no ticket numbers:
   `order-tracking`, not `feat-1234` or `OrderTrackingFeature`.
2. **Find the next number.** `ls specs/` and take the highest `NNN` + 1,
   zero-padded to three digits. If `specs/` does not exist, start at `001`.
3. **Branch.** `git checkout -b NNN-<slug>`. If the working tree is dirty,
   STOP and ask — never stash someone else's work.
4. **Scaffold.** Run the generator and show its output verbatim:
   ```bash
   npm run gen -- feature <module> <page> --route=/<path>
   ```
   If it fails, report the failure. Do not fall back to creating files by hand —
   a hand-made feature is one the upgrade path can never migrate.
5. **Create the spec folder** `specs/NNN-<slug>/` with `spec.md` seeded from the
   user's description — or from `specs/roadmap/NNN-<slug>.md` when there is one,
   carrying its behaviour list, mock data and unresolved questions across —
   `tasks.md` empty, and `review.md` from
   [references/review-template.md](references/review-template.md).
6. **Verify the floor.** `npm run verify` must pass on the fresh scaffold before
   any logic is written. If it fails now, the template is broken — say so
   loudly rather than building on it.

## Report

State: the branch, the spec folder, every path the generator created, the
roadmap entry used (if any), and the `npm run verify` result. Then hand off:

## Next

> **Stage 3 of 11 complete.** Branch `NNN-<slug>`, folder `specs/NNN-<slug>/`,
> generated slice, `npm run verify` green.
> **Do next:** `react-spec` — it fetches the Stitch screen first if this page was
> designed there.
