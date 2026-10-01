/**
 * Example promoted rule -- NOT enabled by default.
 *
 * Why a rule like this exists: AGENTS.md says "never hardcode a colour", but a
 * prose rule is re-litigated every review. Once the same correction lands three
 * times, it becomes a gate instead.
 *
 * Enable in eslint.config.js: 'local/no-raw-color': 'error'
 */

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTIONAL = /\b(?:rgba?|hsla?)\s*\(/i;

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'use design tokens instead of raw colour values' },
    schema: [],
    messages: {
      raw: 'Raw colour {{value}}. Use an @theme token (bg-surface, text-muted-foreground, bg-status-warning).',
    },
  },
  create(context) {
    function check(node, value) {
      if (typeof value !== 'string') return;
      if (HEX.test(value.trim()) || FUNCTIONAL.test(value)) {
        context.report({ node, messageId: 'raw', data: { value: value.trim().slice(0, 24) } });
      }
    }

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked);
      },
    };
  },
};
