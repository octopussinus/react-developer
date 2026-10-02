# How to ask

One question per message, named options, then **stop**. Only one of the three
supported agents has a UI for this, so the fallback is not a degraded mode — it
is the normal path for two of them.

## Which mechanism each agent has

Verified 2026-10-02, against each agent's shipped code and docs — not blog posts.

| Agent | Mechanism | Status |
|---|---|---|
| **Claude Code** | `AskUserQuestion` tool | **Native.** Renders a real option picker, adds its own "Other", supports multi-select |
| **Codex** | none | `ask_user_question` was proposed in PR #9904 and **closed unmerged** (2026-01-26, "not accepting feature contributions"). Nothing in the skills docs. Use the text form |
| **Gemini CLI** | none | Bundles the MCP `elicitation` *schemas* but registers no client handler, so a server calling `ctx.elicit()` gets `Method not found` (google-gemini/gemini-cli#22249). Its only interactive UI is tool-confirmation — proceed / always allow / cancel — which you cannot put a question into. Use the text form |

So: **use `AskUserQuestion` when you are Claude Code. Otherwise use the text
form below.** Do not try to reach a picker through an MCP server — none of the
three will show it, and Gemini errors.

## Claude Code — `AskUserQuestion`

One question per call, 2–4 options. Recommendation first, labelled. Each
description carries the *consequence*, not a restatement of the label. The host
supplies "Other", so never add your own.

```
question: "The Stitch design is terracotta/cream; the codebase still has the
           template's blue. Which side moves?"
header:   "Brand tokens"
options:
  - label: "Adopt the design (recommended)"
    description: "Rewrite @theme to the Stitch palette. The codebase has no brand
                  to protect -- it is template defaults -- and 12 screens are
                  already designed against this one."
  - label: "Push the codebase into Stitch"
    description: "Export @theme as DESIGN.md, restyle all 12 screens. Correct only
                  if the blue is a real brand decision."
  - label: "Adopt now, then mirror back"
    description: "Do the first, then push the reconciled tokens to Stitch so future
                  screens generate correct. Best end state, one extra step."
```

Never batch questions into one call to save turns. One decision per message is
the whole point: batched answers cannot be attributed back to their question.

## Codex and Gemini CLI — the text form

Identical content, rendered as text. Ask, then end your turn.

```
**Brand tokens** — question 1 of 3.

The Stitch design is terracotta/cream; the codebase still has the template's
blue. Which side moves?

1. **Adopt the design into the codebase** (recommended) — the codebase has no
   brand to protect, and 12 screens already use this one.
2. **Push the codebase tokens into Stitch** — restyles all 12 screens. Only right
   if the blue is a deliberate brand decision.
3. **Adopt now, then mirror back** — best end state, one extra step.

Reply with a number, or describe something else.
```

Three details that make the text form work as well as the picker:

- **`question N of M`** in the header. The picker shows progress; text does not,
  and without it the user cannot tell whether answering is worth starting.
- **Numbers, not letters or labels.** A one-keystroke answer gets answered.
- **The explicit escape** on the last line. The picker has an "Other" button;
  in text you have to say it, or the user assumes the list is exhaustive.

Then **stop**. Do not ask the next question in the same message, do not start
work, and do not guess the answer and carry on. Record the answer before asking
the next one — if the session dies mid-run, what was answered is still on disk.

Gemini CLI note: the skill is reached as `/react:clarify`, and arguments are
passed through, so `/react:clarify 2` is **not** a way to answer — it starts a
fresh run. Answer in an ordinary message.

## What makes a good question

| Bad | Good |
|---|---|
| "How should auth work?" | "SSO via your existing provider, or email+password we own? SSO means no password reset flow to build." |
| "Any preference on dark mode?" | "The design is light-only. Derive a dark palette (half a day, contrast-checked), or ship light-only and drop the theme toggle?" |
| "Is Places in scope?" | "Places is in the nav and on the landing page but has no designed screen. Cut it from the nav for now, or design it before the shell is built?" |

Three properties, all required:

1. **Named options**, not an open prompt. The user picks; they do not design.
2. **The consequence of each**, not a restatement. "Cursor pagination" tells them
   nothing; "no page numbers, but it does not drift when rows are inserted" does.
3. **A recommendation**, with one line of why. You have read the code and the
   design; say what you would do. Refusing to recommend pushes the work back.

## Ordering

Ask in this order, stopping when you hit the cap of 5:

1. **Blocks everything** — the API contract, auth, the token direction. Getting
   these wrong forces rework across every feature.
2. **Blocks the next feature** — whatever feature 1 needs.
3. **Changes the plan's shape** — scope questions that add or remove a feature.
4. Everything else. Leave it marked; it will be asked when its feature comes up.

A question nobody needs answered yet is noise, and noise is why long question
lists go unanswered.
