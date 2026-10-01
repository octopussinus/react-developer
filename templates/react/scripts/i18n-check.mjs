#!/usr/bin/env node
/**
 * Locale parity.
 *
 * A missing key is invisible to TypeScript at runtime and silently falls back
 * to English, so it ships. This makes the gap a failing build instead.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { cwd, exit } from 'node:process';

const LOCALES_DIR = join(cwd(), 'src/locales');
const REFERENCE = 'en';

/** Flatten to dotted leaf paths so nesting differences are caught too. */
function leafKeys(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

async function readNamespace(locale, file) {
  return JSON.parse(await readFile(join(LOCALES_DIR, locale, file), 'utf8'));
}

const locales = (await readdir(LOCALES_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

if (!locales.includes(REFERENCE)) {
  console.error(`  error  reference locale "${REFERENCE}" not found in src/locales`);
  exit(1);
}

const referenceFiles = (await readdir(join(LOCALES_DIR, REFERENCE))).filter((f) =>
  f.endsWith('.json'),
);

const problems = [];
let todoCount = 0;

for (const locale of locales.filter((l) => l !== REFERENCE)) {
  const files = new Set(await readdir(join(LOCALES_DIR, locale)));

  for (const file of referenceFiles) {
    if (!files.has(file)) {
      problems.push(`${locale}: missing namespace ${file}`);
      continue;
    }

    const [reference, translation] = await Promise.all([
      readNamespace(REFERENCE, file),
      readNamespace(locale, file),
    ]);

    const expected = new Set(leafKeys(reference));
    const actual = new Set(leafKeys(translation));

    for (const key of expected) {
      if (!actual.has(key)) problems.push(`${locale}/${file}: missing key "${key}"`);
    }
    for (const key of actual) {
      if (!expected.has(key))
        problems.push(`${locale}/${file}: extra key "${key}" not in ${REFERENCE}`);
    }

    todoCount += JSON.stringify(translation).split(`TODO:${locale}`).length - 1;
  }
}

if (problems.length > 0) {
  console.error(`\n  ${problems.length} locale parity problem(s):\n`);
  for (const problem of problems) console.error(`    ${problem}`);
  console.error('\n  Every locale must have exactly the keys `en` has.');
  console.error('  Use "TODO:<locale> <text>" for anything not yet translated.\n');
  exit(1);
}

const summary = `  locales ok: ${locales.join(', ')} · ${referenceFiles.length} namespace(s)`;
console.log(todoCount > 0 ? `${summary} · ${todoCount} TODO marker(s)` : summary);
