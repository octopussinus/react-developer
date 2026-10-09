import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import ts from 'typescript';
import { MARKERS, hash } from './classify.mjs';
import { IMPORT_SWAPS } from './rules.mjs';

/**
 * Apply the drop-in package swaps to a copied file. Only whole specifiers in
 * import/export/require positions are rewritten -- never a string that merely
 * mentions the package.
 */
export function swapImports(text) {
  let out = text;
  for (const [from, to] of Object.entries(IMPORT_SWAPS)) {
    const pattern = new RegExp(`(from\\s+|import\\s*\\(\\s*|require\\(\\s*)(['"])${from}\\2`, 'g');
    out = out.replace(pattern, `$1$2${to}$2`);
  }
  return out;
}

const IMAGE = /\.(png|jpe?g|webp|gif)$/;

/**
 * Insert lines right after the file's last import STATEMENT. Read from the AST:
 * matching lines that start with `import` lands inside a multi-line
 * `import { a, b } from 'x';` and breaks the file (it did, on a real app).
 */
export function afterImports(text, insert) {
  if (insert.length === 0) return text;
  const file = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = file.statements.filter((statement) => ts.isImportDeclaration(statement));
  if (imports.length === 0) return `${insert.join('\n')}\n${text}`;
  const end = imports[imports.length - 1].getEnd();
  return `${text.slice(0, end)}\n${insert.join('\n')}${text.slice(end)}`;
}

/**
 * Vite's environment reads, as Expo's. Expo inlines only the literal form
 * `process.env.EXPO_PUBLIC_X`, so each read is rewritten in full; the build
 * flags become React Native's `__DEV__`.
 */
export function rewriteEnvReads(text) {
  const expo = (name) => {
    if (name === 'DEV') return '__DEV__';
    if (name === 'PROD') return '!__DEV__';
    if (name === 'MODE') return 'process.env.NODE_ENV';
    return `process.env.EXPO_PUBLIC_${name.replace(/^VITE_/, '')}`;
  };
  return text
    .replace(/import\.meta\.env\.([A-Z][A-Z0-9_]*)/g, (_, name) => expo(name))
    .replace(/import\.meta\.env\[(['"])([A-Z][A-Z0-9_]*)\1\]/g, (_, __, name) => expo(name));
}

/**
 * `import photo from '../assets/a.webp'` in a copied DATA file becomes a URI
 * string on both sides (see src/platform/asset-uri.ts). Only default imports
 * of raster images: an SVG needs a Metro transformer and stays a translation.
 */
export function rewriteImageImports(text) {
  const found = [];
  // Vite's other asset idiom, as an import first: `new URL('./a.webp',
  // import.meta.url).href` becomes `import __asset0 from './a.webp'`.
  const hoisted = [];
  const unhoisted = text.replace(
    /new URL\(\s*(['"])(\.{1,2}\/[^'"]+\.(?:png|jpe?g|webp|gif))\1\s*,\s*import\.meta\.url\s*\)(?:\.href)?/gi,
    (_, quote, path) => {
      const name = `__asset${String(hoisted.length)}`;
      hoisted.push(`import ${name} from ${quote}${path}${quote};`);
      found.push(name);
      return `assetUri(${name})`;
    },
  );
  const withImports = afterImports(unhoisted, hoisted);
  const out = withImports.replace(
    /^import\s+([A-Za-z_$][\w$]*)\s+from\s+(['"])([^'"]+)\2;?[ \t]*$/gm,
    (line, name, quote, path) => {
      if (!IMAGE.test(path) || name.startsWith('__asset')) return line;
      found.push(name);
      return `import ${name}Asset from ${quote}${path}${quote};`;
    },
  );
  if (found.length === 0) return text;
  const consts = found
    .filter((name) => !name.startsWith('__asset'))
    .map((name) => `const ${name} = assetUri(${name}Asset);`);
  const declared = afterImports(out, consts.length > 0 ? ['', ...consts] : []);
  return `import { assetUri } from '@/platform/asset-uri';\n${declared}`;
}

/**
 * Copy one file across, three-way, the way `react-dev sync` treats templates:
 *
 *   native missing                         -> write it
 *   native untouched since the last port   -> bring it up to date
 *   native is the template's own default   -> replace it with the app's version
 *   native edited here                     -> leave it, report it as diverged
 *
 * "Untouched" is a hash recorded at the last port, so an edit made on the phone
 * side is never overwritten by a later change on the web side -- it is
 * reported, and the person decides.
 */
export async function copyAcross({
  webRoot,
  nativeRoot,
  rel,
  nativeRel,
  record,
  templateHash,
  dryRun,
}) {
  const webText = readFileSync(join(webRoot, rel), 'utf8');
  const swapped = rel.endsWith('.json')
    ? webText
    : rewriteEnvReads(rewriteImageImports(swapImports(webText)));
  // A swap lengthens an import line; re-format so the copy is as clean as the
  // original was. Untouched files stay byte-for-byte the web's.
  const content =
    swapped === webText ? webText : await formatted(join(nativeRoot, nativeRel), swapped);
  const target = join(nativeRoot, nativeRel);
  const next = { web: hash(webText), native: hash(content) };

  if (!existsSync(target)) {
    if (!dryRun) write(target, content);
    return { action: 'added', record: next };
  }
  const current = readFileSync(target, 'utf8');
  const currentHash = hash(current);
  if (currentHash === next.native) return { action: 'same', record: next };
  if (current.slice(0, 300).includes(MARKERS.adapter)) return { action: 'adapter', record };

  const untouched = record && record.native === currentHash;
  const templateDefault = !record && templateHash && templateHash === currentHash;
  if (untouched || templateDefault) {
    if (!dryRun) write(target, content);
    return { action: 'updated', record: next };
  }
  // Edited here. If the web side has not moved since, that is simply a native
  // edit; if it HAS moved, both sides changed and only a person can merge.
  const webMoved = !record || record.web !== next.web;
  return { action: webMoved ? 'diverged' : 'native-edit', record };
}

function write(target, content) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

/**
 * Format generated output with this project's own Prettier config, so a port
 * never leaves `npm run format:check` red on a file nobody wrote by hand.
 */
export async function formatted(target, content) {
  const options = (await resolveConfig(target)) ?? {};
  try {
    return await format(content, { ...options, filepath: target });
  } catch {
    return content; // a file prettier does not parse is written as generated
  }
}

/** Write a tool-owned file unless its owner took it over (removed the header). */
export async function writeOwned(target, raw, marker, dryRun) {
  const content = await formatted(target, raw);
  if (existsSync(target)) {
    const current = readFileSync(target, 'utf8');
    if (current === content) return 'same';
    if (!current.slice(0, 400).includes(marker)) return 'owned';
  }
  if (!dryRun) write(target, content);
  return 'written';
}

export { write };

/** Images and other binaries a copied file imports, copied when missing or changed. */
export function copyAsset({ webRoot, nativeRoot, rel, dryRun }) {
  const source = readFileSync(join(webRoot, rel));
  const target = join(nativeRoot, rel);
  if (existsSync(target) && readFileSync(target).equals(source)) return 'same';
  if (!dryRun) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, source);
  }
  return 'written';
}
