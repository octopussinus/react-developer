---
name: react-clarify
description: Resolve the open unknowns in a spec by asking the user a few targeted questions, then write the answers into the spec. Use after react-spec, when the spec contains NEEDS CLARIFICATION markers.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# React Clarify

Converts `[NEEDS CLARIFICATION]` markers into decisions recorded in the spec.
Cheapest possible moment to fix a wrong assumption: before any code exists.

## Procedure

1. Read `specs/NNN-<slug>/spec.md` and collect every marker.
2. **Rank by blast radius**, not by reading order. Ask about what changes the
   data model or the component tree first; cosmetic unknowns can wait or be
   defaulted.
3. Ask **at most 5** questions, **one message at a time**. Wait for each answer
   before asking the next — a wall of questions gets one vague reply.
   For each question: offer 2–4 concrete options with a recommendation, and say
   what each option costs. "What should pagination look like?" is a bad
   question. "Cursor pagination (scales, no page numbers) or offset (page
   numbers, drifts on insert)? I'd take cursor." is a good one.
4. After each answer, **edit the spec immediately**:
   - replace the marker with the decision, inline where it was
   - append to `## Clarifications` with the date, question, answer, and the
     consequence for the implementation
5. If more than 5 markers remain, resolve the top 5 and leave the rest. Say
   which ones you deferred and why they are safe to defer.
6. If the user answers "you decide", that is a real answer: pick, record it as
   `assumed`, and note what would need to change if it is wrong.

## Hard rules

- Never answer your own question and move on. An unasked question is a guess.
- Never widen scope. If an answer implies new work, note it under
  `## Out of scope` and tell the user it needs its own feature.
- Never delete a marker without recording its resolution.

## Report

A table of question → answer → spec impact, plus the remaining marker count.

> M unknowns left. Next: `react-implement` when M is 0, otherwise another pass.
