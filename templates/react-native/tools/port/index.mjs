#!/usr/bin/env node
/**
 * npm run port [-- --from <web app>] [--dry-run] [--done <file>...]
 *
 * Brings the web app's code into this app: copies everything that runs on
 * React Native as it is, converts what can be converted mechanically (env,
 * design tokens, routes), and writes PORT.md -- the list of what a person or an
 * agent still has to translate, screen by screen.
 *
 * Safe to run any number of times, from either side's latest state: copies
 * update only where this side is untouched, translations are tracked against
 * the web file they came from, and nothing written by hand is overwritten.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { argv, cwd, exit } from 'node:process';
import { MARKERS, classify, hash, listFiles, nativeSafety } from './classify.mjs';
import {
  copyAcross,
  copyAsset,
  formatted,
  rewriteEnvReads,
  rewriteImageImports,
  swapImports,
  write,
  writeOwned,
} from './copy.mjs';
import { alignDependencies, readJson } from './deps.mjs';
import { GENERATED_HEADER, nativeDotEnv, nativeEnvModule, readWebEnv } from './env.mjs';
import { expoRouteFile, moduleFile, readRoutes, routeFileSource } from './routes.mjs';
import { IMPORT_SWAPS, isTestOnlyPackage, nativePathFor } from './rules.mjs';
import { TOKENS_HEADER, convertTokens } from './tokens.mjs';
import { iconNames, iconsModule } from './icons.mjs';
import { planWork } from './plan.mjs';
import { renderWorklist } from './worklist.mjs';
import { scanSource } from './scan.mjs';

const nativeRoot = cwd();
const args = argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const dryRun = flag('--dry-run');

const manifestPath = join(nativeRoot, '.react-dev-port.json');
const reactDev = readJson(join(nativeRoot, '.react-dev.json'), {});
const manifest = readJson(manifestPath, { files: {} });

const from = option('--from') ?? manifest.from ?? reactDev.portFrom;
if (!from) {
  console.error(
    '\n  Which web app? Run `npm run port -- --from ../my-web-app` once; it is remembered.\n',
  );
  exit(2);
}
const webRoot = resolve(nativeRoot, from);
if (!existsSync(join(webRoot, 'src')) || !existsSync(join(webRoot, 'package.json'))) {
  console.error(`\n  ${webRoot} is not a web app made by react-dev (no src/ or package.json).\n`);
  exit(2);
}
if (resolve(webRoot) === resolve(nativeRoot)) {
  console.error('\n  --from points at THIS app. Point it at the web app.\n');
  exit(2);
}

// --plan: what can be translated now, as JSON. Read-only -- `react-dev
// dispatch` calls it between waves to decide what its workers take next.
if (flag('--plan')) {
  // exit() only after the write has drained: exiting straight away cuts a
  // piped stdout at 64 KB, and a real app's plan is bigger than that.
  process.stdout.write(`${JSON.stringify(planWork({ webRoot, nativeRoot }), null, 2)}\n`, () =>
    exit(0),
  );
  await new Promise(() => {});
}

// --done <file...>: mark a translation as current with the web file it came from.
if (flag('--done')) {
  const files = args.slice(args.indexOf('--done') + 1).filter((a) => !a.startsWith('--'));
  const { entries } = classify({ webRoot, nativeRoot });
  const byNative = new Map([...entries.values()].map((e) => [e.native, e]));
  let failed = false;
  for (const file of files) {
    const entry = byNative.get(file);
    const target = join(nativeRoot, file);
    if (!entry || !existsSync(target)) {
      console.error(`  ${file}: no web file translates to this path`);
      failed = true;
      continue;
    }
    const text = readFileSync(target, 'utf8');
    const problems = nativeSafety(webRoot, target, text);
    if (problems.length > 0) {
      console.error(`  ${file}: not native yet -- ${problems.join('; ')}`);
      failed = true;
      continue;
    }
    write(target, stamp(text, entry));
    console.log(`  ${file}: current with ${entry.rel}@${entry.webHash}`);
  }
  exit(failed ? 1 : 0);
}

function stamp(text, entry) {
  const line = `// react-dev:translated-from ${entry.rel}@${entry.webHash}`;
  const stripped = text.replace(/^\/\/ react-dev:translated-from .*\n/, '');
  return `${line}\n${stripped}`;
}

const templateHashes = reactDev.fileHashes ?? {};
/** The template's own versions of the files the port copies over (tools/port/defaults.json). */
const defaults = readJson(join(nativeRoot, 'tools/port/defaults.json'), {});
const log = { generated: [], owned: [] };

