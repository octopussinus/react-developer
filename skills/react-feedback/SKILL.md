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
| `.ai/inbox/*.json` | New. From the toolbar: an **`intent`**, exact `file`/`line`/`component`, styles, optional note |
| `.ai/working/*.json` | Claimed by you; open until the **user** confirms |
| `.ai/done/*.json` | Closed by the user. **Never read these** |
| `specs/*/review.md` | Unchecked `## Human review` items |
| The current conversation | What the user just told you |

## Route by `intent` first

Each entry carries what the user *wanted*. Act on that, not on the optional note.

| `intent` | Do this |
|---|---|
| `fix` | A real correction — run the ladder below |
| `reuse` | A promotion request, **not** a correction: layer test, then `gen -- promote` |
| `style` | A token change: `react-theme`. Never a per-component hex |
| `wording` | `react-i18n` — the string belongs in a locale file |
| `explain` | Answer it. Nothing to record |

Only `fix` is feedback; logging the rest inflates the counts that decide
promotion. For `reuse`, **ask which feature needs it** — that answers the layer
question and proves the need is real; "just in general" is premature, so record
it and stop. Detail: [references/intents.md](references/intents.md).

## Procedure

0. **Claim it:** `mv .ai/inbox/<file>.json .ai/working/`. When you finish, set
   `"status": "awaiting-confirmation"` and an `"agentNote"` saying what you
   changed and what to check, and **leave it there** — only the user closes
   feedback: [references/lifecycle.md](references/lifecycle.md).

1. **Collect.** Read `.ai/inbox/` and `.ai/working/` — never `.ai/done/`. For
   inbox entries, the `file` and `line` are exact — go read that code before
   deciding what the note means. Handle `reuse`/`style`/`wording`/`explain` as
   routed above; only `fix` entries continue here.
2. **Record.** Append each to `.ai/feedback.md`:
   ```markdown
   ## 2026-10-01 · orders · src/modules/orders/components/OrderCard.tsx:42
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
   `promoted` in `.ai/feedback.md`. Then tell the user which entries are waiting
   for their Yes/No in the toolbar — do not clear anything yourself.

## Hard rules

- NEVER push `AGENTS.md` over 8 KiB. Check with `wc -c AGENTS.md` before
  appending. At the limit, promote to an ESLint rule instead, or move an existing
  section into a doc `AGENTS.md` links to — Codex truncates, and a rule past the
  cutoff is a rule nobody reads.
- NEVER write to or read `.ai/done/`, and never delete an entry. Confirmation is
  the user's, and it is the only check on work that looks finished but is not.
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
