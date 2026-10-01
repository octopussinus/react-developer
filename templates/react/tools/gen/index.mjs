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
 * crashes. It is also testable (tools/gen/index.test.mjs) and gives generated
 * code a KNOWN SHAPE, which is what makes `react-dev sync` able to migrate it.
 *
 *   npm run gen -- feature   orders --route=/orders
 *   npm run gen -- component orders OrderCard
 *   npm run gen -- hook      orders useOrderFilters
 *   npm run gen -- page      orders OrderDetail --route=/orders/:id
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
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

async function write(relative, contents) {
  const absolute = join(ROOT, relative);
  if (existsSync(absolute)) {
    console.log(`  skip     ${relative} (exists)`);
    return false;
  }
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, contents, 'utf8');
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
  await writeFile(absolute, after, 'utf8');
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
    return `import { describe, expect, it } from 'vitest';
import { ${camel}Keys } from './use-${toKebab(slug)}-list';

describe('${camel}Keys', () => {
  it('nests list and detail keys under the feature root', () => {
    expect(${camel}Keys.list()).toEqual(['${slug}', 'list']);
    expect(${camel}Keys.detail('42')).toEqual(['${slug}', 'detail', '42']);
  });

  it('shares a prefix so invalidating all also invalidates children', () => {
    expect(${camel}Keys.detail('42').slice(0, 1)).toEqual([...${camel}Keys.all]);
  });
});

// TODO: add request tests with MSW -- mock at the network boundary,
// never mock your own modules.
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

// --------------------------------------------------------------------------- //
// entry
// --------------------------------------------------------------------------- //

const GENERATORS = {
  feature: genFeature,
  component: genComponent,
  hook: genHook,
  page: genPage,
};

async function main() {
  const [kind, ...rest] = argv.slice(2);

  if (!kind || kind === '--help' || kind === '-h') {
    console.log(`
  npm run gen -- <generator> [args]

    feature   <slug> [--route=/path] [--no-sidebar]
    component <feature> <ComponentName>
    hook      <feature> use<Name>
    page      <feature> <PageName> [--route=/path]

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
