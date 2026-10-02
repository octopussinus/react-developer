#!/usr/bin/env node
/**
 * Add a component to the registry.
 *
 * Publishing an item is the same shape of task the project generator exists
 * for: copy three files, add an entry to registry.json with the right target
 * per layer, work out which npm dependencies the consumer will need, and keep
 * the categories and meta consistent. Doing four things consistently is exactly
 * what gets silently half-done by hand -- a missing `target` installs the
 * component into the wrong atomic layer of someone else's project, and a
 * missing dependency fails at their build, not yours.
 *
 *   cd registry
 *   npm run gen -- molecule Chart
 *   npm run gen -- organism DataTable --from ../../my-app/src/components/organisms/data-table.tsx
 *
 * With no --from it takes the component from the template's own tree.
 */

import { existsSync } from 'node:fs';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { argv, cwd, exit } from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = cwd();
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TEMPLATE = join(REPO, 'templates/react');

const LAYERS = {
  atom: 'atoms',
  molecule: 'molecules',
  organism: 'organisms',
  template: 'templates',
};

function fail(message) {
  console.error(`\n  ${message}\n`);
  exit(1);
}

function kebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/** Bare package specifiers -- not relative, not the `@/` alias. */
function bareImports(code) {
  const out = new Set();
  for (const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const specifier = match[1];
    if (specifier.startsWith('.') || specifier.startsWith('@/')) continue;
    // `@scope/pkg/sub` -> `@scope/pkg`, `pkg/sub` -> `pkg`
    const parts = specifier.split('/');
    out.add(specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
  }
  return out;
}

const [, , layerArg, nameArg, ...rest] = argv;

if (!layerArg || !nameArg) {
  console.log(`
  npm run gen -- <layer> <ComponentName> [--from <path to .tsx>]

    layer   atom | molecule | organism | template
    --from  the component to publish; defaults to the template's own copy

  Publishes the component, its story and its test, and registers them.
  Run \`npm run build\` afterwards, then commit and push.
`);
  exit(nameArg ? 1 : 0);
}

const layer = LAYERS[layerArg];
if (!layer) fail(`unknown layer "${layerArg}" -- use ${Object.keys(LAYERS).join(' | ')}`);

const slug = kebab(nameArg);
const fromFlag = rest.indexOf('--from');
const source =
  fromFlag === -1
    ? join(TEMPLATE, 'src/components', layer, `${slug}.tsx`)
    : resolve(rest[fromFlag + 1] ?? '');

if (!existsSync(source)) {
  fail(
    `no component at ${source}\n  Pass --from <path> if it lives outside the template.`,
  );
}

const sourceDir = dirname(source);
// Companions are found next to the SOURCE file under its own name, and copied
// out under the slug. Deriving them from the slug instead only works when the
// file happens to be named after the component, which `--from` cannot assume.
const sourceStem = basename(source).replace(/\.tsx$/, '');
const companions = [
  { suffix: '.tsx', type: 'registry:component', required: true },
  { suffix: '.stories.tsx', type: 'registry:file', required: false },
  { suffix: '.test.tsx', type: 'registry:file', required: false },
];

const registryPath = join(ROOT, 'registry.json');
if (!existsSync(registryPath)) {
  fail('registry.json not found -- run this from the registry/ directory.');
}
const registry = JSON.parse(await readFile(registryPath, 'utf8'));

if (registry.items.some((item) => item.name === slug)) {
  fail(
    `"${slug}" is already in the registry.\n` +
      '  Editing an existing item is a source change in registry/items/, not a new entry.',
  );
}

// Dependencies the CONSUMER needs: anything imported that the template does not
// already ship. Declaring one they already have is harmless; missing one breaks
// their build after the install, which is the failure worth preventing.
const templatePkg = JSON.parse(await readFile(join(TEMPLATE, 'package.json'), 'utf8'));
const shipped = new Set([
  ...Object.keys(templatePkg.dependencies ?? {}),
  ...Object.keys(templatePkg.devDependencies ?? {}),
]);

const files = [];
const dependencies = new Set();

for (const { suffix, type, required } of companions) {
  const from = join(sourceDir, `${sourceStem}${suffix}`);
  if (!existsSync(from)) {
    if (required) fail(`missing ${from}`);
    console.log(`  skip     ${sourceStem}${suffix} (not present)`);
    continue;
  }
  const to = join(ROOT, 'items', `${slug}${suffix}`);
  await copyFile(from, to);
  console.log(`  create   items/${slug}${suffix}`);

  // Only the component's own dependencies reach the consumer; a story's
  // storybook import and a test's vitest import are the consumer's dev setup.
  if (suffix === '.tsx') {
    for (const dep of bareImports(await readFile(from, 'utf8'))) {
      if (!shipped.has(dep)) dependencies.add(dep);
    }
  }

  files.push({
    path: `items/${slug}${suffix}`,
    type,
    target: `@components/${layer}/${slug}${suffix}`,
  });
}

const title = nameArg.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
const entry = {
  name: slug,
  type: 'registry:component',
  title,
  description: `TODO: one line on what it does and why it is a ${layerArg}.`,
  ...(dependencies.size > 0 ? { dependencies: [...dependencies].sort() } : {}),
  files,
  categories: [layer],
  meta: {
    atomicLayer: layerArg,
    why: 'TODO: why this layer -- what it composes, and what it deliberately does not know.',
  },
};

registry.items.push(entry);
registry.items.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(registryPath, JSON.stringify(registry, null, 2) + '\n', 'utf8');
console.log('  modify   registry.json');

console.log(`
  ${slug} registered as ${layerArg} -> @components/${layer}/
  dependencies: ${dependencies.size > 0 ? [...dependencies].sort().join(', ') : 'none beyond the template'}

  next:
    1. replace the two TODO fields in registry.json
    2. npm run build
    3. commit and push -- the publish workflow deploys it
`);
