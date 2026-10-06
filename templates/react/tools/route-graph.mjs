import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Node, Project, SyntaxKind } from 'ts-morph';

/**
 * The site map, derived from the code rather than described by hand.
 *
 * Nodes come from the explicit route registry (`src/config/routes.ts`), which is
 * the single source of truth the generator appends to. Edges come from a static
 * pass over each route's page and everything it imports inside `src/`, looking
 * for the four ways this project can navigate:
 *
 *   <Link to="/orders">      <NavLink to="/orders">
 *   navigate('/orders')      redirect('/orders')
 *
 * Why static analysis and not an agent: a map you cannot trust is worse than no
 * map. ts-morph reads the real AST, so a link is found because it exists, not
 * because a model believed it did -- and a missed one is a bug with a repro
 * rather than a bad day.
 *
 * Deliberate limits, reported rather than hidden: a target built at runtime
 * (`navigate(nextPath)`) cannot be resolved statically. Those come back as
 * `dynamic: true` so the graph can show "this page navigates somewhere we
 * cannot name" instead of quietly dropping the edge.
 */

/**
 * Bare calls that are unambiguously navigation. `push` and `replace` are NOT
 * here: `path.replace(/^\//, '')` in the api client was picked up as a redirect,
 * which is the kind of false positive that makes a map worthless. They only
 * count via a navigation-shaped receiver below.
 */
const NAV_CALLS = new Set(['navigate', 'redirect']);
const NAV_RECEIVERS = new Set(['navigate', 'history', 'router']);
const RECEIVER_METHODS = new Set(['push', 'replace', 'navigate']);
const LINK_COMPONENTS = new Set(['Link', 'NavLink']);

/** `/orders/:id` and `/orders/42` are the same node on the map. */
function normalise(path) {
  if (typeof path !== 'string' || path === '') return null;
  const clean = path.split('?')[0].split('#')[0];
  if (!clean.startsWith('/')) return null;
  return clean.length > 1 ? clean.replace(/\/$/, '') : '/';
}

function matchRoute(target, routePaths) {
  if (routePaths.includes(target)) return target;
  const segments = target.split('/');
  return (
    routePaths.find((candidate) => {
      const parts = candidate.split('/');
      if (parts.length !== segments.length) return false;
      return parts.every((part, i) => part.startsWith(':') || part === segments[i]);
    }) ?? null
  );
}

/**
 * What the user clicks, as text: the element's own children, not the enclosing
 * component. Reading the nearest JsxElement ancestor instead returns the
 * surrounding `<div>`, whose first text child is whitespace -- so every edge
 * ended up labelled with the page name.
 */
function visibleText(element) {
  if (!element) return null;
  const parts = [];
  for (const child of element.getJsxChildren?.() ?? []) {
    if (Node.isJsxText(child)) parts.push(child.getLiteralText());
    else if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const nested = Node.isJsxElement(child) ? visibleText(child) : null;
      if (nested) parts.push(nested);
    } else if (Node.isJsxExpression(child)) {
      // `{t('orders.open')}` -> the key, which is more useful than nothing.
      const key = child.getFirstDescendantByKind(SyntaxKind.StringLiteral)?.getLiteralValue();
      if (key) parts.push(key);
    }
  }
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text || null;
}

/**
 * The React component that renders this navigation -- the thing you open to
 * change it. The enclosing function is not always it (a link can sit inside a
 * helper), so walk outwards to the nearest PascalCase declaration, which is the
 * convention every component in this project follows.
 */
function componentFor(node) {
  let current = node;
  while (current) {
    const owner = current.getFirstAncestor(
      (a) =>
        Node.isFunctionDeclaration(a) ||
        Node.isVariableDeclaration(a) ||
        Node.isMethodDeclaration(a),
    );
    if (!owner) return null;
    const name = owner.getName?.();
    if (name && /^[A-Z]/.test(name)) return name;
    current = owner;
  }
  return null;
}

