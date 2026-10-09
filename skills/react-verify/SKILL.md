---
name: react-verify
description: Prove the current change actually works - runs format, lint, types, unit tests, e2e, accessibility and real screenshots, then records the results. Use after any implementation or update, and whenever the user asks whether something works.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Verify

**Stage 7 of 11** of the react-dev pipeline — after `react-implement`, then `react-analyze`. `react-dev status` shows where every feature stands.

Executes the gates. This skill exists because a prose self-review is the
weakest possible check: the model that wrote the bug is asked to notice it, from
memory, without running anything.

**The only claims you may make here are claims you ran a command to support.**

## Procedure

1. **Static gates.** Run and fix until green:
   ```bash
   npm run verify   # format:check -> lint -> typecheck -> test -> deadcode
   ```
   Fix the cause, never the check. If you cannot fix something in three
   attempts, stop and report the blocker with the exact output.
2. **End to end.**
   ```bash
   npm run e2e
   ```
   If the feature has no spec yet, write one for the happy path first. A feature
   with no E2E coverage is unverified no matter how many unit tests it has.
3. **Accessibility.**
   ```bash
   npm run a11y
   ```
   The bar is zero `critical` and zero `serious` axe violations. Report
   `moderate` ones; do not silence them.
4. **Visual regression.**
   ```bash
   npm run visual
   ```
   Baselines are committed per platform. A diff is a finding, not a nuisance:
   look at `test-results/` before deciding. Only run `npm run visual:update`
   when the change is intended, and say in your report that you did.

5. **Visual proof.** Start the dev server, then drive a real browser with the
   Playwright MCP tools (`.mcp.json` ships configured):
   - navigate to the new route
   - take an accessibility snapshot — cheap, structured, and assertable
   - screenshot at 375, 768 and 1440 px
   - check the console for errors; a clean-looking page with a red console is
     not a working page
   - if `specs/NNN-<slug>/design/` holds the design (Stitch, or the user's
     PNG/HTML from `designs/`), compare your screenshots with it: layout,
     content, hierarchy. Report what differs; colours follow the tokens
6. **Mutation check on the diff** when logic changed:
   ```bash
   npm run test:mutation
   ```
   Surviving mutants mean the tests do not actually test. Strengthen the
   assertions; do not raise the threshold.
7. **Record it.** Write the real results into
   `specs/NNN-<slug>/review.md` under `## Automated verification`, including
   the exact commands.

## Hard rules

- NEVER report a gate as passing if you did not run it. Write `not run` and say
  why — a false green is worse than a known gap.
- NEVER make a gate pass by weakening it: no `--max-warnings` bump, no skipped
  test, no `eslint-disable`, no lowered coverage threshold.
- If a gate is failing for reasons unrelated to this change, say so explicitly
  and show that it fails on a clean checkout too.

## Report

```
| Gate      | Result | Detail                      |
|-----------|--------|-----------------------------|
| format    | pass   |                             |
| lint      | pass   |                             |
| types     | pass   |                             |
| unit      | pass   | 24 passed, 81% lines        |
| e2e       | FAIL   | orders.spec.ts:18 timeout   |
| a11y      | pass   | 0 critical, 0 serious       |
| visual    | pass   | 3 widths, console clean     |
| visual    | pass   | 12 baselines, no diff       |
| mutation  | pass   | 2 survivors, both addressed |
```

End with a one-line verdict: ready for review, or blocked on X.

## Next

> **Stage 7 of 11 complete.** Gate table above; verdict: ready for review | blocked on X.
> **Do next:** `react-analyze` — the read-only drift check against the spec.
> **Any gate red?** Fix it and re-run `react-verify`. Do not continue on red.
