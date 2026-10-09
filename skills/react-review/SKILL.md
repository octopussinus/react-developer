---
name: react-review
description: Review a feature branch for React defects that the automated gates cannot catch - wrong effects, stale closures, unstable keys, races, focus handling. Use after react-verify and react-analyze, before opening a pull request. Writes findings into the feature's review.md.
allowed-tools: Bash, Read, Glob, Grep
---

# React Review

**Stage 9 of 11** of the react-dev pipeline — after `react-analyze`, then `react-ship`. `react-dev status` shows where every feature stands.

Reads the branch and reports **React defects the gates are structurally blind
to**. Works identically in Claude Code, Codex and Gemini CLI — it needs no
host-specific tool.

**Read-only. Report; never fix.** A finding repaired inside the review is a
finding nobody learned from. `react-implement` does the fixing afterwards.

## Do not report anything already enforced

This is the rule that decides whether this skill is useful or noise. The gate
already fails the build on all of this, so repeating it is pure false positive:

| Already caught by | Never report |
|---|---|
| `react-hooks/exhaustive-deps` | a missing dependency-array entry |
| `react-hooks/rules-of-hooks` | a hook called conditionally or in a loop |
| `jsx-a11y` (recommended) | missing `alt`, unlabelled input, bad `aria-*` |
| `boundaries` | a feature importing a sibling, wrong-direction layer import |
| `no-restricted-syntax` | raw `fetch` instead of `@/lib/api-client` |
| `tsc -b` | any type error, `any` that the compiler rejects |
| `knip` / `jscpd` | unused exports, duplicated blocks above jscpd's 3% threshold |
| `components:check` | the same component copied into two features instead of promoted |
| Playwright `@a11y` (axe) | static accessibility violations |
| `react-analyze` | unimplemented spec items, scope creep, raw hex, bare strings |

If a finding would have failed `npm run verify`, it is not a finding — it means
the gate was never run. Say that instead, and stop.

## What to look for

Ten defect classes, with the grep that finds candidates and the question that
decides each one: [references/react-defects.md](references/react-defects.md).

In short: effects that should not be effects · stale closures outside dep arrays
· `key` identity on reorderable lists · state that duplicates derivable data ·
uncancelled async and out-of-order responses · missing cleanup for non-hook
resources · render-identity churn · focus and live regions after an action · what
the UI does when the request throws · mock data that never hits the spec's
extremes.

## Procedure

1. **Confirm the gate ran.** `cat specs/NNN-<slug>/review.md` — it needs real
   `## Automated verification` results. No results means run `react-verify`
   first; reviewing unverified code wastes the review on lint-level noise.
2. **Read the diff, not the repo.** `git diff main...HEAD --stat`, then the
   changed files. Reviewing untouched code produces findings nobody can act on.
3. **Read the spec** (and look at `specs/NNN-<slug>/design/` if present) so you
   can tell a defect from a decision. What the spec chose is not a finding.
4. **Collect candidates** with the greps in the reference.
5. **Verify every candidate against the source before writing it down.** Open the
   file, read the surrounding function, and confirm the failure is real. If you
   cannot name concrete inputs that produce a wrong result, **drop it.**
6. **Write findings** into `specs/NNN-<slug>/review.md` under `## Code review`.
7. **Report** the counts and the verdict.

## Severity — exactly three levels

| Level | Means | Effect |
|---|---|---|
| `**blocker**` | users hit this, or data is wrong | `react-merge` refuses to land while it is unticked |
| `**should**` | real defect, no user impact yet | fix now or record why not |
| `**consider**` | judgement call | never blocks; delete it if you cannot justify it |

Each finding, in this shape:

```markdown
- [ ] **blocker** `src/modules/orders/api/use-orders.ts:34` — the response is
      applied without checking it is still the current request, so switching
      filter from `paid` to `pending` and back shows `paid` results under the
      `pending` filter whenever the first request resolves last.
      Fix: cancel on change, or compare a request id before setting state.
```

**File, line, the inputs that break it, and the consequence.** A finding without
concrete inputs is a guess; delete it rather than ranking it `consider`.

## Hard rules

- NEVER edit code here. Findings only.
- NEVER report what `npm run verify` already fails on.
- NEVER report a stylistic preference. "I would use a reducer" is not a defect.
- NEVER report more than 12 findings. Past that nobody acts on any of them —
  keep the worst and say how many you dropped.
- NEVER claim runtime behaviour you did not read the code for.
- NEVER mark something `**blocker**` without naming the inputs that trigger it.
- NEVER delete or rewrite the `## Automated verification` section of review.md.

## Report

A count per severity, the verdict, and **what you checked and found clean** — a
clean result has to be auditable, not merely reassuring.

## Next

> **Stage 9 of 11 complete.** N findings in `specs/NNN-<slug>/review.md`
> (B blockers). Checked clean: <list>.
> **Do next:** `react-ship` — opens the PR with this review attached.
> **Any blocker?** `react-implement` to fix, then `react-verify` and this again.