// 1. Environment: the web env module and .env files, renamed for Expo.
const webEnv = readWebEnv(webRoot);
if (webEnv) {
  const result = await writeOwned(
    join(nativeRoot, 'src/config/env.ts'),
    nativeEnvModule(webEnv),
    'react-dev:generated',
    dryRun,
  );
  (result === 'owned' ? log.owned : log.generated).push('src/config/env.ts');
}
for (const name of ['.env.development', '.env.example']) {
  const source = join(webRoot, name);
  if (!existsSync(source)) continue;
  const header =
    '# react-dev:generated by `npm run port` from the web app. Edit that file instead.\n';
  const result = await writeOwned(
    join(nativeRoot, name),
    header + nativeDotEnv(readFileSync(source, 'utf8')),
    'react-dev:generated',
    dryRun,
  );
  (result === 'owned' ? log.owned : log.generated).push(name);
}

// 2. Design tokens -> Uniwind themes.
const tokens = convertTokens(webRoot);
{
  const result = await writeOwned(
    join(nativeRoot, 'src/styles/tokens.css'),
    tokens.css,
    'react-dev:generated',
    dryRun,
  );
  (result === 'owned' ? log.owned : log.generated).push('src/styles/tokens.css');
  const themes = {
    $comment:
      'react-dev:generated by `npm run port`. metro.config.js and src/lib/theme.ts read this.',
    themes: tokens.themes,
    schemes: tokens.schemes,
    extraThemes: tokens.extraThemes,
  };
  const themesPath = join(nativeRoot, 'src/styles/themes.json');
  if (!dryRun) write(themesPath, await formatted(themesPath, JSON.stringify(themes)));
}

// Icons: lucide-react becomes `@/platform/icons` in every copy -- generate it
// first, so the classification below sees it as present.
{
  const result = await writeOwned(
    join(nativeRoot, 'src/platform/icons.ts'),
    iconsModule(iconNames(webRoot, nativeRoot)),
    'react-dev:generated',
    dryRun,
  );
  (result === 'owned' ? log.owned : log.generated).push('src/platform/icons.ts');
}

// 3. Classify, then copy everything portable.
const { entries, webFiles, present, leavesOf } = classify({ webRoot, nativeRoot });
const copyResults = [];
const files = {};
const used = new Set();
const usedInTests = new Set();

const dataFiles = webFiles.filter(
  (rel) =>
    !rel.startsWith('src/dev/') &&
    !rel.startsWith('src/styles/') &&
    (rel.endsWith('.json') || (rel.startsWith('src/types/') && rel.endsWith('.d.ts'))),
);
const portable = [...entries.values()].filter((e) => e.status === 'copy');

for (const item of [
  ...portable.map((e) => ({ rel: e.rel, nativeRel: e.native })),
  ...dataFiles.map((rel) => ({ rel, nativeRel: rel })),
]) {
  const result = await copyAcross({
    webRoot,
    nativeRoot,
    rel: item.rel,
    nativeRel: item.nativeRel,
    record: manifest.files[item.rel],
    templateHash: templateHashes[item.nativeRel],
    dryRun,
  });
  copyResults.push({ rel: item.rel, ...result });
  if (result.record) files[item.rel] = result.record;
}
// Images: every raster image under src/, at the same path. Copied data files
// import them (rewritten to URIs above), and a translated screen imports them
// as it did on the web -- `<Image source={photo} />` takes Metro's asset id.
for (const rel of webFiles)
  if (/\.(png|jpe?g|webp|gif)$/i.test(rel) && !rel.startsWith('src/dev/'))
    copyAsset({ webRoot, nativeRoot, rel, dryRun });

// A file copied earlier that is no longer portable (it now imports something
// untranslated, say) is withdrawn -- left in place it compiles against a
// template default and fails, or worse, runs against the wrong one. "Copied" is
// judged by content, not by the record: a native file still identical to its
// web file can only be an untouched copy, whoever made it.
const withdrawn = [];
for (const entry of entries.values()) {
  if (entry.status === 'copy' || entry.status === 'barrel') continue;
  const target = join(nativeRoot, entry.native);
  if (!existsSync(target)) continue;
  const web = readFileSync(join(webRoot, entry.rel), 'utf8');
  const asCopied = rewriteEnvReads(rewriteImageImports(swapImports(web)));
  const current = readFileSync(target, 'utf8');
  const same =
    current === web ||
    current === asCopied ||
    (asCopied !== web && current === (await formatted(target, asCopied)));
  // ...unless it is also the template's own default: other template files
  // import it, and the template is coherent with itself until the web
  // version arrives.
  const templateDefault = templateHashes[entry.native] === hash(current);
  // The template's own TEST for a file the app replaced tests the template's
  // version, not the app's: it goes, rather than failing against code it never saw.
  const orphanTemplateTest = entry.isTest && templateDefault && files[entry.rel] === undefined;
  if (orphanTemplateTest) {
    if (!dryRun) rmSync(target);
    withdrawn.push(entry.rel);
    continue;
  }
  if (!same || templateDefault) continue;
  // A path the template ships a default for gets that default back: other
  // template files import it (the mock-handler index, the test setup), and a
  // hole there breaks the build for everything, not just this file.
  const fallback = defaults[entry.native];
  if (!dryRun) {
    if (fallback === undefined) rmSync(target);
    else writeFileSync(target, fallback);
  }
  withdrawn.push(entry.rel);
}

