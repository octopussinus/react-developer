# `.ai/` — the feedback loop

This directory is how a human correction becomes a permanent constraint instead
of a sentence in a chat log that nobody can find next week.

```
chat → .ai/inbox/*.json → .ai/feedback.md → AGENTS.md ## Learned rules
                                          → eslint-rules/ → CI gate
```

## `inbox/`

Structured feedback captured from the running app by the dev-only feedback
toolbar (`src/dev/feedback-toolbar.tsx`). Click **Feedback**, click an element,
then pick **what you want** — optionally with a note — and an entry lands here:

| Button                     | `intent`  | What the agent does                                                                |
| -------------------------- | --------- | ---------------------------------------------------------------------------------- |
| Something is wrong with it | `fix`     | Treats it as a correction and runs the feedback ladder                             |
| I want this elsewhere too  | `reuse`   | Asks which feature needs it, applies the layer test, then `npm run gen -- promote` |
| Change how it looks        | `style`   | A **token** change via `react-theme`, never a per-component hex                    |
| Fix the wording            | `wording` | Moves the string into a locale file via `react-i18n`                               |
| Explain what this is       | `explain` | Just answers; records nothing                                                      |

```json
{
  "ts": "2026-10-02T14:36:09Z",
  "intent": "reuse",
  "comment": "the invoices page needs this same heading",
  "file": "src/features/orders/components/OrderCard.tsx",
  "line": 42,
  "component": "OrderCard",
  "selector": "div.order-card > span:nth-child(2)",
  "computedStyles": { "backgroundColor": "rgb(251, 191, 36)" },
  "route": "/orders/42",
  "viewport": { "width": 1440, "height": 900 }
}
```

The `intent` matters as much as the location: it is the difference between the
agent guessing what a sentence meant and knowing which command to run. `comment`
is optional and may be `null` — the intent alone is actionable.

**`reuse` does not mean "share it immediately".** The agent will ask which
feature needs it, because a second real use is what decides the layer and proves
the need. "Just in case" is the premature abstraction `components:check` is
deliberately tuned to avoid forcing.

The `file` and `line` are exact — resolved from React's dev-mode fiber, not
guessed from the DOM. That is the difference between "fix the badge somewhere"
and a one-line edit.

## `feedback.md`

Append-only log of every correction, with a category and an occurrence count.
Append-only matters: the counts are the signal, so nothing may be edited away.

## Promotion

The `react-feedback` skill reads both, counts by category, and at **3 or more
occurrences** promotes:

| Kind of rule           | Becomes                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| Mechanically checkable | an ESLint rule in `eslint-rules/`, with a test, wired into `eslint.config.js` |
| A judgment call        | one line in `AGENTS.md` under `## Learned rules`                              |
| A missing capability   | a GitHub issue — a gap is not fixed by a rule                                 |

Adding a lint rule fails CI for everyone, so the skill asks before it does.

## How `file` and `line` are resolved

From a `data-tsd-source="file:line:column"` attribute that
[`@tanstack/devtools-vite`](https://tanstack.com/devtools/latest/docs/source-inspector)
injects onto DOM elements in dev via an AST transform (see `vite.config.ts`).

This used to read `fiber._debugSource`, which **React 19 removed** — so those
fields silently became `null` on every entry. A build-time attribute does not
depend on React internals and survives React majors. The component _name_ still
comes from the fiber (`type.name` was not removed).

If `react-dev doctor` reports `source injection: not wired`, the toolbar still
captures a CSS selector and the comment, but the agent has to search for the
code instead of being handed it.

## How the agent finds out

Two ways, and the first is automatic in Claude Code:

**A `UserPromptSubmit` hook** in `.claude/settings.json` counts the files in
`.ai/inbox/` and, when there are any, tells the agent before it answers your next
message. It prints nothing when the inbox is empty, so it costs nothing on a
normal turn. Review or disable it with `/hooks`.

That hook is Claude Code only — it lives in `.claude/`, which Codex and Gemini CLI
do not read. On those, say so yourself:

```
> check the feedback inbox
```

The `react-feedback` skill's description matches that phrasing, so it loads
without you remembering the skill name.

**Either way nothing happens behind your back.** The hook only reports a count;
it does not read the entries or act on them. Triage happens when you ask.

## Alternatives, if you want more than this

The toolbar here is ~190 lines and deliberately thin. Its one real advantage is
that it writes to the **filesystem**, so `react-feedback` reads entries directly,
counts recurrences, and promotes them — no copy-paste step. If you want more
capability, two maintained tools cover the same ground:

| Tool                                                   | Shape                                                                                                          | Licence               | Trade-off                                                                                                                                                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Agentation](https://www.npmjs.com/package/agentation) | one React component you add to your layout; annotate, then **copy structured output** to paste into your agent | PolyForm-Shield-1.0.0 | richer annotation modes (text select, multi-select, draw regions); clipboard rather than filesystem, so the promotion ladder needs a manual paste. Not an OSI licence — check it against your policy. |
| [stagewise](https://stagewise.io)                      | its own browser plus a built-in agent; click UI, prompt a change, it edits the codebase                        | AGPL-3.0              | far more capable and far more opinionated — it owns the editing loop rather than feeding yours. AGPL is worth a legal read before adopting.                                                           |

Replacing the toolbar is cheap: delete `src/dev/feedback-toolbar.tsx` and
`tools/feedback-plugin.mjs`, drop the dynamic import from `src/main.tsx`, and
point `react-feedback` at wherever your chosen tool puts its output.
