---
name: react-update
description: Change an existing feature - UI and logic together - without breaking its spec or tests. Use when the user asks to modify, fix or extend something already built.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Update

**Toolbox skill** — not a pipeline stage. Called when `react-dev doctor` reports drift, or a gate fails for a reason the feature did not cause.

Changing working code is riskier than writing new code, because there are
already tests, callers and a spec that described something else.

## Procedure

1. **Locate the feature and its spec.** `ls specs/` and find the folder. If the
   change is large enough to alter the spec's stated behaviour, update
   `spec.md` **first** and note it under `## Changes`. Code that no longer
   matches its spec is how drift starts.
2. **Map the blast radius before editing.** Who imports this?
   ```bash
   grep -rn "from '@/features/<slug>'" src/
   grep -rn "<ComponentName>" src/
   ```
   Say what you found. A change to a feature's `index.ts` is an API change.
3. **Run the tests first**, before touching anything:
   `npm run test -- src/features/<slug>`. You need to know whether you broke it
   or found it broken.
4. **Make the smallest change that works.** Do not refactor adjacent code in the
   same pass — if you see something worth fixing, note it and offer it
   separately. A diff that mixes a fix and a refactor is unreviewable.
5. **Update the tests in the same change.** A behaviour change with unchanged
   tests means the tests did not cover the behaviour.
6. `react-verify`.

## Hard rules

- NEVER delete a test to make a change pass. If the test is now wrong, change
  what it asserts and say why in the report.
- NEVER change a feature's public `index.ts` without checking every caller.
- NEVER widen scope silently. Offer, do not absorb.

## Report

What changed and why, the blast radius you found, tests updated, the verify
result, and anything you deliberately left alone.

## Next

> **Update done.** What changed, the blast radius, tests updated, what you left alone.
> **Do next:** `react-verify` — an update touches code nobody specced today.
> **Was this drift rather than a change?** `react-dev doctor` to confirm it is gone.
