---
name: react-constitution
description: Create or update AGENTS.md, the project constitution that every other workflow must obey. Run once when a project starts, and again when a rule changes. Use when the user asks to set up project rules, change conventions, or says the agent keeps breaking a convention.
---

# React Constitution

`AGENTS.md` at the repo root is the project's constitution. Every other skill in
this workflow must cite it and must refuse work that contradicts it.

## Hard constraint: size

Codex stops reading after `project_doc_max_bytes` (32 KiB default) and
concatenates root-down. **Keep AGENTS.md under 8 KiB.** If it grows past that,
move detail into a skill's `references/` and leave a one-line pointer. A rule
nobody reads is not a rule.

## Procedure

1. Read the existing `AGENTS.md` if present. Never discard the
   `## Learned rules` section — those are real corrections from real reviews
   and are owned by `react-feedback`, not by you.
2. Detect reality before writing it down. Do not assume:
   - `cat package.json` — framework, scripts, state/data/validation libraries
   - `ls src/` — is it feature-sliced (`src/features/`) or type-sliced?
   - `ls eslint.config.*` — are boundaries actually enforced?
   - `ls .env.example openapi.json 2>/dev/null` — is there a typed API contract?
3. Write the sections below. Every rule must be **testable or checkable**.
   A rule a reviewer cannot adjudicate is a preference; leave it out.
4. For any rule that *can* be machine-checked, say which command checks it.
   If none does, note `(unenforced)` so the gap is visible.
5. Report what changed as a diff summary, and flag any rule you could not
   verify against the codebase.

## Required sections

| Section | Contains |
|---|---|
| `## Stack` | One line. Framework, language, styling, data, validation, i18n. |
| `## Architecture` | Layer order, the no-cross-feature-import rule, which lint rule enforces it. |
| `## Commands` | `npm run verify`, `npm run gen`, `npm run e2e` — the exact strings. |
| `## Hard rules` | Absolute prohibitions, each phrased as NEVER/ALWAYS. |
| `## Definition of done` | The merge bar. Must name `npm run verify`. |
| `## Learned rules` | Owned by `react-feedback`. Never edit by hand here. |

## Rules that must always appear

These exist because they are the failure modes this workflow is built to stop:

- NEVER hand-write an API response type. Generate it. If a field is missing from
  the contract, STOP and report it — do not invent fields.
- NEVER create feature folders by hand. Run `npm run gen -- feature <name>`.
- NEVER import from another feature. Shared code graduates to `components/ui`
  or `lib`.
- NEVER use `any`, `as any`, `@ts-ignore`, or add `eslint-disable` without an
  issue link.
- NEVER hardcode a user-facing string or a colour. Use `t()` and design tokens.
- ALWAYS run `npm run verify` before reporting work complete.

## After writing

Tell the user that `CLAUDE.md` and `GEMINI.md` are links to this file, so all
three agents read the same constitution. If `react-dev doctor` reports them as
stale, the fix is `react-dev sync`.
