---
name: react-spec
description: Turn a description or an HTML prototype into an implementation spec with explicit unknowns marked. Use after react-feature, before any code is written. Produces specs/NNN-slug/spec.md.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Spec

Writes `specs/NNN-<slug>/spec.md`: the contract the implementation is judged
against. A spec that hides its assumptions is worse than no spec, because the
assumptions then propagate silently into code and tests.

## The one rule that matters

**Mark every unknown inline as `[NEEDS CLARIFICATION: <the specific question>]`.**

Never resolve ambiguity by picking something plausible. If you cannot tell
whether the list paginates or infinite-scrolls, that is a marker, not a
decision. `react-analyze` fails the feature while any marker survives, and
`react-clarify` exists to burn them down.

Aim for completeness over brevity: a spec with twelve honest markers is more
useful than a confident one that invented twelve answers.

## Procedure

1. Read what exists: the prototype at `specs/NNN-<slug>/prototype.html` if there
   is one, plus the user's description.
2. **Inventory the codebase before specifying anything.** This is what keeps the
   spec from inventing parallel infrastructure:
   - `ls src/components/ui/` — which primitives already exist?
   - `ls src/features/` — is there an adjacent feature to follow?
   - `cat src/config/routes.ts` — route and meta shape
   - `ls src/lib/api/generated 2>/dev/null` — is there a typed contract?
3. Write the spec using the section list below.
4. Count your markers and say the number out loud in your report.

## Sections

1. **Source** — prototype path and/or the description, verbatim.
2. **User-visible behaviour** — what the user can do, as numbered statements.
   Each one must be observable, so a test can assert it.
3. **States** — every list and every async surface must specify loading, empty,
   error, and partial/offline. Missing states are the most common review finding;
   spec them now or mark them.
4. **Data** — the fields needed. For each: where it comes from.
   - If a typed contract exists, cite the exact generated type.
   - If it does not, write `[NEEDS CLARIFICATION: no API contract for <field>]`.
   - **Never invent a field name or a response shape.**
5. **Reuse** — which existing `components/ui` primitives and `lib` helpers this
   uses. Anything new must be justified in one line.
6. **i18n** — the locale keys to add, namespaced `<feature>.*`.
7. **Accessibility** — keyboard path, focus order, labels, live regions.
8. **Out of scope** — what this deliberately does not do.
9. **Open questions** — collected `[NEEDS CLARIFICATION]` markers.

## Report

Path written, the marker count, and:

> N unknowns need answers. Next: `react-clarify`.

If there are zero markers, say so plainly — and say why you are confident, so
the user can disagree.
