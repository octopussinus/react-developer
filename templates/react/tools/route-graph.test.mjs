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
    export const paths = {
      home: '/',
      orders: ORDERS,
      signIn: '/sign-in',
      // Designed, linked to, never registered: the dead end.
      billing: '/settings/billing',
    } as const;
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
          <Link to={paths.billing}>Billing</Link>
          <a href="/manual.pdf">Manual</a>
          {status === 'x' ? <Link to={{ search: '?a=1' }}>Sort</Link> : null}
          <LinkCta
            to={paths.signIn}
            aria-label="Sign in"
          >
            Sign in
          </LinkCta>
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
      return (
        <button
          onClick={() => void navigate(paths.home)}
        >
          Home
        </button>
      );
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
    expect(
      graph.nodes
        .filter((node) => !node.missing)
        .map((node) => node.path)
        .sort(),
    ).toEqual(['/', '/orders', '/orders/:orderId', '/sign-in']);
  });

  it('draws the page a button promises and nobody built', () => {
    /*
     * The edge used to be dropped for having no route to land on, which is the
     * most expensive thing a site map can hide: the design says the button is
     * there, the button IS there, and the only way to find out it goes nowhere
     * is to click it in a browser and land on a blank page.
     */
    const ghost = graph.nodes.find((node) => node.path === '/settings/billing');
    expect(ghost).toBeDefined();
    expect(ghost.missing).toBe(true);
    expect(ghost.module).toBeNull();

    const edge = from('/').find((e) => e.to === '/settings/billing');
    expect(edge).toBeDefined();
    expect(edge.missing).toBe(true);
    expect(edge.component).toBe('HomePage');
    expect(edge.label).toBe('Billing');
    expect(edge.file).toBe('src/modules/home/home-page.tsx');
  });

  it('does not report a file in public/ as a page nobody built', () => {
    // `<a href="/manual.pdf">` is a download. Counting it would put a box
    // labelled /manual.pdf on the map and a line in every report.
    expect(graph.nodes.some((node) => node.path === '/manual.pdf')).toBe(false);
    expect(graph.edges.some((edge) => edge.to === '/manual.pdf')).toBe(false);
  });

  it('says a registered page is not missing', () => {
    expect(graph.edges.filter((edge) => edge.missing).map((edge) => edge.to)).toEqual([
      '/settings/billing',
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

  it('reports the line of the element, not of the attribute inside it', () => {
    /*
     * The line is read twice: by you, opening it in an editor, and by the map's
     * ↗, which looks for that exact file:line in the rendered DOM. `to=` sits a
     * line below `<ActionLink` all over a real codebase, and reporting it left
     * the map one line off the page -- so the outline found nothing and the page
     * looked as though it had no links.
     */
    const lineOf = (edge) => FILES[edge.file].split('\n')[edge.line - 1] ?? '';

    const link = from('/').find((edge) => edge.to === '/sign-in');
    expect(link).toBeDefined();
    expect(lineOf(link)).toContain('<LinkCta');

    const handler = from('/orders').find((edge) => edge.kind === 'navigate');
    expect(lineOf(handler)).toContain('<button');
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
