import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { packageName } from './rules.mjs';

/**
 * Packages the native template pins for Expo SDK compatibility. The web app's
 * version of these is irrelevant -- `npx expo install --check` owns them.
 */
const NATIVE_OWNED = [
  /^react$/,
  /^react-dom$/,
  /^react-native/,
  /^expo/,
  /^@expo\//,
  /^uniwind$/,
  /^tailwindcss$/,
  /^typescript$/,
  /^@types\/react$/,
  /^jest/,
  /^@testing-library\/react-native$/,
  /^lucide-react-native$/,
];

/**
 * Make the native package.json agree with the web app on every package the
 * copied code imports. The copy is only a copy if it compiles against the same
 * major version it was written for -- zod 3 code in a zod 4 project is a
 * rewrite waiting to happen.
 */
export function alignDependencies({ webRoot, nativeRoot, used, usedInTests, dryRun }) {
  const webPkg = JSON.parse(readFileSync(join(webRoot, 'package.json'), 'utf8'));
  const nativePath = join(nativeRoot, 'package.json');
  const nativePkg = JSON.parse(readFileSync(nativePath, 'utf8'));
  const changes = [];
  const webVersion = (name) => webPkg.dependencies?.[name] ?? webPkg.devDependencies?.[name];

  const wanted = new Map();
  for (const specifier of usedInTests) wanted.set(packageName(specifier), 'devDependencies');
  for (const specifier of used) wanted.set(packageName(specifier), 'dependencies');

  for (const [name, field] of [...wanted].sort()) {
    if (NATIVE_OWNED.some((pattern) => pattern.test(name))) continue;
    const version = webVersion(name);
    if (!version) continue;
    const inDeps = nativePkg.dependencies?.[name];
    const inDev = nativePkg.devDependencies?.[name];
    const current = inDeps ?? inDev;
    if (current === version) continue;
    const target = inDeps ? 'dependencies' : inDev ? 'devDependencies' : field;
    nativePkg[target] = { ...nativePkg[target], [name]: version };
    nativePkg[target] = Object.fromEntries(Object.entries(nativePkg[target]).sort());
    changes.push(current ? `${name} ${current} -> ${version}` : `${name}@${version} (added)`);
  }

  if (changes.length > 0 && !dryRun)
    writeFileSync(nativePath, `${JSON.stringify(nativePkg, null, 2)}\n`);
  return changes;
}

export function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}
