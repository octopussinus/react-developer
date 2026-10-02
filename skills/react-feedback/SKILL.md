---
name: react-feedback
description: Collect human feedback about generated code and promote recurring issues into permanent rules or lint rules. Use when the user points out something wrong, after a review, or when told the same mistake keeps happening.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Feedback

**Toolbox skill** — not a pipeline stage. Called by `react-merge` when a review taught the project something, or when `.ai/inbox/` has entries.

Feedback typed into a chat window has a half-life of one session. Feedback that
lands in a lint rule has a half-life of the project. This skill moves each
correction as far down that ladder as it honestly goes:

```
chat -> .ai/feedback.md -> AGENTS.md ## Learned rules -> ESLint rule -> CI gate
```

## Inputs

| Source | What it is |
|---|---|
| `.ai/inbox/*.json` | Visual feedback from the in-app toolbar: file, line, component, selector, computed styles, screenshot, the user's words |
| `specs/*/review.md` | Unchecked `## Human review` items |
| The current conversation | What the user just told you |

## Procedure

1. **Collect.** Read every inbox entry and every unchecked review item. For
   inbox entries, the `file` and `line` are exact — go read that code before
   deciding what the comment means.
2. **Record.** Append each to `.ai/feedback.md`:
   ```markdown
   ## 2026-10-01 · orders · src/features/orders/components/OrderCard.tsx:42
   **Category:** design-tokens
   **Said:** "status badge is a raw hex, use the token"
   **Correct:** `bg-status-warning` from @theme
   **Occurrence:** 3
   ```
   Match an existing category rather than minting a near-duplicate — the count
   is the whole signal, and splitting it hides the pattern.
3. **Count by category.**
4. **Promote at 3 or more.** Pick the strongest honest mechanism:

   | If the rule is... | Promote to | Why |
   |---|---|---|
   | Mechanically checkable | ESLint rule in `eslint-rules/` + a test + wired into `eslint.config.js` | Cannot recur |
   | A judgment call | One line in AGENTS.md `## Learned rules` | Always in context |
   | A missing capability | A GitHub issue | Do not paper over a gap with a rule |

   **Ask before adding a lint rule** — it will fail CI for everyone, so it is
   the user's call, not yours. Show the rule and the incidents that justify it.
5. **Close the loop.** Tick the promoted items in `review.md` and mark them
   `promoted` in `.ai/feedback.md`. Clear processed inbox entries.

## Hard rules

- NEVER push `AGENTS.md` over 8 KiB. Check with `wc -c AGENTS.md` before
  appending. At the limit, promote to an ESLint rule instead, or move an existing
  section into a doc `AGENTS.md` links to — Codex truncates, and a rule past the
  cutoff is a rule nobody reads.
- NEVER promote silently. Every new rule carries a one-line rationale citing the
  occurrences that caused it.
- NEVER promote at one or two occurrences. One correction is a preference; three
  is a pattern. Say which items you are still watching.
- NEVER rewrite history in `.ai/feedback.md`. It is an append-only log; the
  counts only mean something if nothing is edited away.
- NEVER promote a rule you cannot state as a check. "Write cleaner components"
  is not a rule.

## Report

Captured, promoted (with mechanism), and still watching — with counts. If you
added an ESLint rule, show it and the test that proves it fires.

## Next

> **Feedback processed.** N captured, M promoted (<mechanism>), K still watching.
> **Do next:** return to whatever stage you were on — `react-dev status` if unsure.
> **Promoted a rule?** `react-verify`, so the new rule runs against the codebase now.
