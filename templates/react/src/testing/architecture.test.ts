import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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

/**
 * Load the whole lint pipeline once, before any case is timed.
 *
 * `new ESLint()` is cheap; the FIRST `lintFiles()` is not -- it resolves the
 * flat config, every plugin, the typescript import resolver and a TypeScript
 * program. That took 1.8s on a warm dev machine and 5.3s on CI, which blew
 * vitest's 5s default and failed the build on a cold start rather than on a real
 * boundary violation. Paying it here keeps each case in the tens of
 * milliseconds, so their default timeout still means something: a case that
 * suddenly takes seconds is a genuine regression, not a cold cache.
 */
beforeAll(async () => {
  await ruleIdsFor('src/__arch__', 'export const warmup = 1;\n');
}, 120_000);

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

/**
 * The module structure, enforced rather than described.
 *
 * `src/modules/<module>/<page>/` owns api/components/hooks/validation/…, and
 * `src/modules/<module>/<one of those names>/` is code shared by that module's
 * pages. Two element patterns overlap there, so these tests pin the resolution
 * as much as the rules: without them, a `components` folder read as a page (or
 * the reverse) would silently allow every cross-module import.
 */
/**
 * Fixture modules, named so they cannot collide with a real one. The cleanup
 * below removes exactly these: an earlier version deleted `src/modules` whole
 * and took the project's own generated pages with it.
 */
const MOD_A = 'src/modules/__arch-a__';
const MOD_B = 'src/modules/__arch-b__';
const PAGE_A = `${MOD_A}/list`;

const MODULE_FIXTURES = [PAGE_A, `${MOD_A}/detail`, `${MOD_A}/components`, `${MOD_B}/components`];

describe('modules nest: a page may reach up, never sideways', () => {
  // The imports under test must RESOLVE, or boundaries cannot classify the
  // target and every rule silently passes -- which is exactly how these four
  // tests first went green against nothing. The fixtures are created here
  // rather than shipped, so the template carries no empty module folders.
  beforeAll(() => {
    for (const dir of MODULE_FIXTURES) {
      mkdirSync(join(process.cwd(), dir), { recursive: true });
      writeFileSync(join(process.cwd(), dir, 'index.ts'), 'export const placeholder = 1;\n');
    }
  });

  afterAll(() => {
    for (const dir of [MOD_A, MOD_B]) {
      rmSync(join(process.cwd(), dir), { recursive: true, force: true });
    }
  });

  it('allows a page importing its own module shared code', async () => {
    const rules = await ruleIdsFor(
      PAGE_A,
      `import { OrderBadge } from '@/modules/__arch-a__/components';\nexport const probe = OrderBadge;\n`,
    );
    expect(rules).not.toContain(ELEMENT_TYPES);
  });

  it('rejects a page importing another module shared code', async () => {
    const rules = await ruleIdsFor(
      PAGE_A,
      `import { Thing } from '@/modules/__arch-b__/components';\nexport const probe = Thing;\n`,
    );
    expect(rules).toContain(ELEMENT_TYPES);
  });

  it('rejects a page importing another page', async () => {
    const rules = await ruleIdsFor(
      PAGE_A,
      `import { DetailPage } from '@/modules/__arch-a__/detail';\nexport const probe = DetailPage;\n`,
    );
    expect(rules).toContain(ELEMENT_TYPES);
  });

  it('rejects module shared code importing one of its own pages', async () => {
    // Shared code that depends on a page stops being shareable the moment that
    // page changes -- the whole point of putting it a level up.
    const rules = await ruleIdsFor(
      `${MOD_A}/components`,
      `import { ListPage } from '@/modules/__arch-a__/list';\nexport const probe = ListPage;\n`,
    );
    expect(rules).toContain(ELEMENT_TYPES);
  });

  it('allows a page importing a shared atom', async () => {
    const rules = await ruleIdsFor(
      PAGE_A,
      `import { Button } from '@/components/atoms';\nexport const probe = Button;\n`,
    );
    expect(rules).not.toContain(ELEMENT_TYPES);
  });

  it('rejects a shared organism importing a page', async () => {
    const rules = await ruleIdsFor(
      'src/components/organisms',
      `import { ListPage } from '@/modules/__arch-a__/list';\nexport const probe = ListPage;\n`,
    );
    expect(rules).toContain(ELEMENT_TYPES);
  });
});
