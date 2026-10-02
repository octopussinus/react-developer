#!/usr/bin/env node
/**
 * Component duplication across features.
 *
 * The same component copied into a second feature instead of promoted is a real
 * maintenance defect: the two copies drift, and a design change has to be made
 * twice. Nothing else in the gate catches it -- `jscpd`'s threshold is 3%, and a
 * single duplicated component in a real project lands around 1%, so jscpd prints
 * `Found 1 clones` and still exits 0. Verified.
 *
 * So this is a check rather than a note in a skill: "the same file name in two
 * feature folders" is mechanically decidable, and a mechanical rule belongs in a
 * failing build, not in a prompt the agent may skip.
 *
 * Escape hatch: components that legitimately share a name (two different
 * `header.tsx`) carry `// duplicate-ok: <reason>` near the top. The reason is
 * required -- an opt-out with no justification is just a disabled rule.
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cwd, exit } from 'node:process';

const ROOT = cwd();
const FEATURES = join(ROOT, 'src/features');
const SHARED_LAYERS = ['atoms', 'molecules', 'organisms', 'templates'];
const OPT_OUT = /\/\/\s*duplicate-ok:\s*\S+/;

/** Only the component file itself -- its test and story share its name by design. */
function isComponent(name) {
  return name.endsWith('.tsx') && !name.endsWith('.test.tsx') && !name.endsWith('.stories.tsx');
}

async function componentsIn(directory) {
  if (!existsSync(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && isComponent(entry.name)).map((e) => e.name);
}

async function hasOptOut(path) {
  return OPT_OUT.test(await readFile(path, 'utf8'));
}

if (!existsSync(FEATURES)) {
  console.log('  no src/features yet -- nothing to check');
  exit(0);
}

/** name -> [{ path, kind }] */
const byName = new Map();

const features = (await readdir(FEATURES, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const feature of features) {
  const directory = join(FEATURES, feature, 'components');
  for (const file of await componentsIn(directory)) {
    const entry = {
      path: `src/features/${feature}/components/${file}`,
      kind: `feature ${feature}`,
    };
    byName.set(file, [...(byName.get(file) ?? []), entry]);
  }
}

// A feature component that duplicates an existing SHARED one is worse: the
// shared version already exists and should simply be imported.
for (const layer of SHARED_LAYERS) {
  const directory = join(ROOT, 'src/components', layer);
  for (const file of await componentsIn(directory)) {
    if (!byName.has(file)) continue;
    byName.set(file, [
      ...byName.get(file),
      { path: `src/components/${layer}/${file}`, kind: `shared ${layer}` },
    ]);
  }
}

const problems = [];

for (const [name, places] of byName) {
  if (places.length < 2) continue;
  const optedOut = await Promise.all(places.map((place) => hasOptOut(join(ROOT, place.path))));
  if (optedOut.every(Boolean)) continue;
  problems.push({ name, places, partial: optedOut.some(Boolean) });
}

if (problems.length === 0) {
  console.log(`  components ok: no duplication across ${features.length} feature(s)`);
  exit(0);
}

console.error('\n  Duplicated components\n');

for (const { name, places, partial } of problems) {
  console.error(`  ${name}`);
  for (const place of places) console.error(`    ${place.path}  (${place.kind})`);

  const shared = places.find((place) => place.kind.startsWith('shared'));
  if (shared) {
    console.error(`    -> a shared version already exists. Import it and delete the copy.`);
  } else {
    const [first] = places;
    const feature = first.kind.replace('feature ', '');
    const pascal = name
      .replace(/\.tsx$/, '')
      .split('-')
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join('');
    console.error(
      `    -> npm run gen -- promote ${feature} ${pascal} --to=molecule` +
        `   (then delete the other copy)`,
    );
  }
  if (partial) {
    console.error('    note: only some copies carry `// duplicate-ok:` -- all of them must.');
  }
  console.error('');
}

console.error(
  '  If they only look alike and would diverge, keep them and add\n' +
    '  `// duplicate-ok: <reason>` to EVERY copy. Premature sharing is worse\n' +
    '  than duplication -- but an unjustified copy is worse than both.\n',
);

exit(1);
