import { describe, expect, it } from 'vitest';
import { groupHops, layout, type GraphEdge, type GraphNode } from './route-map';

/**
 * Two components linking to the same page is ordinary, and it used to kill the
 * map: dagre throws outright on parallel edges, so pressing "Expand all" on a
 * real app replaced the whole graph with a blank screen. One arrow per pair of
 * pages fixes that AND reads better -- two identical arrows say nothing twice.
 */

const node = (path: string): GraphNode => ({
  path,
  module: null,
  titleKey: null,
  permission: false,
  inSidebar: false,
  reachable: true,
});

const edge = (from: string, to: string, component: string, line: number): GraphEdge => ({
  from,
  to,
  kind: 'link',
  label: 'go',
  component,
  file: 'src/x.tsx',
  line,
});

describe('groupHops', () => {
  it('merges every navigation between the same two pages into one arrow', () => {
    const hops = groupHops(
      [
        edge('/', '/sign-up', 'HeroSection', 10),
        edge('/', '/sign-up', 'FinalCta', 40),
        edge('/', '/help', 'Footer', 70),
      ],
      [],
    );

    expect(hops).toHaveLength(2);
    const signUp = hops.find((hop) => hop.to === '/sign-up');
    // Both are kept: the arrow is one line, the panel lists both places to edit.
    expect(signUp?.navigations.map((n) => n.component)).toEqual(['HeroSection', 'FinalCta']);
    // The invariant dagre needs: never two edges with the same endpoints.
    expect(new Set(hops.map((hop) => `${hop.from}->${hop.to}`)).size).toBe(hops.length);
  });

  it('keeps unresolved navigations separate from resolved ones', () => {
    const hops = groupHops(
      [edge('/', '/help', 'Footer', 1)],
      [
        {
          from: '/',
          kind: 'navigate',
          label: 'onSubmit',
          component: 'Form',
          file: 'a.tsx',
          line: 2,
        },
      ],
    );

    expect(hops).toHaveLength(2);
    expect(hops.some((hop) => hop.to === '__unknown__')).toBe(true);
  });
});

describe('layout', () => {
  it('does not throw on a graph with parallel navigations', () => {
    const nodes = [node('/'), node('/sign-up'), node('/help')];
    const hops = groupHops(
      [
        edge('/', '/sign-up', 'HeroSection', 10),
        edge('/', '/sign-up', 'FinalCta', 40),
        edge('/', '/help', 'Footer', 70),
        edge('/help', '/sign-up', 'HelpCta', 90),
        edge('/help', '/sign-up', 'HelpFooter', 95),
      ],
      [],
    );

    const placed = layout(
      nodes,
      hops.map((hop) => ({ id: hop.id, from: hop.from, to: hop.to, label: 'X' })),
    );

    expect(placed.nodes.size).toBe(3);
    // Every arrow gets its own label position, or they stack into one column
    // and you cannot tell which name belongs to which line.
    const spots = [...placed.labels.values()].map((p) => `${String(p.x)},${String(p.y)}`);
    expect(new Set(spots).size).toBe(hops.length);
  });

  it('puts the roots left of what they lead to', () => {
    const placed = layout(
      [node('/'), node('/help')],
      [{ id: 'h0', from: '/', to: '/help', label: 'Footer' }],
    );

    const home = placed.nodes.get('/');
    const help = placed.nodes.get('/help');
    expect(home && help && home.x < help.x).toBe(true);
  });
});
