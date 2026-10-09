import { readFileSync } from 'node:fs';
import ts from 'typescript';

/**
 * What one source file needs from its platform, read from its AST.
 *
 * Deliberately the TypeScript compiler and not a regex: `<div` inside a string,
 * `window` as an object key and `document` as a parameter name are all things
 * a text search reports as "uses the DOM", and a port worklist that is wrong
 * about 40 files is one nobody trusts.
 */

/** Globals that exist in a browser and not in React Native. */
const BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'sessionStorage',
  'navigator',
  'location',
  'history',
  'matchMedia',
  'getComputedStyle',
  'IntersectionObserver',
  'ResizeObserver',
  'MutationObserver',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLDivElement',
  'HTMLButtonElement',
  'Element',
  'Node',
  'DOMParser',
  'FileReader',
  'indexedDB',
  'customElements',
]);

function isDeclarationName(node) {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isShorthandPropertyAssignment(parent)) return false;
  if (ts.isQualifiedName(parent) && parent.right === node) return true;
  if (ts.isPropertySignature(parent) || ts.isPropertyDeclaration(parent))
    return parent.name === node;
  if (ts.isMethodDeclaration(parent) || ts.isMethodSignature(parent)) return parent.name === node;
  if (ts.isParameter(parent) || ts.isVariableDeclaration(parent) || ts.isBindingElement(parent))
    return parent.name === node;
  if (ts.isFunctionDeclaration(parent) || ts.isClassDeclaration(parent))
    return parent.name === node;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent) || ts.isImportClause(parent))
    return true;
  if (ts.isJsxAttribute(parent)) return true;
  if (ts.isTypeReferenceNode(parent)) return false;
  return false;
}

/**
 * `new URL('../assets/a.webp', import.meta.url)` -- Vite's asset idiom, which
 * the port rewrites to an image import (copy.mjs). Raster images only.
 */
function isAssetUrl(urlAccess) {
  const call = urlAccess.parent;
  if (!call || !ts.isNewExpression(call) || call.expression.getText() !== 'URL') return false;
  const [path, base] = call.arguments ?? [];
  return (
    base === urlAccess &&
    path !== undefined &&
    ts.isStringLiteralLike(path) &&
    /^\.{1,2}\/.+\.(png|jpe?g|webp|gif)$/i.test(path.text)
  );
}

/** The variable name of `import.meta.env.X` / `import.meta.env['X']`, else null. */
function envVariable(access, envNode) {
  if (!access) return null;
  if (ts.isPropertyAccessExpression(access) && access.expression === envNode)
    return access.name.text;
  if (
    ts.isElementAccessExpression(access) &&
    access.expression === envNode &&
    ts.isStringLiteralLike(access.argumentExpression)
  )
    return access.argumentExpression.text;
  return null;
}

/**
 * Inside an `interface` or `type` declaration: erased at runtime, and the DOM
 * lib is there for the type checker. A props interface that types a web
 * callback (`onDrop: (e: DragEvent<HTMLElement>) => void`) does not make the
 * file unportable -- the component that implements it does, and is caught
 * there. A `useRef<HTMLDivElement>` in a hook still counts: that hook will
 * call DOM methods on the node.
 */
function inTypeDeclaration(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isInterfaceDeclaration(current) || ts.isTypeAliasDeclaration(current)) return true;
    if (ts.isSourceFile(current)) return false;
  }
  return false;
}

/**
 * @returns {{
 *   imports: { specifier: string, names: string[], typeOnly: boolean }[],
 *   intrinsics: string[],
 *   globals: string[],
 *   viteOnly: string[],
 *   jsx: boolean,
 * }}
 */
