import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { scanSource } from './scan.mjs';
import {
  SHELL,
  equivalentFor,
  isTestInfra,
  isWebOnlyPackage,
  nativePathFor,
  skipReason,
} from './rules.mjs';

export const hash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);

/** First lines of a native file that say how it came to be. */
export const MARKERS = {
  adapter: 'react-dev:adapter',
  generated: 'react-dev:generated',
  routeStub: 'react-dev:route-stub',
  translated: /react-dev:translated-from (\S+)@([0-9a-f]{12})/,
};

const CODE = /\.(ts|tsx)$/;
const ASSET = /\.(png|jpe?g|gif|webp|svg|ttf|otf|woff2?|mp4|mp3)(\?.*)?$/;

export function listFiles(root, dir = 'src') {
  const out = [];
  const walk = (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(child);
      } else out.push(child);
    }
  };
  walk(dir);
  return out.sort();
}

/** `@/x/y` or `./y` from `src/a/b.ts` -> the repo-relative file it names, or null. */
export function resolveLocal(fromRel, specifier, exists) {
  let base;
  if (specifier.startsWith('@/')) base = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith('.')) base = normalize(join(dirname(fromRel), specifier));
  else return null;
  base = base.split('\\').join('/');
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}.json`,
  ];
  return candidates.find((candidate) => exists(candidate)) ?? base;
}

const isLocal = (specifier) => specifier.startsWith('@/') || specifier.startsWith('.');

/**
 * Is this NATIVE file something the app can run? It is when it has no DOM
 * markup, touches no browser global and imports no web-only package -- the
 * same test the web side is put through, run on the translation.
 */
export function nativeSafety(webRoot, path, text) {
  const facts = scanSource(path, text);
  const problems = [];
  if (facts.intrinsics.length > 0)
    problems.push(`DOM elements: ${facts.intrinsics.map((t) => `<${t}>`).join(' ')}`);
  if (facts.globals.length > 0) problems.push(`browser globals: ${facts.globals.join(', ')}`);
  if (facts.viteOnly.length > 0) problems.push(`Vite-only: ${facts.viteOnly.join(', ')}`);
  for (const { specifier, typeOnly } of facts.imports) {
    if (typeOnly || isLocal(specifier)) continue;
    if (specifier.endsWith('.css') && !specifier.endsWith('global.css'))
      problems.push(`stylesheet import ${specifier}`);
    else if (isWebOnlyPackage(webRoot, specifier)) problems.push(`web-only package ${specifier}`);
  }
  return problems;
}

/**
 * Every web file, sorted into what happens to it.
 *
 *   copy      -- portable as written; copied byte for byte
 *   translate -- renders DOM or needs the browser; the agent rewrites it
 *   blocked   -- portable itself, but imports something not ported yet
 *   shell     -- the web app frame; re-implemented as Expo Router layouts
 *   skip      -- web tooling with no native counterpart
 *
 * plus, for a translate file, where its native version stands:
 *   todo · in-progress · done · stale (web changed since it was translated)
 */
export function classify({ webRoot, nativeRoot }) {
  const webFiles = listFiles(webRoot);
  const webSet = new Set(webFiles);
  const webExists = (rel) => webSet.has(rel);
  const read = (root, rel) => readFileSync(join(root, rel), 'utf8');

  const entries = new Map();
  const code = webFiles.filter((rel) => CODE.test(rel) && !rel.endsWith('.d.ts'));

  for (const rel of code) {
    const isTest = /\.test\.tsx?$/.test(rel);
    // Runs under Vitest, not Metro: packages and Vite-isms are fine in it.
    const runsInNode = isTest || isTestInfra(rel);
    const text = read(webRoot, rel);
    const facts = scanSource(join(webRoot, rel), text);
    const entry = {
      rel,
      native: nativePathFor(rel),
      webHash: hash(text),
      isTest,
      isTestInfra: isTestInfra(rel),
      reasons: [],
      deps: [],
      status: null,
      nativeState: null,
    };
    entries.set(rel, entry);

    const skip = skipReason(rel);
    if (skip) {
      entry.status = 'skip';
      entry.reasons.push(skip);
      // Its imports still count for who-uses-what: a helper used only by
      // stories is Storybook's, and stories are skipped right here.
      for (const { specifier, typeOnly } of facts.imports)
        if (isLocal(specifier))
          entry.deps.push({ target: resolveLocal(rel, specifier, webExists), typeOnly });
      continue;
    }
    if (SHELL.test(rel) && !rel.startsWith('src/app/pages/')) {
      entry.status = 'shell';
      entry.reasons.push('web app frame -- re-implement as an Expo Router layout');
      continue;
    }

    if (facts.intrinsics.length > 0 && !runsInNode)
      entry.reasons.push(`DOM elements: ${facts.intrinsics.map((t) => `<${t}>`).join(' ')}`);
    if (facts.globals.length > 0 && !runsInNode)
      entry.reasons.push(`browser globals: ${facts.globals.join(', ')}`);
    if (facts.viteOnly.length > 0 && !runsInNode)
      entry.reasons.push(`Vite-only: ${facts.viteOnly.join(', ')}`);

    for (const { specifier, names, typeOnly } of facts.imports) {
      if (isLocal(specifier)) {
        const target = resolveLocal(rel, specifier, webExists);
        // A raster image in a data file (mock factories) is copied and
        // rewritten to a URI string; in a .tsx it is UI and gets translated.
        if (ASSET.test(target) && /\.(png|jpe?g|webp|gif)$/.test(target) && rel.endsWith('.ts')) {
          entry.assets = [...(entry.assets ?? []), target];
        } else if (ASSET.test(target)) entry.reasons.push(`asset import ${specifier}`);
        else if (target.endsWith('.css')) entry.reasons.push(`stylesheet import ${specifier}`);
        else
          entry.deps.push({
            target,
            typeOnly,
            members: facts.imports.find((i) => i.specifier === specifier)?.members ?? [],
          });
        continue;
      }
      if (typeOnly) continue;
      if (specifier.endsWith('.css')) {
        entry.reasons.push(`stylesheet import ${specifier}`);
      } else if (runsInNode) {
        // fine: tests and their helpers run under Vitest in Node
      } else if (isWebOnlyPackage(webRoot, specifier)) {
        const what = names.filter((n) => n !== '*' && n !== 'default');
        const instead = equivalentFor(specifier);
        entry.reasons.push(
          `web-only package ${specifier}${what.length ? ` (${what.join(', ')})` : ''}` +
            (instead ? ` -> ${instead}` : ''),
        );
      }
    }
    // Vitest runs the web's setup file before every test -- it is where the
    // mock handlers get registered. A test copied while that setup is still
    // blocked would run against the template's empty handlers and fail for a
    // reason that has nothing to do with the code under test.
    if (isTest && webExists('src/testing/setup.ts'))
      entry.deps.push({ target: 'src/testing/setup.ts', typeOnly: false });
    entry.status = entry.reasons.length > 0 ? 'translate' : 'copy';
    if (facts.barrel && entry.status === 'copy' && !isTest) {
      entry.status = 'barrel';
      entry.reexports = facts.reexports.map((item) => ({
        ...item,
        target: resolveLocal(rel, item.specifier, webExists),
      }));
    }
  }

  // An import from a barrel depends on the members it names, not on the whole
  // barrel. Without this every screen waits for every atom, because
  // `@/components/atoms` re-exports all thirty -- and porting becomes one big
  // bang instead of screen by screen.
  const memberTargets = (barrelRel, members, depth = 0) => {
    const barrel = entries.get(barrelRel);
    if (!barrel || barrel.status !== 'barrel' || depth > 4) return [barrelRel];
    const named = new Map();
    for (const item of barrel.reexports)
      for (const name of item.names) named.set(name, item.target);
    const stars = barrel.reexports.filter((item) => item.star).map((item) => item.target);
    const wanted = members.length > 0 ? members : [...named.keys()];
    const out = new Set(members.length > 0 ? [] : stars);
    for (const name of wanted) {
      const target = named.get(name);
      if (target) for (const leaf of memberTargets(target, [name], depth + 1)) out.add(leaf);
      else
        for (const star of stars)
          for (const leaf of memberTargets(star, [name], depth + 1)) out.add(leaf);
    }
    return [...out];
  };
  for (const entry of entries.values()) {
    entry.deps = entry.deps.flatMap((dep) =>
      entries.get(dep.target)?.status === 'barrel'
        ? memberTargets(dep.target, dep.members ?? []).map((target) => ({
            ...dep,
            target,
            via: dep.target,
          }))
        : [dep],
    );
  }

  // A helper only tests use (`test-support.ts`) is test infrastructure, and one
  // only stories use (`story-frame.ts`) is Storybook's -- whatever its name.
  // Judged by who imports it, not by where it lives.
  const importers = new Map();
  for (const entry of entries.values())
    for (const dep of entry.deps) {
      if (!importers.has(dep.target)) importers.set(dep.target, []);
      importers.get(dep.target).push(entry.rel);
    }
  const isStory = (rel) => /\.stories\.tsx?$/.test(rel);
  // Mock handlers and factories run on the phone too (src/platform/mocks.ts),
  // which the web's import graph cannot show -- never test-only, whoever
  // imports them on the web.
  const runsOnDevice = (rel) => /^src\/testing\/mocks\/(handlers|factories)\//.test(rel);
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of entries.values()) {
      if (entry.isTest || ['skip', 'barrel'].includes(entry.status)) continue;
      const users = importers.get(entry.rel) ?? [];
      if (users.length === 0) continue;
      const byUser = users.map((rel) => entries.get(rel));
      // Storybook-only, whatever its folder -- `src/testing/story-frame.tsx`
      // too: its importers are stories, and no runner here loads Storybook.
      if (
        users.every(isStory) ||
        byUser.every((user) => user?.status === 'skip' && !user.isTest && !user.isTestInfra)
      ) {
        entry.status = 'skip';
        entry.reasons = ['only Storybook uses it'];
        changed = true;
      } else if (
        !entry.isTestInfra &&
        !runsOnDevice(entry.rel) &&
        byUser.every((user) => user && (user.isTest || user.isTestInfra))
      ) {
        entry.isTestInfra = true;
        // Re-judge as test infrastructure: Node-only APIs are fine in it.
        entry.reasons = entry.reasons.filter(
          (reason) => !/^(browser globals|DOM elements|Vite-only|web-only package)/.test(reason),
        );
        entry.status = entry.reasons.length > 0 ? 'translate' : 'copy';
        changed = true;
      }
    }
  }

  // Where each translate file's native version stands.
  for (const entry of entries.values()) {
    if (entry.status !== 'translate') continue;
    const nativeFile = join(nativeRoot, entry.native);
    if (!existsSync(nativeFile)) {
      entry.nativeState = 'todo';
      continue;
    }
    const text = readFileSync(nativeFile, 'utf8');
    const problems = nativeSafety(webRoot, nativeFile, text);
    const stamp = text.slice(0, 400).match(MARKERS.translated);
    if (problems.length > 0) {
      entry.nativeState = 'in-progress';
      entry.nativeProblems = problems;
    } else if (stamp && stamp[2] !== entry.webHash) {
      entry.nativeState = 'stale';
      entry.stampedHash = stamp[2];
    } else {
      entry.nativeState = stamp ? 'done' : 'unstamped';
    }
  }

  /**
   * Can the native app import this file yet? A copied file can; anything else
   * can once a native-safe version sits at its native path -- a translation,
   * the generated env, a template adapter. Route stubs never count.
   */
  const nativeReady = new Map();
  const ready = (rel) => {
    const entry = entries.get(rel);
    if (entry?.status === 'copy') return true;
    // Blocked means the web version is NOT here yet. Whatever sits at its path
    // natively is the template's default or an old copy -- a barrel that lacks
    // this app's exports -- and must not let an importer through.
    if (entry?.status === 'blocked') return false;
    if (!entry && rel.endsWith('.json')) return webExists(rel);
    // Generated per run with only native members; importers depend on those.
    if (entry?.status === 'barrel') return true;
    // Stale is NOT ready: it compiles, but against the web file's OLD shape, and
    // a copied importer written for the new one would compile wrong or not at all.
    if (entry?.status === 'translate') return ['done', 'unstamped'].includes(entry.nativeState);
    const native = nativePathFor(rel);
    if (!nativeReady.has(native)) {
      const file = join(nativeRoot, native);
      let ok = false;
      if (existsSync(file) && CODE.test(native)) {
        const text = readFileSync(file, 'utf8');
        ok = !text.includes(MARKERS.routeStub) && nativeSafety(webRoot, file, text).length === 0;
      }
      nativeReady.set(native, ok);
    }
    return nativeReady.get(native);
  };

  // Blocked: portable itself, but leans on something that is not ported yet.
  // Repeat until nothing moves: blocking one file can block its importers.
  let moved = true;
  while (moved) {
    moved = false;
    for (const entry of entries.values()) {
      if (entry.status !== 'copy') continue;
      const missing = entry.deps.filter((dep) => !ready(dep.target));
      if (missing.length === 0) continue;
      entry.status = 'blocked';
      entry.reasons.push(
        ...missing.map(
          (dep) =>
            `imports ${dep.target}${dep.typeOnly ? ' (types)' : ''} -- ${describe(entries.get(dep.target))}`,
        ),
      );
      moved = true;
    }
  }

  // A web test runs under Vitest, in Node: it can only load web-portable code.
  // Once anything in its import chain is a native translation (an atom that
  // imports react-native), it cannot even load -- and it tests the web
  // version anyway. The translation carries its own `.native.test.tsx`.
  // What Vitest cannot load: React Native itself and native-only packages.
  // A translation that only imports stubbed modules (expo-localization) or
  // web-safe ones loads fine, and its importers' web tests still run.
  const NODE_UNLOADABLE =
    /^(react-native($|\/)|react-native-|expo-(?!localization$)|expo$|@expo\/|uniwind($|\/)|lucide-react-native$)/;
  const unloadable = new Map();
  const loadsInVitest = (rel) => {
    const entry = entries.get(rel);
    if (entry?.status !== 'translate') return true;
    if (!unloadable.has(rel)) {
      const file = join(nativeRoot, entry.native);
      unloadable.set(
        rel,
        existsSync(file) &&
          scanSource(file).imports.some((i) => !i.typeOnly && NODE_UNLOADABLE.test(i.specifier)),
      );
    }
    return !unloadable.get(rel);
  };
  // Importing ONE name from a barrel loads EVERY module the barrel re-exports.
  // Readiness follows members (that is what lets a screen go live early);
  // what a test can load has to follow the whole barrel.
  const barrelLeaves = (rel) => memberTargets(rel, []);
  const nativeInChain = (start) => {
    const seen = new Set();
    const queue = [start];
    const visit = (target) => {
      if (seen.has(target)) return null;
      seen.add(target);
      if (!loadsInVitest(target)) return target;
      queue.push(target);
      return null;
    };
    while (queue.length > 0) {
      const current = entries.get(queue.pop());
      for (const dep of current?.deps ?? []) {
        if (dep.typeOnly) continue;
        const targets = dep.via ? [dep.target, ...barrelLeaves(dep.via)] : [dep.target];
        for (const target of targets) {
          const hit = visit(target);
          if (hit) return hit;
        }
      }
    }
    return null;
  };
  for (const entry of entries.values()) {
    if (!entry.isTest || entry.status !== 'copy') continue;
    const native = nativeInChain(entry.rel);
    if (native) {
      entry.status = 'skip';
      entry.reasons.push(`imports native code (${native}) -- covered by its native test`);
    }
  }

  // A test travels with its subject, and only when the subject is copied: a
  // translated component has native tests, not the web's DOM ones.
  for (const entry of entries.values()) {
    if (!entry.isTest || entry.status === 'skip') continue;
    const subject = [
      entry.rel.replace(/\.test\.tsx?$/, '.ts'),
      entry.rel.replace(/\.test\.tsx?$/, '.tsx'),
    ].find((candidate) => entries.has(candidate));
    const subjectEntry = subject ? entries.get(subject) : null;
    if (entry.status === 'copy' && subjectEntry && subjectEntry.status !== 'copy') {
      entry.status = 'skip';
      entry.reasons.push(
        `tests ${subject}, which is ${subjectEntry.status} -- write a native test`,
      );
    } else if (entry.status !== 'copy') {
      entry.status = 'skip';
      entry.reasons.unshift('web test -- its subject gets a native test when translated');
    }
  }

  const json = webFiles.filter((rel) => rel.endsWith('.json') || rel.endsWith('.d.ts'));
  /**
   * Is there a native file at this path the app can compile against -- current
   * or not? A barrel exports everything PRESENT, so stale translations (the
   * template's own components, say) keep compiling; an importer still waits
   * until its members are READY, i.e. current.
   */
  const present = (rel) => ready(rel) || entries.get(rel)?.nativeState === 'stale';

  /** The files a barrel member finally comes from, through nested barrels. */
  const leavesOf = (barrelRel, name) => memberTargets(barrelRel, [name]);

  return { entries, extra: json, webFiles, ready, present, leavesOf };
}

function describe(entry) {
  if (!entry) return 'not found';
  if (entry.status === 'translate') return `translate (${entry.nativeState})`;
  return entry.status;
}

export function relativeTo(root, abs) {
  return relative(root, abs).split('\\').join('/');
}