function labelFor(node) {
  // The element this attribute or call actually belongs to.
  const owner = node.getFirstAncestor(
    (a) => Node.isJsxElement(a) || Node.isJsxSelfClosingElement(a),
  );
  const text = Node.isJsxElement(owner) ? visibleText(owner) : null;
  if (text) return text.slice(0, 40);

  const fn = node.getFirstAncestor(
    (a) =>
      Node.isFunctionDeclaration(a) || Node.isVariableDeclaration(a) || Node.isMethodDeclaration(a),
  );
  return fn?.getName() ?? 'navigate';
}

function collectNavigations(sourceFile, routePaths, root) {
  const found = [];
  const file = relative(root, sourceFile.getFilePath()).split('\\').join('/');

  const record = (rawTarget, node, kind, dynamic = false) => {
    const line = node.getStartLineNumber();
    if (dynamic) {
      found.push({
        to: null,
        dynamic: true,
        kind,
        label: labelFor(node),
        component: componentFor(node),
        file,
        line,
      });
      return;
    }
    const target = normalise(rawTarget);
    if (!target) return;
    found.push({
      to: matchRoute(target, routePaths),
      raw: target,
      dynamic: false,
      kind,
      label: labelFor(node),
      component: componentFor(node),
      file,
      line,
    });
  };

  // <Link to="..."> / <NavLink to="...">
  for (const attribute of sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
    const name = attribute.getNameNode().getText();
    if (name !== 'to' && name !== 'href') continue;

    const owner = attribute.getFirstAncestor(
      (a) => Node.isJsxOpeningElement(a) || Node.isJsxSelfClosingElement(a),
    );
    const tag = owner?.getTagNameNode().getText() ?? '';
    const isLink = LINK_COMPONENTS.has(tag) || tag === 'a';
    if (!isLink) continue;

    const initializer = attribute.getInitializer();
    if (Node.isStringLiteral(initializer)) {
      record(initializer.getLiteralValue(), attribute, tag === 'a' ? 'anchor' : 'link');
    } else if (initializer) {
      const inner = initializer.getFirstDescendantByKind(SyntaxKind.StringLiteral);
      // `to={'/x'}` is still static; `to={path}` is not.
      if (inner && initializer.getText().replace(/[{}'"\s]/g, '') === inner.getLiteralValue()) {
        record(inner.getLiteralValue(), attribute, 'link');
      } else {
        record(null, attribute, 'link', true);
      }
    }
  }

  // navigate('/x') / redirect('/x')
  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expression = call.getExpression();
    let name;
    if (Node.isPropertyAccessExpression(expression)) {
      const receiver = expression.getExpression().getText();
      const method = expression.getName();
      if (!NAV_RECEIVERS.has(receiver) || !RECEIVER_METHODS.has(method)) continue;
      name = `${receiver}.${method}`;
    } else {
      name = expression.getText();
      if (!NAV_CALLS.has(name)) continue;
    }

    const [first] = call.getArguments();
    if (!first) continue;
    if (Node.isStringLiteral(first)) record(first.getLiteralValue(), call, name);
    else record(null, call, name, true);
  }

  return found;
}

/** Files a page pulls in from src/, so a link inside a child component counts. */
function reachableFrom(entry, seen = new Set()) {
  if (!entry || seen.has(entry)) return seen;
  seen.add(entry);
  for (const decl of entry.getImportDeclarations()) {
    const target = decl.getModuleSpecifierSourceFile();
    // Stop at node_modules and at test/story files: neither is product navigation.
    if (!target) continue;
    const path = target.getFilePath();
    if (path.includes('node_modules') || /\.(test|stories)\.tsx?$/.test(path)) continue;
    reachableFrom(target, seen);
  }
  return seen;
}

export function buildRouteGraph(root) {
  const tsconfig = join(root, 'tsconfig.app.json');
  if (!existsSync(tsconfig)) throw new Error('tsconfig.app.json not found');

  const project = new Project({ tsConfigFilePath: tsconfig, skipAddingFilesFromTsConfig: false });
  const registry = project.getSourceFile(join(root, 'src/config/routes.ts'));
  if (!registry) throw new Error('src/config/routes.ts not found');

  // Nodes: every entry of the `routes` array, with the module it lazy-loads.
  const nodes = [];
  const declaration = registry.getVariableDeclaration('routes');
  const array = declaration?.getInitializer()?.asKind(SyntaxKind.AsExpression)
    ? declaration.getInitializer().getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression)
    : declaration?.getInitializer()?.asKind(SyntaxKind.ArrayLiteralExpression);

  for (const element of array?.getElements() ?? []) {
    if (!Node.isObjectLiteralExpression(element)) continue;
    const path = element
      .getProperty('path')
      ?.getFirstDescendantByKind(SyntaxKind.StringLiteral)
      ?.getLiteralValue();
    const module = element
      .getProperty('lazy')
      ?.getFirstDescendantByKind(SyntaxKind.CallExpression)
      ?.getArguments()[0]
      ?.asKind(SyntaxKind.StringLiteral)
      ?.getLiteralValue();
    const titleKey = element
      .getProperty('meta')
      ?.getFirstDescendantByKind(SyntaxKind.PropertyAssignment)
      ?.getFirstDescendantByKind(SyntaxKind.StringLiteral)
      ?.getLiteralValue();
    const permission = element.getDescendants().some((d) => d.getText() === 'permission');
    // `meta.sidebar` means the app shell renders a link to it from the registry,
    // so it is reachable without any <Link> in a page. Without this every
    // feature route looked orphaned, which is the opposite of the truth.
    const inSidebar = element.getProperty('meta')?.getText().includes('sidebar') ?? false;

    if (path) {
      nodes.push({
        path,
        module: module ?? null,
        titleKey: titleKey ?? null,
        permission,
        inSidebar,
      });
    }
  }

  const routePaths = nodes.map((n) => n.path);
  const edges = [];
  const unresolved = [];

  for (const node of nodes) {
    if (!node.module) continue;
    const entry =
      project.getSourceFile(join(root, node.module.replace(/^@\//, 'src/') + '.tsx')) ??
      project.getSourceFile(join(root, node.module.replace(/^@\//, 'src/') + '.ts'));
    if (!entry) continue;

    for (const file of reachableFrom(entry)) {
      for (const nav of collectNavigations(file, routePaths, root)) {
        if (nav.dynamic) {
          unresolved.push({ from: node.path, ...nav });
          continue;
        }
        if (!nav.to || nav.to === node.path) continue;
        // One edge per (from, to, label): the same link in a loop is one arrow.
        const key = `${node.path}->${nav.to}:${nav.label}`;
        if (edges.some((e) => e.key === key)) continue;
        edges.push({ key, from: node.path, to: nav.to, ...nav });
      }
    }
  }

  // Roots: the index, plus sidebar entries -- but NOT a parameterised path. A
  // sidebar link to the literal `/orders/:id` navigates to a URL that matches no
  // real record, so counting it as a root would hide a genuinely orphaned page.
  const reachable = new Set([
    '/',
    ...nodes.filter((n) => n.inSidebar && !n.path.includes(':')).map((n) => n.path),
  ]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const edge of edges) {
      if (reachable.has(edge.from) && !reachable.has(edge.to)) {
        reachable.add(edge.to);
        grew = true;
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    nodes: nodes.map((n) => ({ ...n, reachable: reachable.has(n.path) })),
    edges,
    unresolved,
  };
}

/**
 * Dev-only endpoint serving the graph. Built on demand rather than cached to a
 * file: a stale map is worse than a slow one, because you act on it.
 */
export function routeGraphPlugin() {
  return {
    name: 'react-dev-route-graph',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__react-dev/route-graph', (req, res, next) => {
        if (req.method !== 'GET') return next();
        try {
          const graph = buildRouteGraph(server.config.root);
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(graph));
        } catch (error) {
          server.config.logger.error(`[route-graph] ${error.message}`);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}
