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
/** `<Navigate to=… replace />` is a redirect: it fires without anyone clicking. */
const REDIRECT_COMPONENTS = new Set(['Navigate']);

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
 * Follow a reference to the expressions it could actually hold.
 *
 * Without this the map is useless on a real codebase. Nothing here writes
 * `to="/dashboard"`; it writes `to={authPaths.dashboard}`, because a path
 * repeated as a literal in nine files is how a rename breaks three of them. So
 * the analyser has to do what the reader does -- open the constant -- or every
 * single arrow comes back "decided at runtime". On this project that was 0
 * resolved edges and 73 unresolved, i.e. a blank map.
 *
 * Returns TERMINAL expressions (literals, object literals, anything it cannot
 * follow further), not strings: the caller decides what counts as a path.
 */
const MAX_FOLLOW = 8;

/**
 * Identity of a node, for the cycle guard.
 *
 * Both ends matter: `getPos()` includes leading trivia, so a call and its own
 * callee (`paths.dogs(id)` / `paths.dogs`) start at the SAME position. Keying on
 * the start alone made the guard treat the callee as already-seen and return
 * nothing, which silently turned every link builder back into "runtime".
 */
function key(node) {
  return `${node.getSourceFile().getFilePath()}:${String(node.getPos())}:${String(node.getEnd())}`;
}

/** Declarations a name points at, through imports, or [] when unknowable. */
function definitionsOf(node) {
  const name = Node.isPropertyAccessExpression(node)
    ? node.getNameNode()
    : Node.isIdentifier(node)
      ? node
      : null;
  if (!name || typeof name.getDefinitionNodes !== 'function') return [];
  try {
    return name.getDefinitionNodes();
  } catch {
    // Unresolvable symbol (a type-only or generated name). Not an error here:
    // the caller reports it as runtime-decided, which is the honest answer.
    return [];
  }
}

function returnedExpressions(fn) {
  if (Node.isArrowFunction(fn)) {
    const body = fn.getBody();
    if (!Node.isBlock(body)) return [body];
  }
  const body = fn.getBody?.();
  if (!body || !Node.isBlock(body)) return [];
  return body
    .getDescendantsOfKind(SyntaxKind.ReturnStatement)
    .map((statement) => statement.getExpression())
    .filter(Boolean);
}

function valuesOf(node, seen = new Set(), depth = 0) {
  if (!node || depth > MAX_FOLLOW) return [];
  const id = key(node);
  if (seen.has(id)) return [];
  seen.add(id);
  const next = (child) => valuesOf(child, seen, depth + 1);

  if (
    Node.isParenthesizedExpression(node) ||
    Node.isAsExpression(node) ||
    Node.isSatisfiesExpression(node) ||
    Node.isNonNullExpression(node)
  ) {
    return next(node.getExpression());
  }

  // Both branches are real destinations: `next ?? paths.dashboard` can go to
  // either, and showing one of them would be a map that lies by omission.
  if (Node.isConditionalExpression(node)) {
    return [...next(node.getWhenTrue()), ...next(node.getWhenFalse())];
  }
  if (Node.isBinaryExpression(node)) {
    const operator = node.getOperatorToken().getText();
    if (operator === '??' || operator === '||') {
      return [...next(node.getLeft()), ...next(node.getRight())];
    }
    return [node];
  }

  if (Node.isIdentifier(node) || Node.isPropertyAccessExpression(node)) {
    const out = [];
    for (const definition of definitionsOf(node)) {
      if (Node.isVariableDeclaration(definition) || Node.isPropertyAssignment(definition)) {
        out.push(...next(definition.getInitializer()));
      } else if (Node.isFunctionDeclaration(definition)) {
        out.push(definition);
      }
    }
    // A property whose symbol does not resolve to a literal -- `access.to`,
    // where `access` is a discriminated union -- is still followable through
    // the value its base actually holds.
    if (out.length === 0 && Node.isPropertyAccessExpression(node)) {
      const wanted = node.getName();
      for (const base of next(node.getExpression())) {
        if (!Node.isObjectLiteralExpression(base)) continue;
        const property = base.getProperty(wanted);
        if (Node.isPropertyAssignment(property)) out.push(...next(property.getInitializer()));
      }
    }
    return out.length > 0 ? out : [node];
  }

  // `shopLinks.category(id)` -> whatever the builder returns.
  if (Node.isCallExpression(node)) {
    const out = [];
    for (const callee of valuesOf(node.getExpression(), seen, depth + 1)) {
      if (Node.isArrowFunction(callee) || Node.isFunctionDeclaration(callee)) {
        for (const returned of returnedExpressions(callee)) out.push(...next(returned));
      }
    }
    return out.length > 0 ? out : [node];
  }

  return [node];
}