for (const entry of portable) {
  for (const { specifier, typeOnly } of scanSource(join(webRoot, entry.rel)).imports) {
    if (typeOnly || specifier.startsWith('.') || specifier.startsWith('@/')) continue;
    // What the COPY imports: a swapped package is the native one, not the web's.
    const imported = IMPORT_SWAPS[specifier] ?? specifier;
    const forTests = entry.isTest || entry.isTestInfra || isTestOnlyPackage(imported);
    (forTests ? usedInTests : used).add(imported);
    // Vitest maps the swap back to the web package (vitest.config.ts).
    if (imported !== specifier) usedInTests.add(specifier);
    if (imported.startsWith('@/')) used.delete(imported);
  }
}

// Barrels: the web's re-export lines, keeping only members that are native
// now. A screen that uses three translated atoms goes live without waiting for
// the other twenty-seven; the barrel grows as they are translated.
const barrels = { written: 0, partial: 0 };
for (const entry of entries.values()) {
  if (entry.status !== 'barrel') continue;
  // Per member: a name is kept when every file it finally comes from (through
  // nested barrels) is present natively. `export *` from a barrel is always
  // safe -- that barrel only exports what is present itself.
  const statements = [];
  let total = 0;
  let keptCount = 0;
  for (const item of entry.reexports) {
    const targetIsBarrel = entries.get(item.target)?.status === 'barrel';
    if (item.star) {
      total += 1;
      if (targetIsBarrel || present(item.target)) {
        keptCount += 1;
        statements.push(item.text);
      }
      continue;
    }
    const keep = item.elements.filter((element) =>
      (targetIsBarrel ? leavesOf(item.target, element.source) : [item.target]).every(present),
    );
    total += item.elements.length;
    keptCount += keep.length;
    if (keep.length === item.elements.length) statements.push(item.text);
    else if (keep.length > 0)
      statements.push(
        `export ${item.typeOnly ? 'type ' : ''}{ ${keep.map((element) => element.text).join(', ')} } from '${item.specifier}';`,
      );
  }
  const header =
    keptCount === total
      ? '// react-dev:generated barrel -- the web file, every member native.'
      : `// react-dev:generated barrel -- ${String(keptCount)} of ${String(total)} members; the rest are not native yet.`;
  const body = statements.join('\n');
  const target = join(nativeRoot, entry.native);
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
  const replaceable =
    current === null ||
    current.slice(0, 200).includes('react-dev:generated') ||
    templateHashes[entry.native] === hash(current) ||
    current === readFileSync(join(webRoot, entry.rel), 'utf8');
  if (!replaceable) continue;
  const content = await formatted(target, `${header}\n${body}${body ? '\n' : 'export {};\n'}`);
  if (current !== content && !dryRun) write(target, content);
  barrels.written += 1;
  if (keptCount < total) barrels.partial += 1;
  files[entry.rel] = { web: entry.webHash, native: hash(content) };
}

// 4. Stamp translations nobody stamped, so later web edits show up as stale.
for (const entry of entries.values()) {
  if (entry.nativeState !== 'unstamped' || dryRun) continue;
  const target = join(nativeRoot, entry.native);
  write(target, stamp(readFileSync(target, 'utf8'), entry));
  entry.nativeState = 'done';
}

