import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';
import rule from './no-raw-color.js';

/**
 * An untested lint rule is a false-positive generator, so every promoted rule
 * ships with cases proving it fires on the bad input and stays quiet on the good.
 *
 *   node --test eslint-rules/
 */
const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-raw-color', () => {
  it('fires on raw colours and not on tokens', () => {
    ruleTester.run('no-raw-color', rule, {
      valid: [
        { code: "const c = 'bg-surface';" },
        { code: "const c = 'text-muted-foreground';" },
        { code: "const c = 'var(--color-primary)';" },
        // a hash that is not a colour
        { code: "const id = '#main';" },
        { code: "const sha = '#deadbeefcafe';" },
      ],
      invalid: [
        { code: "const c = '#fff';", errors: [{ messageId: 'raw' }] },
        { code: "const c = '#1f2937';", errors: [{ messageId: 'raw' }] },
        { code: "const c = 'rgb(255, 0, 0)';", errors: [{ messageId: 'raw' }] },
        { code: "const c = 'hsla(0, 0%, 0%, 0.5)';", errors: [{ messageId: 'raw' }] },
      ],
    });
  });
});
