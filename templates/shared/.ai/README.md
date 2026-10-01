# `.ai/` — the feedback loop

This directory is how a human correction becomes a permanent constraint instead
of a sentence in a chat log that nobody can find next week.

```
chat → .ai/inbox/*.json → .ai/feedback.md → AGENTS.md ## Learned rules
                                          → eslint-rules/ → CI gate
```

## `inbox/`

Structured feedback captured from the running app by the dev-only feedback
toolbar (`src/dev/feedback-toolbar.tsx`). Click an element, type what is wrong,
and an entry lands here:

```json
{
  "ts": "2026-10-01T12:30:00Z",
  "comment": "status badge is a raw hex, should use the token",
  "file": "src/features/orders/components/OrderCard.tsx",
  "line": 42,
  "component": "OrderCard",
  "selector": "div.order-card > span:nth-child(2)",
  "computedStyles": { "backgroundColor": "rgb(251, 191, 36)" },
  "screenshot": ".ai/inbox/2026-10-01T12-30-00Z.png",
  "route": "/orders/42",
  "viewport": { "width": 1440, "height": 900 }
}
```

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