export function scanSource(path, text = readFileSync(path, 'utf8')) {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const imports = [];
  /** `export { A, type B } from './x'` / `export * from './y'`, for barrels. */
  const reexports = [];
  const intrinsics = new Set();
  const globals = new Set();
  const viteOnly = new Set();
  let jsx = false;

  const addImport = (specifier, names, typeOnly, members = []) => {
    imports.push({ specifier, names, typeOnly, members });
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const typeOnly = Boolean(clause?.isTypeOnly);
      const names = [];
      if (clause?.name) names.push('default');
      const bindings = clause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (!element.isTypeOnly) names.push((element.propertyName ?? element.name).text);
        }
      } else if (bindings && ts.isNamespaceImport(bindings)) names.push('*');
      const allTypes =
        typeOnly ||
        (bindings !== undefined &&
          ts.isNamedImports(bindings) &&
          !clause?.name &&
          bindings.elements.length > 0 &&
          bindings.elements.every((element) => element.isTypeOnly));
      // Every named member, types included: a barrel resolves each to its file.
      const members =
        bindings && ts.isNamedImports(bindings)
          ? bindings.elements.map((element) => (element.propertyName ?? element.name).text)
          : [];
      addImport(node.moduleSpecifier.text, names, allTypes, members);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      addImport(node.moduleSpecifier.text, ['*'], node.isTypeOnly);
      const clause = node.exportClause;
      reexports.push({
        specifier: node.moduleSpecifier.text,
        text: node.getText(file),
        star: !clause,
        names:
          clause && ts.isNamedExports(clause)
            ? clause.elements.map((element) => element.name.text)
            : [],
        // Per member, as written (`type B`, `A as C`), so a partial barrel can
        // keep some names of a line and drop others.
        elements:
          clause && ts.isNamedExports(clause)
            ? clause.elements.map((element) => ({
                name: element.name.text,
                source: (element.propertyName ?? element.name).text,
                text: element.getText(file),
              }))
            : [],
        typeOnly: node.isTypeOnly,
      });
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0]
    ) {
      const [argument] = node.arguments;
      if (ts.isStringLiteral(argument)) addImport(argument.text, ['*'], false);
      // A template-literal import is Vite's lazy glob; Metro cannot follow it.
      else viteOnly.add('import(`…`)');
    } else if (ts.isImportTypeNode(node)) {
      // `import('x').T` in a type position: types only, never bundled.
    } else if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      jsx = true;
      const tag = node.tagName.getText(file);
      if (/^[a-z]/.test(tag) && !tag.includes('.')) intrinsics.add(tag);
    } else if (ts.isJsxFragment(node)) {
      jsx = true;
    } else if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword) {
      const parent = node.parent;
      const member = ts.isPropertyAccessExpression(parent) ? parent.name.text : 'meta';
      // `import.meta.env.X` / `import.meta.env['X']` is one variable read, which
      // the port rewrites for Expo (copy.mjs). Anything else -- the whole env
      // object, `import.meta.glob`, `import.meta.url` -- is Vite's alone.
      const read = member === 'env' ? envVariable(parent.parent, parent) : null;
      if (!read && !(member === 'url' && isAssetUrl(parent))) viteOnly.add(`import.meta.${member}`);
    } else if (
      ts.isIdentifier(node) &&
      BROWSER_GLOBALS.has(node.text) &&
      !isDeclarationName(node) &&
      !inTypeDeclaration(node)
    ) {
      // A type annotation naming a DOM type (`HTMLInputElement`) is a DOM
      // dependency too: the value it describes only exists in a browser.
      globals.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  // A name the file declares itself (a `history` array, a `location` prop) is
  // not the browser's. Drop any global the file binds locally.
  const declared = new Set();
  const collect = (node) => {
    if (
      (ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) &&
      ts.isIdentifier(node.name)
    ) {
      declared.add(node.name.text);
    }
    if (ts.isImportSpecifier(node) || ts.isImportClause(node)) {
      if (node.name) declared.add(node.name.text);
    }
    ts.forEachChild(node, collect);
  };
  collect(file);
  for (const name of declared) globals.delete(name);

  // A barrel: nothing but re-exports (and comments). Its native version is
  // generated with only the members that are native already.
  const barrel =
    reexports.length > 0 &&
    file.statements.every(
      (statement) => ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined,
    );

  return {
    imports,
    reexports,
    barrel,
    intrinsics: [...intrinsics].sort(),
    globals: [...globals].sort(),
    viteOnly: [...viteOnly].sort(),
    jsx,
  };
}
