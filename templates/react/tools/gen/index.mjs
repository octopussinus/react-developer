#!/usr/bin/env node
/**
 * Deterministic scaffolding.
 *
 * The division of labour this enforces: the generator owns everything
 * mechanical -- folder layout, barrel exports, route registration, locale key
 * stubs, test and story skeletons -- and the agent owns the judgment, i.e. what
 * the feature actually does.
 *
 * Why it matters: "create the file, then update five other files consistently"
 * is exactly the task an LLM fails at silently. A generator does all five or
 * crashes, and it gives generated code a KNOWN SHAPE, which is what makes
 * `react-dev sync` able to migrate it. Tested from the CLI repo's pytest suite
 * (tests/test_cli.py), which generates into a temp copy and runs prettier on it.
 *
 *   npm run gen -- feature   orders --route=/orders
 *   npm run gen -- component orders OrderCard
 *   npm run gen -- hook      orders useOrderFilters
 *   npm run gen -- page      orders OrderDetail --route=/orders/:id
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { argv, cwd, exit } from 'node:process';

const ROOT = cwd();
const ROUTE_ANCHOR = '  // react-dev:routes -- the generator inserts new entries above this line';

// --------------------------------------------------------------------------- //
// helpers
// --------------------------------------------------------------------------- //

const created = [];
const modified = [];

function fail(message) {
  console.error(`\n  error  ${message}\n`);
  exit(1);
}

function toKebab(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function toPascal(value) {
  return toKebab(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function toCamel(value) {
  const pascal = toPascal(value);
  return pascal[0].toLowerCase() + pascal.slice(1);
}

/**
 * Format with the PROJECT's own prettier config before writing.
 *
 * Templates are hand-written strings, so whether a line fits depends on the
 * name substituted into it: `gen -- feature orders` stayed under printWidth
 * while `invoices` produced a 105-character signature, and `npm run verify`
 * then failed on format:check immediately after generating. Formatting here
 * makes the output correct for any name instead of for the names we happened
 * to test.
 *
 * Soft dependency: if prettier cannot be loaded the generator still works, it
 * just writes unformatted and says so.
 */
let prettierModule;
let prettierTried = false;

async function formatIfPossible(contents, absolute) {
  if (!prettierTried) {
    prettierTried = true;
    try {
      prettierModule = await import('prettier');
    } catch {
      console.log('  note     prettier unavailable; writing unformatted');
      prettierModule = null;
    }
  }
  if (!prettierModule) return contents;
  try {
    const config = await prettierModule.resolveConfig(absolute);
    return await prettierModule.format(contents, { ...config, filepath: absolute });
  } catch (error) {
    // A template with a genuine syntax error must not be silently swallowed.
    console.log(`  warn     could not format ${relativeTo(absolute)}: ${error.message}`);
    return contents;
  }
}

function relativeTo(absolute) {
  return absolute.startsWith(ROOT) ? absolute.slice(ROOT.length + 1) : absolute;
}

async function write(relative, contents) {
  const absolute = join(ROOT, relative);
  if (existsSync(absolute)) {
    console.log(`  skip     ${relative} (exists)`);
    return false;
  }
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, await formatIfPossible(contents, absolute), 'utf8');
  created.push(relative);
  console.log(`  create   ${relative}`);
  return true;
}

async function edit(relative, transform) {
  const absolute = join(ROOT, relative);
  if (!existsSync(absolute)) fail(`${relative} not found -- is this a react-dev project?`);
  const before = await readFile(absolute, 'utf8');
  const after = transform(before);
  if (after === before) {
    console.log(`  skip     ${relative} (no change needed)`);
    return;
  }
  await writeFile(absolute, await formatIfPossible(after, absolute), 'utf8');
  modified.push(relative);
  console.log(`  modify   ${relative}`);
}

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (const arg of args) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (match) flags[match[1]] = match[2] ?? true;
    else positional.push(arg);
  }
  return { flags, positional };
}

async function assertFeatureExists(slug) {
  if (!existsSync(join(ROOT, 'src/features', slug))) {
    fail(`feature "${slug}" does not exist. Run:  npm run gen -- feature ${slug}`);
  }
}