/**
 * `` `/dogs/${id}` `` -> `/dogs/:id`, so it matches the registry's pattern.
 *
 * A span that is itself a constant is INLINED rather than turned into a param:
 * `` `${CATEGORIES}/${encodeURIComponent(id)}` `` is `/shop/categories/:id`, and
 * treating the prefix as a param produced `:CATEGORIES/:param`, which starts
 * with no slash and was therefore dropped without a word.
 */
function patternOf(template, depth = 0) {
  let out = template.getHead().getLiteralText();
  for (const span of template.getTemplateSpans()) {
    const expression = span.getExpression();
    const literals = depth < MAX_FOLLOW ? stringsOf(expression, depth + 1) : [];
    if (literals.length === 1) {
      out += literals[0];
    } else {
      const text = expression.getText();
      out += `:${/^[A-Za-z_$][\w$]*$/.test(text) ? text : 'param'}`;
    }
    out += span.getLiteral().getLiteralText();
  }
  return out;
}

/** The string values an expression can hold, ignoring anything non-literal. */
function stringsOf(node, depth = 0) {
  const out = [];
  for (const value of valuesOf(node)) {
    if (Node.isStringLiteral(value) || Node.isNoSubstitutionTemplateLiteral(value)) {
      out.push(value.getLiteralValue());
    } else if (Node.isTemplateExpression(value)) {
      out.push(patternOf(value, depth));
    }
  }
  return [...new Set(out)];
}

/** Is this name a prop or a destructured prop -- i.e. the caller's business? */
function fromCaller(node) {
  if (!Node.isIdentifier(node)) return false;
  return definitionsOf(node).some(
    (definition) => Node.isParameterDeclaration(definition) || Node.isBindingElement(definition),
  );
}

/**
 * Where a `to=` / `navigate()` argument can land.
 *
 * Four outcomes, and the distinctions are what keep the map honest:
 * `paths` resolved; `dynamic` genuinely unknowable; `samePage` not navigation at
 * all (`to={{ search }}`, `navigate(-1)`); `fromProp` supplied by whoever
 * renders this component -- which is NOT a mystery, because that caller is
 * analysed too and its edge is the real one.
 */
