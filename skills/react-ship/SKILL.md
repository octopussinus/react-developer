---
name: react-ship
description: Commit the finished feature and open it for review - conventional commit from the spec, push, and a pull request carrying the spec and verification results. Use after react-verify and react-analyze pass, when a feature is ready for someone to look at.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Ship

**Stage 10 of 11** of the react-dev pipeline — after `react-review`, then `react-merge`. `react-dev status` shows where every feature stands.

Turns a verified branch into something a human can review.

## Refuse to ship unverified work

Check these first and stop on any failure — shipping a red branch wastes a
reviewer's time, which is the most expensive thing in the pipeline:

```bash
npm run verify && npm run e2e && npm run a11y && npm run visual
```

Also stop if:

- `specs/NNN-<slug>/tasks.md` has unticked items — say which
- `specs/NNN-<slug>/review.md` has no `## Automated verification` results — run
  `react-verify` first, it writes them
- `specs/NNN-<slug>/spec.md` still contains `[NEEDS CLARIFICATION]`
- `git status` shows files you did not mean to include — list them and ask

## Commit

One commit per logical change, conventional format, scope = the feature slug:

```
feat(orders): browse, filter and refund orders

Implements specs/002-orders/spec.md.

- cursor pagination (decided in Clarifications 2026-10-02)
- refund gated on orders:write
```

Match the repository's existing style — read `git log --oneline -15` first rather
than assuming. Never invent a scope the repo does not already use.

## Open it for review

**With a remote:**

```bash
git push -u origin <branch>
gh pr create --fill --body-file <(cat <<'BODY'
## What
<one paragraph>

## Spec
specs/NNN-<slug>/spec.md

## Verification
<the table from review.md>

## Review notes
<anything a reviewer should look at first>
BODY
)
```

**Without a remote** (`git remote -v` is empty): say so plainly, skip the PR, and
tell the user `react-merge` will merge locally. Do not invent a remote or suggest
adding one unless asked.

## The review already happened

`react-review` (stage 9) runs before this and writes its findings into
`specs/NNN-<slug>/review.md`. **Refuse to ship if that `## Code review` section is
missing** — it means stage 9 was skipped, and `react-merge` will refuse anyway.

Attach it: include `specs/NNN-<slug>/` in the commit and quote the severity counts
in the PR body, so a human reviewer starts from what was already found rather than
re-finding it. If the host has an extra reviewer of its own (`/code-review` in
Claude Code), running it as well is free — but nothing in the pipeline depends on
a host-specific command.

## Hard rules

- NEVER ship with a failing gate, an unticked task, a surviving
  `[NEEDS CLARIFICATION]`, or an unticked `**blocker**` in review.md.
- NEVER `git add -A` blindly. Stage what the feature touched; list anything else.
- NEVER force-push a branch someone may have reviewed.
- NEVER merge here. That is `react-merge`, after a review.

## Report

Branch, commit subject(s), PR link (or "no remote — local merge"), the gate table,
then:

## Next

> **Stage 10 of 11 complete.** Branch pushed, PR <link> (or "no remote — local merge ready").
> **Do next:** `react-merge` — it checks CI and the review, then lands it.
> **No review section in review.md?** `react-review` first; this should not have shipped.
