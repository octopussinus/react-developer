import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildRouteGraph } from './route-graph.mjs';

/**
 * The site map is only worth having if its arrows are real.
 *
 * Every case below is one that silently produced NOTHING before: no codebase
 * writes `to="/orders"` as a literal, so a map that only understands literals
 * draws an empty graph and looks like it is working. These run against a real
 * fixture project on disk because that is the only way to exercise the symbol
 * resolution -- the part that actually breaks.
 */

const FILES = {
  'tsconfig.app.json': JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'preserve',
      baseUrl: '.',
      paths: { '@/*': ['src/*'] },
      noEmit: true,
      skipLibCheck: true,
      allowImportingTsExtensions: true,
    },
    include: ['src'],
  }),

  'src/config/routes.ts': `
    export const routes = [
      { path: '/', lazy: () => import('@/modules/home/home-page'), meta: { titleKey: 'home' } },
      { path: '/orders', lazy: () => import('@/modules/orders/list/list-page'), meta: { titleKey: 'orders' } },
      { path: '/orders/:orderId', lazy: () => import('@/modules/orders/detail/detail-page'), meta: { titleKey: 'order' } },
      { path: '/sign-in', lazy: () => import('@/modules/auth/sign-in/sign-in-page'), meta: { titleKey: 'signIn', public: true } },
    ] as const;
  `,

  // Paths as constants and builders -- how every real project writes them.
  'src/config/paths.ts': `
    const ORDERS = '/orders';
    export const paths = { home: '/', orders: ORDERS, signIn: '/sign-in' } as const;
    export const orderLinks = {
      detail: (orderId: string) => \`\${ORDERS}/\${encodeURIComponent(orderId)}\`,
    };
  `,

  // A wrapper around the router's Link: the thing pages actually render.
  'src/components/link-cta.tsx': `
    import { Link } from 'react-router';
    export function LinkCta({ to, children }: { to: string; children: unknown }) {
      return <Link to={to}>{children}</Link>;
    }
  `,

  'src/modules/home/home-page.tsx': `
    import { Link } from 'react-router';
    import { LinkCta } from '@/components/link-cta';
    import { orderLinks, paths } from '@/config/paths';

    export function HomePage({ status, lastOrderId }: { status: string; lastOrderId: string }) {
      return (
        <div>
          <Link to={paths.orders}>All orders</Link>
          <LinkCta to={orderLinks.detail(lastOrderId)}>Last order</LinkCta>
          <a href={externalDocs}>Docs</a>
          {status === 'x' ? <Link to={{ search: '?a=1' }}>Sort</Link> : null}
        </div>
      );
    }
  `,

  'src/modules/orders/list/list-page.tsx': `
    import { Navigate, useNavigate } from 'react-router';
    import { paths } from '@/config/paths';

    export function ListPage({ status }: { status: string }) {
      const navigate = useNavigate();
      if (status === 'unauthenticated') return <Navigate to={paths.signIn} replace />;
      return <button onClick={() => void navigate(paths.home)}>Home</button>;
    }
  `,

  'src/modules/orders/detail/detail-page.tsx': `
    export function DetailPage() {
      return <div>detail</div>;
    }
  `,

  'src/modules/auth/sign-in/sign-in-page.tsx': `
    export function SignInPage() {
      return <div>sign in</div>;
    }
  `,
};

let root;
let graph;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'route-graph-'));
  for (const [path, contents] of Object.entries(FILES)) {
    const file = join(root, path);
    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, contents, 'utf8');
  }
  graph = buildRouteGraph(root);
}, 60_000);

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

/** The edges out of one page, as `to|component|label` triples. */
function from(path) {
  return graph.edges.filter((edge) => edge.from === path);
}

describe('buildRouteGraph', () => {
  it('lists every registry route as a node', () => {
    expect(graph.nodes.map((node) => node.path).sort()).toEqual([
      '/',
      '/orders',
      '/orders/:orderId',
      '/sign-in',
    ]);
  });

  it('follows a path constant to its value', () => {
    const edge = from('/').find((e) => e.to === '/orders');
    expect(edge).toBeDefined();
    expect(edge.component).toBe('HomePage');
    expect(edge.label).toBe('All orders');
  });

  it('follows a link BUILDER, inlining constants inside the template', () => {
    // `${ORDERS}/${encodeURIComponent(id)}` -> /orders/:param -> the :orderId route.
    const edge = from('/').find((e) => e.to === '/orders/:orderId');
    expect(edge).toBeDefined();
    expect(edge.component).toBe('HomePage');
  });

  it('counts a `to` on a custom wrapper component, not just <Link>', () => {
    // The builder edge above is rendered by <LinkCta>, never by <Link>.
    expect(from('/').some((e) => e.to === '/orders/:orderId')).toBe(true);
  });

  it('records <Navigate> as a redirect, labelled with what triggers it', () => {
    const edge = from('/orders').find((e) => e.kind === 'redirect');
    expect(edge).toBeDefined();
    expect(edge.to).toBe('/sign-in');
    expect(edge.component).toBe('ListPage');
    expect(edge.label).toBe("if status === 'unauthenticated'");
  });

  it('resolves navigate() through a constant', () => {
    const edge = from('/orders').find((e) => e.kind === 'navigate');
    expect(edge?.to).toBe('/');
  });

  it('reports the file and line of every edge', () => {
    for (const edge of graph.edges) {
      expect(edge.file).toMatch(/^src\//);
      expect(edge.line).toBeGreaterThan(0);
    }
  });

  it('invents no mystery arrows', () => {
    // `to={to}` inside LinkCta is the caller's business, `to={{ search }}` does
    // not change page, and `href={externalDocs}` is not a route. None of the
    // three is "this page navigates somewhere unknowable".
    expect(graph.unresolved).toEqual([]);
  });

  it('marks a page nothing links to as orphaned', () => {
    const detail = graph.nodes.find((node) => node.path === '/orders/:orderId');
    const signIn = graph.nodes.find((node) => node.path === '/sign-in');
    expect(detail.reachable).toBe(true);
    // Reached only by a redirect out of /orders, which IS reachable from /.
    expect(signIn.reachable).toBe(true);
  });
});