// 5. One Expo Router screen per web route.
const webRoutes = readRoutes(webRoot);
const allPaths = webRoutes.map((route) => route.path);
const routes = [];
const routeFiles = new Set();
for (const route of webRoutes) {
  const file = expoRouteFile(route.path, allPaths);
  const pageRel = moduleFile(webRoot, route.module);
  const pageNative = pageRel ? nativePathFor(pageRel) : null;
  let ready = false;
  if (pageNative && existsSync(join(nativeRoot, pageNative))) {
    const text = readFileSync(join(nativeRoot, pageNative), 'utf8');
    ready = nativeSafety(webRoot, join(nativeRoot, pageNative), text).length === 0;
  }
  const result = await writeOwned(
    join(nativeRoot, file),
    routeFileSource(route, pageNative, ready),
    'react-dev:route',
    dryRun,
  );
  routeFiles.add(file);
  routes.push({
    ...route,
    file,
    pageRel,
    pageNative,
    ready: ready && result !== 'owned',
    owned: result === 'owned',
  });
}
// A generated screen whose web route is gone goes with it.
for (const rel of listFiles(nativeRoot, 'src/app')) {
  if (routeFiles.has(rel) || !/\.tsx$/.test(rel)) continue;
  const text = readFileSync(join(nativeRoot, rel), 'utf8');
  if (/react-dev:route(-stub)?\b/.test(text.slice(0, 200)) && webRoutes.length > 0 && !dryRun) {
    rmSync(join(nativeRoot, rel));
    log.generated.push(`removed ${rel} (route gone from the web app)`);
  }
}

// 6. Dependencies the copied code was written against.
const depChanges = alignDependencies({ webRoot, nativeRoot, used, usedInTests, dryRun });

// 7. The worklist and the record of what was copied.
const SHELL_HINTS = [
  [/router\.tsx$/, 'the routes are files in src/app/ now -- generated from src/config/routes.ts'],
  [/providers\.tsx$/, 'providers go in src/app/_layout.tsx (query client, i18n are already there)'],
  [/guard/, 'a group layout: src/app/(app)/_layout.tsx returning <Redirect href="/sign-in" />'],
  [/(frame|shell|layout)/, 'navigation chrome: a Tabs or Stack layout in src/app/_layout.tsx'],
  [/error-boundary/, '`export function ErrorBoundary` from a route or layout file (Expo Router)'],
];
const shellNotes = [...entries.values()]
  .filter((e) => e.status === 'shell')
  .map((e) => ({
    rel: e.rel,
    hint: (SHELL_HINTS.find(([pattern]) => pattern.test(e.rel)) ?? [
      null,
      're-implement in a layout',
    ])[1],
  }));

const webName = basename(webRoot);
const commit = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: webRoot,
      encoding: 'utf8',
      // A web app that is not a git repository is fine; say nothing about it.
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
})();
const when = new Date().toISOString().slice(0, 10) + (commit ? ` (web commit ${commit})` : '');
const worklist = renderWorklist({
  webName,
  webRoot: from,
  when,
  entries,
  routes,
  copyResults,
  tokens,
  depChanges,
  shellNotes,
});
if (!dryRun) {
  writeFileSync(
    join(nativeRoot, 'PORT.md'),
    await formatted(join(nativeRoot, 'PORT.md'), worklist),
  );
  writeFileSync(manifestPath, `${JSON.stringify({ from, webCommit: commit, files }, null, 2)}\n`);
  // Copied files are formatted (and linted) on the web side, by the web's own
  // tool versions. Prettier here may be a release apart and wrap lines
  // differently, which would fail `format:check` on a byte-for-byte copy.
  writeFileSync(
    join(nativeRoot, '.react-dev-port.ignore'),
    [
      '# react-dev:generated by `npm run port` -- files copied from the web app.',
      '# Formatted there; `npm run format` must not reformat them here.',
      ...Object.keys(files).sort(),
      '',
    ].join('\n'),
  );
}

// 8. Summary.
const count = (action) => copyResults.filter((r) => r.action === action).length;
const all = [...entries.values()].filter((e) => !e.isTest);
const translate = all.filter((e) => e.status === 'translate');
const translatedCount = translate.filter((e) =>
  ['done', 'unstamped'].includes(e.nativeState),
).length;
console.log(`
  ${dryRun ? 'Would port' : 'Ported'} ${webName} -> ${basename(nativeRoot)}

  copied     ${count('added')} new · ${count('updated')} updated · ${count('same')} unchanged${withdrawn.length ? ` · ${withdrawn.length} withdrawn (no longer portable)` : ''}${count('diverged') ? ` · ${count('diverged')} DIVERGED (see PORT.md)` : ''}
  translate  ${translatedCount}/${translate.length} done · ${all.filter((e) => e.status === 'blocked').length} blocked behind them
  barrels    ${barrels.written} generated, ${barrels.partial} still partial
  screens    ${routes.filter((r) => r.ready).length}/${routes.length} live, the rest show a stub
  generated  ${log.generated.join(', ')}${log.owned.length ? `\n  yours      ${log.owned.join(', ')} (no longer generated: you removed the header)` : ''}${depChanges.length ? `\n  deps       ${depChanges.length} changed -- run \`npm install\`` : ''}

  Next: PORT.md, section 1.
`);
void GENERATED_HEADER;
void TOKENS_HEADER;
void MARKERS;