/** Register a route in the registry, before the anchor comment. */
async function registerRoute({ slug, pageName, routePath, sidebar }) {
  const importPath = `@/features/${slug}/pages/${toKebab(pageName)}`;
  const entry = [
    '  {',
    `    path: '${routePath}',`,
    `    lazy: () => import('${importPath}'),`,
    '    meta: {',
    `      titleKey: '${slug}:title',`,
    ...(sidebar ? [`      sidebar: { icon: 'square', group: 'main' },`] : []),
    '    },',
    '  },',
  ].join('\n');

  await edit('src/config/routes.ts', (source) => {
    if (source.includes(`path: '${routePath}'`)) return source;
    if (!source.includes(ROUTE_ANCHOR)) {
      fail(
        'route anchor missing from src/config/routes.ts -- restore the "react-dev:routes" comment',
      );
    }
    return source.replace(ROUTE_ANCHOR, `${entry}\n${ROUTE_ANCHOR}`);
  });
}

/** Add a namespace file per locale, so no locale is ever left behind. */
async function addLocaleNamespace(slug, titleKey) {
  const localesDir = join(ROOT, 'src/locales');
  if (!existsSync(localesDir)) return;

  const locales = (await readdir(localesDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const locale of locales) {
    const relative = `src/locales/${locale}/${slug}.json`;
    // Non-reference locales get a TODO marker: a missing translation must be
    // visible, never silently English.
    const value = locale === 'en' ? titleKey : `TODO:${locale} ${titleKey}`;
    await write(relative, `${JSON.stringify({ title: value, states: {} }, null, 2)}\n`);
  }

  await edit('src/config/i18n.ts', (source) => {
    const match = /export const namespaces = \[(.*?)\] as const;/s.exec(source);
    if (!match || match[1].includes(`'${slug}'`)) return source;
    const names = `${match[1].trim().replace(/,$/, '')}, '${slug}'`;
    return source.replace(match[0], `export const namespaces = [${names}] as const;`);
  });

  await edit('src/types/i18next.d.ts', (source) => {
    if (source.includes(`locales/en/${slug}.json`)) return source;
    const withImport = source.replace(
      /(import type nav from '@\/locales\/en\/nav.json';)/,
      `$1\nimport type ${toCamel(slug)} from '@/locales/en/${slug}.json';`,
    );
    return withImport.replace(
      /(\s+)(nav: typeof nav;)/,
      `$1$2$1${toCamel(slug)}: typeof ${toCamel(slug)};`,
    );
  });
}

// --------------------------------------------------------------------------- //
// file bodies
// --------------------------------------------------------------------------- //

const body = {
  featureIndex: (slug, pageName) => `/**
 * Public surface of the "${slug}" feature.
 *
 * Only what is exported here may be imported from outside. eslint-plugin-boundaries
 * enforces it, so adding an export is a deliberate API decision.
 */
export { default as ${pageName} } from './pages/${toKebab(pageName)}';
export type { ${toPascal(slug)}Item } from './types';
`,

  types: (slug) => `/**
 * Feature-local types only.
 *
 * API response shapes belong in the generated contract (src/lib/api/generated).
 * Never hand-write one here: a guessed field name type-checks and fails in
 * production. If a field is missing from the contract, stop and report it.
 */
export interface ${toPascal(slug)}Item {
  id: string;
}
`,

  api: (slug) => {
    const Pascal = toPascal(slug);
    const camel = toCamel(slug);
    return `import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ${Pascal}Item } from '../types';

/** Key factory: invalidation is then a lookup, never a guess. */
export const ${camel}Keys = {
  all: ['${slug}'] as const,
  list: () => [...${camel}Keys.all, 'list'] as const,
  detail: (id: string) => [...${camel}Keys.all, 'detail', id] as const,
};

export function use${Pascal}List() {
  return useQuery({
    queryKey: ${camel}Keys.list(),
    queryFn: () => api.get<${Pascal}Item[]>('/${slug}'),
  });
}
`;
  },

  apiTest: (slug) => {
    const Pascal = toPascal(slug);
    const camel = toCamel(slug);
    return `import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/testing/mocks/server';
import { QueryWrapper } from '@/testing/render';
import { ${camel}Keys, use${Pascal}List } from './use-${toKebab(slug)}-list';

describe('${camel}Keys', () => {
  it('nests list and detail keys under the feature root', () => {
    expect(${camel}Keys.list()).toEqual(['${slug}', 'list']);
    expect(${camel}Keys.detail('42')).toEqual(['${slug}', 'detail', '42']);
  });

  it('shares a prefix so invalidating all also invalidates children', () => {
    expect(${camel}Keys.detail('42').slice(0, 1)).toEqual([...${camel}Keys.all]);
  });
});

describe('use${Pascal}List', () => {
  // Mocked at the NETWORK boundary by the default handler in
  // src/testing/mocks/handlers/${slug}.ts -- never by stubbing our own modules,
  // which would stop testing the fetch path at all.
  it('returns the list from the API', async () => {
    const { result } = renderHook(() => use${Pascal}List(), { wrapper: QueryWrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toHaveLength(5);
  });

  // Unhappy paths are per-test overrides, so the default handler stays the happy
  // path for everyone else. setup.ts resets handlers after each test.
  it('surfaces a server error', async () => {
    server.use(http.get('*/${slug}', () => HttpResponse.json(null, { status: 500 })));

    const { result } = renderHook(() => use${Pascal}List(), { wrapper: QueryWrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('handles an empty list', async () => {
    server.use(http.get('*/${slug}', () => HttpResponse.json([])));

    const { result } = renderHook(() => use${Pascal}List(), { wrapper: QueryWrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([]);
  });
});
`;
  },

  page: (slug, pageName) => {
    const Pascal = toPascal(slug);
    return `import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, LoadingState } from '@/components/molecules';
import { use${Pascal}List } from '../api/use-${toKebab(slug)}-list';

/**
 * All four states are handled explicitly. Early returns, not nested ternaries --
 * and react-analyze checks that none of them is missing.
 */
export default function ${pageName}() {
  const { t } = useTranslation('${slug}');
  const { data, isPending, error, refetch } = use${Pascal}List();

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  // After the two guards above, TanStack Query has narrowed data to defined,
  // so a !data check here is provably dead (no-unnecessary-condition).
  if (data.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </header>
      <ul className="space-y-2">
        {data.map((item) => (
          <li key={item.id} className="rounded-card border border-border bg-surface p-4">
            {item.id}
          </li>
        ))}
      </ul>
    </div>
  );
}
`;
  },

  component: (slug, name) => `import { cn } from '@/lib/cn';

export interface ${name}Props {
  className?: string;
}

/**
 * Feature component. It may compose atoms and molecules from @/components,
 * but anything reusable beyond this feature belongs in those shared layers --
 * promote it rather than copying it.
 */
export function ${name}({ className }: ${name}Props) {
  return (
    <div className={cn('rounded-card border border-border bg-surface p-4', className)}>
      {/* TODO: implement. Tokens only -- no raw colours, no literal strings. */}
    </div>
  );
}
`,

  componentTest: (name) => `import { describe, expect, it } from 'vitest';
import { render } from '@/testing/render';
import { ${name} } from './${toKebab(name)}';

describe('${name}', () => {
  it('renders', () => {
    const { container } = render(<${name} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  // TODO: replace the smoke test above with assertions about behaviour.
  // \`npm run test:mutation\` will flag it as a weak assertion until you do.
});
`,

  componentStory: (slug, name) => `import type { Meta, StoryObj } from '@storybook/react-vite';
import { ${name} } from './${toKebab(name)}';

const meta = {
  title: '${toPascal(slug)}/${name}',
  component: ${name},
  tags: ['autodocs'],
} satisfies Meta<typeof ${name}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
// TODO: add a story per state -- loading, empty, error, long content.
`,

  mockFactory: (slug, entity) => {
    const camel = toCamel(entity);
    return `import { faker } from '../factories';
import type { ${entity} } from '@/features/${slug}';

/**
 * Factory for ${entity}. Always accept overrides so a test can pin the one field
 * it cares about:
 *
 *   build${entity}({ id: 'known-id' })
 *
 * Shape this from the GENERATED API type once you have one -- a factory that
 * invents a field hides exactly the bug generated types exist to prevent.
 */
export function build${entity}(overrides: Partial<${entity}> = {}): ${entity} {
  return {
    id: faker.string.uuid(),
    ...overrides,
  };
}

/** A list, deterministic for a given count. */
export function build${entity}List(count = 5, overrides: Partial<${entity}> = {}): ${entity}[] {
  return Array.from({ length: count }, () => build${entity}(overrides));
}

// TODO: add the realistic extremes. A factory that only makes tidy data hides
// every layout bug the UI has:
//   export const ${camel}WithLongText = () => build${entity}({ name: 'x'.repeat(80) });
//   export const ${camel}AtZero = () => build${entity}({ total: 0 });
//   export const ${camel}Minimal = () => build${entity}({ description: null });
`;
  },

  mockHandler: (slug, entity) => {
    const camel = toCamel(entity);
    return `import { http, HttpResponse } from 'msw';
import { build${entity}List } from '../factories/${toKebab(entity)}';

/**
 * HAPPY PATH ONLY for ${slug}.
 *
 * Unhappy paths belong in the test that needs them, via \`server.use(...)\`:
 * a 500 baked in here would break every other test. Empty, error and loading
 * states are per-test overrides.
 */
export const ${camel}Handlers = [
  http.get('*/${slug}', () => HttpResponse.json(build${entity}List(5))),

  http.get('*/${slug}/:id', ({ params }) =>
    HttpResponse.json(build${entity}List(1, { id: String(params['id']) })[0]),
  ),
];
`;
  },

  sharedComponent: (layer, name) => {
    // Only what the stub actually uses -- an unused import fails the gate.
    // The comment in the body says where to import the next layer down from.
    const imports =
      layer === 'template'
        ? "import type { ReactNode } from 'react';\nimport { cn } from '@/lib/cn';"
        : "import { cn } from '@/lib/cn';";

    const rules = {
      atom: 'Atom. Presentational only: no store, no fetch, no t(), no router.\n * Everything it renders comes from props. May import only lib and types.',
      molecule:
        'Molecule. Composes atoms. May translate and read a store.\n * No domain knowledge -- it must be reusable by any feature.',
      organism: 'Organism. A distinct section of UI: owns state, composes molecules.',
      template:
        'Template. Arranges organisms into a layout and takes content\n * through slots. NEVER fetches -- a feature page supplies the real content.',
    }[layer];

    const composeFrom = {
      atom: 'nothing -- an atom composes no other component',
      molecule: "atoms: import { Button, Input } from '@/components/atoms'",
      organism: "molecules: import { EmptyState } from '@/components/molecules'",
      template: "organisms: import { SidebarNav } from '@/components/organisms'",
    }[layer];

    const body =
      layer === 'template'
        ? `    <div className={cn('min-h-dvh bg-background', className)}>{children}</div>`
        : `    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      {/* TODO: implement.
          Compose from ${composeFrom}.
          Role tokens only -- no raw colours, no literal strings. */}
    </div>`;

    const props =
      layer === 'template'
        ? `export interface ${name}Props {
  children: ReactNode;
  className?: string;
}`
        : `export interface ${name}Props {
  className?: string;
}`;

    const args = layer === 'template' ? '{ children, className }' : '{ className }';

    return `${imports}

${props}

/**
 * ${rules}
 *
 * The import direction is enforced by eslint-plugin-boundaries, so a wrong
 * layer is a failing lint rule rather than a review comment.
 */
export function ${name}(${args}: ${name}Props) {
  ${layer === 'template' ? `return ${body.trim()};` : `return (\n${body}\n  );`}
}
`;
  },

  sharedTest: (layer, name) => `import { describe, expect, it } from 'vitest';
import { render${layer === 'template' ? ', screen' : ''} } from '@/testing/render';
import { ${name} } from './${toKebab(name)}';

describe('${name}', () => {
  it('renders', () => {
    ${
      layer === 'template'
        ? `render(<${name}>content</${name}>);
    expect(screen.getByText('content')).toBeInTheDocument();`
        : `const { container } = render(<${name} />);
    expect(container.firstChild).toBeInTheDocument();`
    }
  });

  // TODO: replace the smoke test above with assertions about behaviour.
  // \`npm run test:mutation\` flags a weak assertion like this one.
});
`,

  sharedStory: (layer, name) => {
    const title = {
      atom: 'Atoms',
      molecule: 'Molecules',
      organism: 'Organisms',
      template: 'Templates',
    }[layer];
    // A layer with a REQUIRED prop needs default args here; without them
    // Storybook's types reject `Default: Story = {}`.
    const defaultArgs = layer === 'template' ? "\n  args: { children: 'Page content' }," : '';

    return `import type { Meta, StoryObj } from '@storybook/react-vite';
import { ${name} } from './${toKebab(name)}';

const meta = {
  title: '${title}/${name}',
  component: ${name},
  tags: ['autodocs'],${defaultArgs}
} satisfies Meta<typeof ${name}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
// TODO: one story per STATE -- loading, empty, error, long content, disabled.
`;
  },

  hook: (name) => `import { useCallback, useState } from 'react';

export function ${name}() {
  const [value, setValue] = useState<string | null>(null);

  const reset = useCallback(() => {
    setValue(null);
  }, []);

  return { value, setValue, reset };
}
`,

  hookTest: (name) => `import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ${name} } from './${toKebab(name)}';

describe('${name}', () => {
  it('starts with no value', () => {
    const { result } = renderHook(() => ${name}());
    expect(result.current.value).toBeNull();
  });

  it('clears the value on reset', () => {
    const { result } = renderHook(() => ${name}());

    act(() => {
      result.current.setValue('x');
    });
    expect(result.current.value).toBe('x');

    act(() => {
      result.current.reset();
    });
    expect(result.current.value).toBeNull();
  });
});
`,
};

// --------------------------------------------------------------------------- //
// generators
// --------------------------------------------------------------------------- //

async function genFeature(positional, flags) {
  const [raw] = positional;
  if (!raw) fail('usage: npm run gen -- feature <slug> [--route=/path] [--no-sidebar]');

  const slug = toKebab(raw);
  const Pascal = toPascal(slug);
  const pageName = `${Pascal}Page`;
  const routePath = typeof flags.route === 'string' ? flags.route : `/${slug}`;

  if (existsSync(join(ROOT, 'src/features', slug))) {
    fail(`feature "${slug}" already exists`);
  }

  const base = `src/features/${slug}`;
  await write(`${base}/types/index.ts`, body.types(slug));
  await write(`${base}/api/use-${slug}-list.ts`, body.api(slug));
  await write(`${base}/api/use-${slug}-list.test.ts`, body.apiTest(slug));
  await write(`${base}/pages/${toKebab(pageName)}.tsx`, body.page(slug, pageName));
  await write(`${base}/components/.gitkeep`, '');
  await write(`${base}/hooks/.gitkeep`, '');
  await write(`${base}/index.ts`, body.featureIndex(slug, pageName));

  await addLocaleNamespace(slug, Pascal);
  await registerRoute({ slug, pageName, routePath, sidebar: flags['no-sidebar'] !== true });

  // Mocks come with the feature, not later. Without them the first `npm run dev`
  // shows an error state and the agent has nothing to build the UI against.
  const entity = `${Pascal}Item`;
  await write(`src/testing/mocks/factories/${toKebab(entity)}.ts`, body.mockFactory(slug, entity));
  await write(`src/testing/mocks/handlers/${slug}.ts`, body.mockHandler(slug, entity));
  await registerMockHandlers(slug, entity);

  return { slug, routePath };
}

async function genComponent(positional) {
  const [rawSlug, rawName] = positional;
  if (!rawSlug || !rawName) fail('usage: npm run gen -- component <feature> <ComponentName>');

  const slug = toKebab(rawSlug);
  await assertFeatureExists(slug);

  const name = toPascal(rawName);
  const base = `src/features/${slug}/components`;
  await write(`${base}/${toKebab(name)}.tsx`, body.component(slug, name));
  await write(`${base}/${toKebab(name)}.test.tsx`, body.componentTest(name));
  await write(`${base}/${toKebab(name)}.stories.tsx`, body.componentStory(slug, name));
  return { slug, name };
}

async function genHook(positional) {
  const [rawSlug, rawName] = positional;
  if (!rawSlug || !rawName) fail('usage: npm run gen -- hook <feature> use<Name>');

  const slug = toKebab(rawSlug);
  await assertFeatureExists(slug);

  let name = toPascal(rawName);
  if (!name.startsWith('Use')) fail(`hook name must start with "use" (got "${rawName}")`);
  name = `use${name.slice(3)}`;

  const base = `src/features/${slug}/hooks`;
  await write(`${base}/${toKebab(name)}.ts`, body.hook(name));
  await write(`${base}/${toKebab(name)}.test.ts`, body.hookTest(name));
  return { slug, name };
}

async function genPage(positional, flags) {
  const [rawSlug, rawName] = positional;
  if (!rawSlug || !rawName) fail('usage: npm run gen -- page <feature> <PageName> --route=/path');

  const slug = toKebab(rawSlug);
  await assertFeatureExists(slug);

  const pageName = toPascal(rawName);
  const routePath = typeof flags.route === 'string' ? flags.route : `/${slug}/${toKebab(pageName)}`;

  await write(`src/features/${slug}/pages/${toKebab(pageName)}.tsx`, body.page(slug, pageName));
  await registerRoute({ slug, pageName, routePath, sidebar: flags['no-sidebar'] !== true });
  return { slug, pageName, routePath };
}

/**
 * Register a domain handler in the single composed list.
 *
 * One list is what keeps dev, Storybook and tests describing the same API --
 * separate lists drift, and then you test something you never run.
 */
async function registerMockHandlers(slug, entity) {
  const camel = toCamel(entity);
  const importLine = `import { ${camel}Handlers } from './${toKebab(slug)}';`;
  const spreadLine = `  ...${camel}Handlers,`;

  await edit('src/testing/mocks/handlers/index.ts', (source) => {
    if (source.includes(importLine)) return source;
    return source
      .replace(
        '// react-dev:mock-handlers -- the generator inserts imports above this line',
        `${importLine}\n// react-dev:mock-handlers -- the generator inserts imports above this line`,
      )
      .replace(
        '  // react-dev:mock-list -- the generator inserts spreads above this line',
        `${spreadLine}\n  // react-dev:mock-list -- the generator inserts spreads above this line`,
      );
  });
}

async function genMock(positional) {
  const [rawSlug, rawEntity] = positional;
  if (!rawSlug || !rawEntity) fail('usage: npm run gen -- mock <feature> <Entity>');

  const slug = toKebab(rawSlug);
  await assertFeatureExists(slug);
  const entity = toPascal(rawEntity);

  await write(`src/testing/mocks/factories/${toKebab(entity)}.ts`, body.mockFactory(slug, entity));
  await write(`src/testing/mocks/handlers/${slug}.ts`, body.mockHandler(slug, entity));
  await registerMockHandlers(slug, entity);

  return { slug, entity };
}

const LAYER_DIRS = {
  atom: 'atoms',
  molecule: 'molecules',
  organism: 'organisms',
  template: 'templates',
};

/** Append an export to a layer barrel, keeping it sorted and idempotent. */
async function addBarrelExport(layer, name) {
  const dir = LAYER_DIRS[layer];
  const relative = `src/components/${dir}/index.ts`;
  const line = `export { ${name}, type ${name}Props } from './${toKebab(name)}';`;

  await edit(relative, (source) => {
    if (source.includes(`from './${toKebab(name)}'`)) return source;
    const lines = [...source.split('\n').filter(Boolean), line].sort();
    return lines.join('\n') + '\n';
  });
}

async function genShared(layer, positional) {
  const [raw] = positional;
  if (!raw) fail(`usage: npm run gen -- ${layer} <ComponentName>`);

  const name = toPascal(raw);
  const dir = LAYER_DIRS[layer];
  const base = `src/components/${dir}`;

  if (existsSync(join(ROOT, base, `${toKebab(name)}.tsx`))) {
    fail(`${base}/${toKebab(name)}.tsx already exists`);
  }

  await write(`${base}/${toKebab(name)}.tsx`, body.sharedComponent(layer, name));
  await write(`${base}/${toKebab(name)}.test.tsx`, body.sharedTest(layer, name));
  await write(`${base}/${toKebab(name)}.stories.tsx`, body.sharedStory(layer, name));
  await addBarrelExport(layer, name);

  return { layer, name };
}

/**
 * Move a component out of a feature into a shared layer, rewriting every
 * import.
 *
 * This exists as a generator because doing it by hand is where mistakes
 * happen: the file moves, but one importer keeps the old path, the barrel never
 * gets the export, and the story title still says the feature's name. Here it
 * either completes or fails loudly.
 */
async function genPromote(positional, flags) {
  const [rawSlug, rawName] = positional;
  const layer = typeof flags.to === 'string' ? flags.to : '';

  if (!rawSlug || !rawName || !(layer in LAYER_DIRS)) {
    fail(
      'usage: npm run gen -- promote <feature> <ComponentName> --to=atom|molecule|organism|template',
    );
  }

  const slug = toKebab(rawSlug);
  await assertFeatureExists(slug);

  const name = toPascal(rawName);
  const file = toKebab(name);
  const from = `src/features/${slug}/components`;
  const to = `src/components/${LAYER_DIRS[layer]}`;

  if (!existsSync(join(ROOT, from, `${file}.tsx`))) {
    fail(`${from}/${file}.tsx not found`);
  }
  if (existsSync(join(ROOT, to, `${file}.tsx`))) {
    fail(`${to}/${file}.tsx already exists -- resolve the name clash first`);
  }

  // 1. move the component and whatever travels with it
  for (const suffix of ['.tsx', '.test.tsx', '.stories.tsx']) {
    const source = join(ROOT, from, `${file}${suffix}`);
    if (!existsSync(source)) continue;
    const contents = await readFile(source, 'utf8');
    await write(`${to}/${file}${suffix}`, contents);
    await rm(source);
    console.log(`  move     ${from}/${file}${suffix} -> ${to}/${file}${suffix}`);
  }

  // 2. retitle the story for its new layer
  const storyPath = `${to}/${file}.stories.tsx`;
  if (existsSync(join(ROOT, storyPath))) {
    const title = {
      atom: 'Atoms',
      molecule: 'Molecules',
      organism: 'Organisms',
      template: 'Templates',
    }[layer];
    await edit(storyPath, (source) => source.replace(/title: '[^/]+\//, `title: '${title}/`));
  }

  // 3. rewrite every importer. Relative paths inside the old feature and
  //    absolute @/features paths elsewhere both have to land on the barrel.
  const barrel = `@/components/${LAYER_DIRS[layer]}`;
  const patterns = [
    new RegExp(`'[./]*(?:\\.\\./)*components/${file}'`, 'g'),
    new RegExp(`'@/features/${slug}/components/${file}'`, 'g'),
    new RegExp(`'\\./${file}'`, 'g'),
  ];

  let rewritten = 0;
  for (const candidate of await collectSourceFiles()) {
    const relative = candidate.replace(`${ROOT}/`, '');
    if (relative.startsWith(to)) continue; // the moved files themselves
    const before = await readFile(candidate, 'utf8');
    if (!before.includes(file) && !before.includes(name)) continue;

    let after = before;
    for (const pattern of patterns) after = after.replace(pattern, `'${barrel}'`);
    if (after === before) continue;

    await writeFile(candidate, after, 'utf8');
    modified.push(relative);
    rewritten += 1;
    console.log(`  rewrite  ${relative}`);
  }

  // 4. publish it from the new layer
  await addBarrelExport(layer, name);

  console.log(
    `\n  promoted ${name}: feature "${slug}" -> ${layer} (${rewritten} importer(s) rewritten)`,
  );
  console.log('  check the component no longer reads domain state -- a shared layer must not.');
  return { name, layer };
}

/** Every .ts/.tsx under src, for import rewriting. */
async function collectSourceFiles() {
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'generated' || entry.name === 'node_modules') continue;
        await walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
  }
  await walk(join(ROOT, 'src'));
  return out;
}

// --------------------------------------------------------------------------- //
// entry
// --------------------------------------------------------------------------- //

const GENERATORS = {
  feature: genFeature,
  component: genComponent,
  hook: genHook,
  page: genPage,
  mock: genMock,
  atom: (p) => genShared('atom', p),
  molecule: (p) => genShared('molecule', p),
  organism: (p) => genShared('organism', p),
  template: (p) => genShared('template', p),
  promote: genPromote,
};

async function main() {
  const [kind, ...rest] = argv.slice(2);

  if (!kind || kind === '--help' || kind === '-h') {
    console.log(`
  npm run gen -- <generator> [args]

  feature-local:
    feature   <slug> [--route=/path] [--no-sidebar]
    component <feature> <ComponentName>
    hook      <feature> use<Name>
    page      <feature> <PageName> [--route=/path]
    mock      <feature> <Entity>     MSW handler + factory, wired into the list

  shared (atomic layers) -- check the registry first:
    atom      <ComponentName>        props only, no logic
    molecule  <ComponentName>        composes atoms
    organism  <ComponentName>        a section of UI, owns state
    template  <ComponentName>        layout and slots, never fetches

  moving one up a layer:
    promote   <feature> <ComponentName> --to=atom|molecule|organism|template

  Structure is generated so it is identical every time and migratable later.
  Never hand-create what a generator owns.
`);
    exit(kind ? 0 : 1);
  }

  const generator = GENERATORS[kind];
  if (!generator)
    fail(`unknown generator "${kind}". One of: ${Object.keys(GENERATORS).join(', ')}`);

  const { flags, positional } = parseFlags(rest);
  console.log('');
  await generator(positional, flags);

  console.log(`\n  ${created.length} created, ${modified.length} modified`);
  console.log('\n  next:  npm run verify\n');
}

await main();
