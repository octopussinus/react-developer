---
name: react-clarify
description: Resolve open questions in a roadmap or a feature spec by asking the user one at a time as a multiple-choice question, then recording each answer. Use after react-roadmap or react-spec, whenever a file contains NEEDS CLARIFICATION markers.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# React Clarify

**Stage 5 of 11** of the react-dev pipeline — after `react-spec`, then `react-implement`. `react-dev status` shows where every feature stands.

Turns `[NEEDS CLARIFICATION]` markers into recorded decisions. Works on any of:

- `specs/roadmap/prerequisites.md` — the ones that block everything
- `specs/roadmap/NNN-<slug>.md` — a planned feature's own questions
- `specs/NNN-<slug>/spec.md` — a feature being built

With no file named, start at `prerequisites.md`, then the file for the next
feature in the index. Grep rather than reading every file:

```bash
grep -rln "NEEDS CLARIFICATION" specs/
```

Cheapest possible moment to fix a wrong assumption is before any code exists.

## The one rule that matters

**Ask ONE question per message, as a multiple-choice question, and wait.**

Never present a list of questions. A wall of 16 gets one vague reply or none,
and the answers that do come back are unattributable. One at a time with named
options gets a real decision every time.

**Claude Code:** use `AskUserQuestion` — a real option picker, one question per
call. **Codex and Gemini CLI have no equivalent** (Codex's `ask_user_question`
was closed unmerged; Gemini bundles the MCP elicitation schemas but handles no
elicitation request), so there you render the question as a numbered list and end
your turn. Both forms, and the three details that make the text one work as well
as the picker, are in [references/asking.md](references/asking.md).

## Procedure

1. **Collect** markers from the file you were pointed at — or, with none named,
   from `prerequisites.md` plus the next feature's file. Never sweep all of
   `specs/roadmap/`: a question about feature 14 is noise now.
2. **Order by blast radius, then by what blocks the next step.** A question that
   changes the data model or the token system comes before a cosmetic one.
3. **Select only what is blocking now.** With a roadmap of 16 questions, ask the
   few that gate the *first* feature; leave the rest marked. A question about
   checkout does not need an answer before the landing page is built — and
   asking it now spends the user's attention at the worst possible time.
   **Hard cap: 5 questions per run.**
4. **Ask**, one at a time, each with 2–4 concrete named options, a
   recommendation, and what each option costs. Format and worked examples:
   [references/asking.md](references/asking.md).
5. **Record immediately after each answer**, before asking the next:
   - replace the marker inline with the decision
   - append to `## Clarifications`: date, question, answer, and the consequence
   - if the answer was "you decide", mark it `assumed` and note what would have
     to change if it is wrong
6. **Report** what was resolved, what you deferred, and why the deferrals are
   safe.

## Hard rules

- NEVER ask more than one question in a message.
- NEVER ask an open-ended question. "What should pagination look like?" wastes a
  turn. Give the options and a recommendation.
- NEVER answer your own question and move on. An unasked question is a guess
  wearing a decision's clothes.
- NEVER delete a marker without recording its resolution.
- NEVER widen scope. If an answer implies new work, put it under
  `## Out of scope` and say it needs its own feature.
- NEVER batch the remainder into a summary list at the end. Deferred questions
  stay as markers in the file, where the next run will find them.

## Report

| Question | Answer | Recorded as |
|---|---|---|

Then:

## Next

> **Stage 5 of 11 complete.** Resolved N, deferred M (they block <feature>, not
> this one). Every answer is recorded in the file, not just in this chat.
> **Do next:** `react-implement` — the spec has no blocking unknowns left.
> **Still markers that block now?** `react-clarify` again.
> **Clarified `prerequisites.md`?** `react-prerequisites` builds them before any feature.
