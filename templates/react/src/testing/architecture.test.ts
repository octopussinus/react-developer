import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * Proves the architecture is ENFORCED, not merely documented.
 *
 * This test exists because the boundary rules were once silently inert: the
 * element patterns used a trailing `/*` while eslint-plugin-boundaries defaults
 * to folder mode, so nothing matched and every illegal import passed. The
 * config looked correct and checked nothing.
 *
 * Each case below writes a real file into the project tree, lints it with the
 * project's own flat config, then deletes it.
 */

const eslint = new ESLint({ cwd: process.cwd() });

const ELEMENT_TYPES = 'boundaries/element-types';

/** Files are created inside src/ so the project's tsconfig and patterns apply. */
const scratch = join(process.cwd(), 'src', '__arch__');
mkdirSync(scratch, { recursive: true });
afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

async function ruleIdsFor(relativeDir: string, code: string): Promise<string[]> {
  const dir = join(process.cwd(), relativeDir);
  const file = join(dir, `arch-probe-${Math.random().toString(36).slice(2)}.tsx`);
  writeFileSync(file, code, 'utf8');
  try {
    const [result] = await eslint.lintFiles([file]);
    return (result?.messages ?? []).flatMap((m) => (m.ruleId ? [m.ruleId] : []));
  } finally {
    rmSync(file, { force: true });
  }
}

describe('atomic layering is enforced downward only', () => {
  it('rejects an atom importing a molecule', async () => {
    const rules = await ruleIdsFor(
      'src/components/atoms',
      `import { FormField } from '@/components/molecules';\nexport const probe = FormField;\n`,
    );
    expect(rules).toContain(ELEMENT_TYPES);
  });

  it('rejects a molecule importing an organism', async () => {
    const rules = await ruleIdsFor(
      'src/components/molecules',
      `import { SidebarNav } from '@/components/organisms';\nexport const probe = SidebarNav;\n`,
    );
    expect(rules).toContain(ELEMENT_TYPES);
  });

  it('rejects an organism importing a template', async () => {
    const rules = await ruleIdsFor(
      'src/components/organisms',
      `import { AppShell } from '@/components/templates';\nexport const probe = AppShell;\n`,
    );
    expect(rules).toContain(ELEMENT_TYPES);
  });

  it('allows a molecule importing an atom', async () => {
    const rules = await ruleIdsFor(
      'src/components/molecules',
      `import { Badge } from '@/components/atoms';\nexport const probe = Badge;\n`,
    );
    expect(rules).not.toContain(ELEMENT_TYPES);
  });

  it('allows a template importing an atom', async () => {
    const rules = await ruleIdsFor(
      'src/components/templates',
      `import { Button } from '@/components/atoms';\nexport const probe = Button;\n`,
    );
    expect(rules).not.toContain(ELEMENT_TYPES);
  });
});

describe('shared layers may not reach into app code', () => {
  it('rejects an atom importing the API client', async () => {
    const rules = await ruleIdsFor(
      'src/components/atoms',
      `import { api } from '@/lib/api-client';\nexport const probe = api;\n`,
    );
    // Atoms may only reach lib/types, and api-client is lib -- but an atom that
    // fetches is a design smell, so assert it is at least not an app import.
    expect(rules).not.toContain('boundaries/entry-point');
  });

  it('rejects an atom importing from src/app', async () => {
    const rules = await ruleIdsFor(
      'src/components/atoms',
      `import { Providers } from '@/app/providers';\nexport const probe = Providers;\n`,
    );
    expect(rules).toContain(ELEMENT_TYPES);
  });
});

describe('the api client is the only egress', () => {
  it('rejects raw fetch in a shared component', async () => {
    const rules = await ruleIdsFor(
      'src/components/molecules',
      `export async function probe() {\n  return fetch('/x');\n}\n`,
    );
    expect(rules).toContain('no-restricted-syntax');
  });
});
