---
name: react-analyze
description: Read-only consistency check across spec, code, tests and AGENTS.md for a feature - finds drift, unimplemented requirements and violated rules. Use before opening a pull request, or when asking whether a feature is really finished.
allowed-tools: Bash, Read, Glob, Grep
---

# React Analyze

**Stage 8 of 11** of the react-dev pipeline — after `react-verify`, then `react-review`. `react-dev status` shows where every feature stands.

Answers one question: **does the code do what the spec said, within the rules
the project set?**

**Read-only. Report findings; never fix them.** Mixing analysis with repair
hides the finding inside the diff, and nobody learns the project drifted.

## Procedure

Load `specs/NNN-<slug>/{spec.md,tasks.md,review.md}`, `AGENTS.md`, and the
feature's code. Then check each axis:

1. **Unresolved unknowns** — any surviving `[NEEDS CLARIFICATION]`.
   Any hit is a **blocker**: the feature was built on an open question.
2. **Spec → code coverage** — walk each numbered behaviour in the spec and name
   the file that implements it. Anything unmatched is unimplemented, whatever
   `tasks.md` claims.
3. **Code → spec** — anything implemented that the spec never asked for. Scope
   creep is as much a defect as a gap; it is untested surface nobody agreed to.
4. **State completeness** — for every list and async surface, confirm loading,
   empty and error are all handled. Grep for the components; do not take the
   spec's word.
5. **Rule compliance** — each `## Hard rules` line in AGENTS.md, checked:
   ```bash
   npm run components:check   # same component in two features -- exits 1 on a hit
   grep -rn "as any\|@ts-ignore\|eslint-disable" src/modules/<module>/<page>/
   grep -rn "#[0-9a-fA-F]\{3,8\}\b" src/modules/<module>/<page>/        # raw colours
   grep -rnE ">[A-Z][a-z]+ [a-z]+" src/modules/<module>/<page>/ | grep -v "t("  # bare strings
   ```
   **A non-zero `components:check` is a blocker.** It means a component was copied
   into a second feature instead of promoted, so a design change now has to be
   made twice. Its output names the `promote` command; it is part of `npm run
   verify`, so this is also a sign the gate was not run.
6. **Test reality** — does every hook and `api/` module have a test, every
   component a story? Do the tests assert behaviour, or just that something is
   defined?
7. **Boundaries** — `npx eslint src/modules/<module>/<page> --no-eslintrc -c eslint.config.js`
   plus a cross-feature import scan:
   ```bash
   grep -rn "features/" src/modules/<module>/<page>/ | grep -v "features/<slug>"
   ```
8. **Task honesty** — items ticked in `tasks.md` whose code you cannot find.

## Report

Findings only, worst first, each with `file:line`, what rule or spec line it
violates, and the smallest fix. Then:

```
blockers: N   should-fix: N   nits: N
verdict: ready for review | needs work
```

If you find nothing, say that plainly and list what you checked, so the clean
result is auditable rather than merely reassuring.

## Next

> **Stage 8 of 11 complete.** N findings (B blockers). Verdict: ready for review | needs work.
> **Do next:** `react-ship` — commits, pushes, opens the PR.
> **Needs work?** `react-implement` on the findings, then `react-verify` again.