function destinationsOf(node) {
  const paths = [];
  let dynamic = false;
  let samePage = false;
  let fromProp = false;

  for (const value of valuesOf(node)) {
    if (Node.isStringLiteral(value) || Node.isNoSubstitutionTemplateLiteral(value)) {
      paths.push(value.getLiteralValue());
    } else if (Node.isTemplateExpression(value)) {
      paths.push(patternOf(value));
    } else if (Node.isObjectLiteralExpression(value)) {
      // A `to={{ pathname, search }}` object: only `pathname` changes the page.
      const pathname = value.getProperty('pathname');
      if (Node.isPropertyAssignment(pathname)) {
        const inner = destinationsOf(pathname.getInitializer());
        paths.push(...inner.paths);
        dynamic = dynamic || inner.dynamic;
      } else {
        samePage = true;
      }
    } else if (Node.isNumericLiteral(value) || Node.isPrefixUnaryExpression(value)) {
      // `navigate(-1)` is history, not a route.
      samePage = true;
    } else if (fromCaller(value)) {
      fromProp = true;
    } else {
      dynamic = true;
    }
  }
  return { paths, dynamic, samePage, fromProp };
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

/**
 * What makes a redirect fire, as the condition that guards it.
 *
 * Nobody clicks a `<Navigate>`, so there is no link text to show -- and falling
 * back to the enclosing function printed the component's own name twice. The
 * `if` or `case` around it is the actual answer to "why did it send me here".
 */
function conditionFor(node) {
  const guard = node.getFirstAncestor(
    (a) => Node.isIfStatement(a) || Node.isCaseClause(a) || Node.isConditionalExpression(a),
  );
  if (Node.isIfStatement(guard)) return `if ${guard.getExpression().getText()}`;
  if (Node.isCaseClause(guard)) return `case ${guard.getExpression().getText()}`;
  if (Node.isConditionalExpression(guard)) return `when ${guard.getCondition().getText()}`;
  return null;
}

function labelFor(node, kind) {
  // The element this attribute or call actually belongs to.
  const owner = node.getFirstAncestor(
    (a) => Node.isJsxElement(a) || Node.isJsxSelfClosingElement(a),
  );
  const text = Node.isJsxElement(owner) ? visibleText(owner) : null;
  if (text) return text.slice(0, 40);

  if (kind === 'redirect') {
    const condition = conditionFor(node);
    if (condition) return condition.replace(/\s+/g, ' ').slice(0, 48);
  }

  const fn = node.getFirstAncestor(
    (a) =>
      Node.isFunctionDeclaration(a) || Node.isVariableDeclaration(a) || Node.isMethodDeclaration(a),
  );
  return fn?.getName() ?? 'navigate';
}

function collectNavigations(sourceFile, routePaths, root) {
  const found = [];
  const file = relative(root, sourceFile.getFilePath()).split('\\').join('/');

  /**
   * One AST site can yield several destinations; each is its own edge.
   *
   * `strict` says whether an unresolved target is worth drawing. For a real
   * `<Link>` it is -- "this page goes somewhere we cannot name" is a fact. For a
   * component that merely happens to take a `to` prop it is not: a date range's
   * `to={until}` would become an arrow to a mystery that does not exist.
   */
  const record = (node, kind, source, strict = true) => {
    const { paths, dynamic, samePage, fromProp } = destinationsOf(source);
    const line = node.getStartLineNumber();
    const label = labelFor(node, kind);
    const component = componentFor(node);

    for (const raw of paths) {
      const target = normalise(raw);
      if (!target) continue;
      found.push({
        to: matchRoute(target, routePaths),
        raw: target,
        dynamic: false,
        kind,
        label,
        component,
        file,
        line,
      });
    }
    // Only unknown when nothing at all resolved: a `?? fallback` that gave one
    // real path has already told you what you needed. `fromProp` is excluded on
    // purpose -- the caller's own edge carries the answer -- and so is an
    // `<a href={…}>`, which in this project means a file or an external URL,
    // never a route.
    if (strict && dynamic && paths.length === 0 && !samePage && !fromProp && kind !== 'anchor') {
      found.push({ to: null, dynamic: true, kind, label, component, file, line });
    }
  };

  // <Link to=…> / <NavLink to=…> / <Navigate to=…> / <a href=…>
  for (const attribute of sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
    const name = attribute.getNameNode().getText();
    if (name !== 'to' && name !== 'href') continue;

    const owner = attribute.getFirstAncestor(
      (a) => Node.isJsxOpeningElement(a) || Node.isJsxSelfClosingElement(a),
    );
    const tag = owner?.getTagNameNode().getText() ?? '';
    // A `to` on a custom component counts too. Every real codebase wraps the
    // router's Link (`<LinkCta to={paths.signIn}>`), and only matching `Link`
    // literally left the landing page looking like a dead end.
    const wrapper =
      /^[A-Z]/.test(tag) && !LINK_COMPONENTS.has(tag) && !REDIRECT_COMPONENTS.has(tag);
    const kind = REDIRECT_COMPONENTS.has(tag)
      ? 'redirect'
      : tag === 'a'
        ? 'anchor'
        : LINK_COMPONENTS.has(tag) || wrapper
          ? 'link'
          : null;
    if (kind === null) continue;

    const initializer = attribute.getInitializer();
    if (!initializer) continue;
    record(
      attribute,
      kind,
      Node.isJsxExpression(initializer) ? initializer.getExpression() : initializer,
      !wrapper,
    );
  }

  // navigate('/x') / redirect(paths.x) / history.push(…)
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
    record(call, name, first);
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
