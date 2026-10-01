# `eslint-rules/` — scars

Custom rules that encode mistakes this project actually made. Each one exists
because the same correction came up three or more times and was mechanically
checkable, so `react-feedback` promoted it from prose into a gate.

A rule here must have:

1. **A rationale** naming the occurrences that caused it, at the top of the file.
2. **A test** in `eslint-rules/<rule>.test.ts` proving it fires on the bad case
   and stays quiet on the good one. An untested lint rule is a false-positive
   generator.
3. **A wiring entry** in `eslint.config.js`.

```js
// eslint-rules/no-raw-color.js
/**
 * Why: 3 reviews flagged raw hex colours in feature components
 * (orders #12, invoices #19, settings #24). Tokens exist for exactly this.
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'use design tokens, not raw colour values' },
    messages: {
      raw: 'Raw colour {{value}}. Use a @theme token (bg-surface, text-muted-foreground).',
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string' && /^#[0-9a-f]{3,8}$/i.test(node.value)) {
          context.report({
            node,
            messageId: 'raw',
            data: { value: node.value },
          });
        }
      },
    };
  },
};
```

Rules are cheap to add and expensive to remove, so they are the user's call —
never added silently.
