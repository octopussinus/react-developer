/**
 * Dev-only site map: every route, and every way the code can get from one to
 * another.
 *
 * The graph is built by static analysis of the real AST (tools/route-graph.mjs),
 * not by asking a model what it thinks the links are. A map you cannot trust is
 * worse than no map, because you act on it.
 *
 * Rendered with React Flow in a plain overlay rather than the toolbar's shadow
 * root: React Flow ships a stylesheet, and a shadow root would need it injected
 * separately for no benefit here.
 */

import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import '@xyflow/react/dist/style.css';

interface GraphNode {
  path: string;
  module: string | null;
  titleKey: string | null;
  permission: boolean;
  inSidebar: boolean;
  reachable: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
  kind: string;
  label: string;
  component: string | null;
  file: string;
  line: number;
}

interface Unresolved {
  from: string;
  kind: string;
  label: string;
  component: string | null;
  file: string;
  line: number;
}

interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  unresolved: Unresolved[];
}

/**
 * Layered left-to-right layout: depth = shortest hop count from a root.
 *
 * Deliberately not a layout library. The graph is a few dozen nodes with an
 * obvious entry point, so BFS depth reads better than a force simulation and
 * stays identical between runs — a map that reshuffles every time you open it
 * is hard to learn.
 */
function layout(nodes: GraphNode[], edges: GraphEdge[]): Map<string, { x: number; y: number }> {
  const depth = new Map<string, number>();
  const roots = nodes.filter((n) => n.path === '/' || (n.inSidebar && !n.path.includes(':')));
  let frontier = (roots.length > 0 ? roots : nodes.slice(0, 1)).map((n) => n.path);
  for (const path of frontier) depth.set(path, 0);

  for (let level = 1; frontier.length > 0 && level < 20; level += 1) {
    const next: string[] = [];
    for (const edge of edges) {
      if (!frontier.includes(edge.from) || depth.has(edge.to)) continue;
      depth.set(edge.to, level);
      next.push(edge.to);
    }
    frontier = next;
  }
  // Anything no edge reaches still needs a column, or it stacks on the origin.
  const orphanLevel = Math.max(0, ...depth.values()) + 1;
  for (const node of nodes) if (!depth.has(node.path)) depth.set(node.path, orphanLevel);

  const perLevel = new Map<number, number>();
  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    const level = depth.get(node.path) ?? 0;
    const index = perLevel.get(level) ?? 0;
    perLevel.set(level, index + 1);
    positions.set(node.path, { x: level * 280, y: index * 110 });
  }
  return positions;
}

/** The runtime-decided targets, as a node you can see rather than a footnote. */
const UNKNOWN = '__unknown__';

function Map_({ graph }: { graph: Graph }) {
  const [selected, setSelected] = useState<(GraphEdge | Unresolved) | null>(null);
  const positions = layout(graph.nodes, graph.edges);

  const nodes = graph.nodes.map((node) => ({
    id: node.path,
    position: positions.get(node.path) ?? { x: 0, y: 0 },
    data: {
      label: `${node.path}${node.permission ? ' 🔒' : ''}${node.reachable ? '' : '  ⚠ orphan'}`,
    },
    style: {
      padding: '8px 12px',
      borderRadius: 8,
      fontSize: 12,
      fontFamily: 'ui-monospace, Menlo, monospace',
      border: `2px solid ${node.reachable ? '#2563eb' : '#f59e0b'}`,
      background: node.reachable ? '#eff6ff' : '#fffbeb',
      color: '#111827',
      width: 230,
    },
  }));

  if (graph.unresolved.length > 0) {
    const maxX = Math.max(0, ...[...positions.values()].map((p) => p.x));
    nodes.push({
      id: UNKNOWN,
      position: { x: maxX + 280, y: 0 },
      data: { label: '? decided at runtime' },
      style: {
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 12,
        fontFamily: 'ui-monospace, Menlo, monospace',
        border: '2px dashed #6b7280',
        background: '#f9fafb',
        color: '#374151',
        width: 230,
      },
    });
  }

  const byId = new Map<string, GraphEdge | Unresolved>();
  const edges = [
    ...graph.edges.map((edge, index) => {
      const id = `e${String(index)}`;
      byId.set(id, edge);
      return {
        id,
        source: edge.from,
        target: edge.to,
        label: edge.label,
        animated: edge.kind !== 'link',
        labelStyle: { fontSize: 10 },
        style: { stroke: edge.kind === 'link' ? '#2563eb' : '#7c3aed', strokeWidth: 1.5 },
      };
    }),
    // Shown, not hidden: a page that navigates somewhere unknowable is a fact
    // about the app, and leaving it off the map makes the map look complete.
    ...graph.unresolved.map((item, index) => {
      const id = `u${String(index)}`;
      byId.set(id, item);
      return {
        id,
        source: item.from,
        target: UNKNOWN,
        label: item.label,
        animated: true,
        labelStyle: { fontSize: 10 },
        style: { stroke: '#9ca3af', strokeDasharray: '4 3' },
      };
    }),
  ];

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        onEdgeClick={(_, edge) => setSelected(byId.get(edge.id) ?? null)}
        onPaneClick={() => setSelected(null)}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
      {selected ? <Details edge={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

const KIND_TEXT: Record<string, string> = {
  link: '<Link to="…">',
  anchor: '<a href="…">',
  navigate: "navigate('…')",
  redirect: "redirect('…')",
};

/** Everything needed to go and change this navigation, without grepping. */
function Details({ edge, onClose }: { edge: GraphEdge | Unresolved; onClose: () => void }) {
  const target = 'to' in edge ? edge.to : null;
  const location = `${edge.file}:${String(edge.line)}`;

  const rows: [string, string][] = [
    ['From', edge.from],
    ['To', target ?? 'decided at runtime — cannot be known statically'],
    ['Trigger', edge.label],
    ['How', KIND_TEXT[edge.kind] ?? edge.kind],
    ['Component', edge.component ?? 'not inside a named component'],
    ['Source', location],
  ];

  return (
    <aside
      style={{
        position: 'absolute',
        top: 48,
        right: 12,
        width: 330,
        padding: 12,
        borderRadius: 10,
        background: '#111827',
        color: '#f9fafb',
        font: '400 12px system-ui, sans-serif',
        boxShadow: '0 10px 30px rgb(0 0 0 / .4)',
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 12 }}>What makes this happen</strong>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            border: 0,
            background: 'transparent',
            color: '#9ca3af',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          ✕
        </button>
      </div>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '78px 1fr', gap: '4px 8px' }}>
        {rows.map(([key, value]) => (
          <div key={key} style={{ display: 'contents' }}>
            <dt style={{ color: '#9ca3af' }}>{key}</dt>
            <dd
              style={{
                margin: 0,
                fontFamily:
                  key === 'Source' || key === 'How' ? 'ui-monospace, monospace' : 'inherit',
                wordBreak: 'break-all',
              }}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(location)}
        style={{
          marginTop: 10,
          width: '100%',
          border: 0,
          borderRadius: 6,
          padding: '5px 8px',
          background: '#2563eb',
          color: '#fff',
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        Copy file:line
      </button>
    </aside>
  );
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

export async function openRouteMap(): Promise<void> {
  if (host) return closeRouteMap();

  const graph = (await fetch('/__react-dev/route-graph').then((r) => r.json())) as Graph & {
    error?: string;
  };

  host = document.createElement('div');
  host.id = 'react-dev-route-map';
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483646',
    background: '#ffffff',
  });
  document.body.appendChild(host);

  const bar = document.createElement('div');
  Object.assign(bar.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    zIndex: '10',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    background: '#111827',
    color: '#f9fafb',
    font: '400 12px system-ui, sans-serif',
  });

  if (graph.error) {
    bar.textContent = `Could not build the map: ${graph.error}`;
  } else {
    const orphans = graph.nodes.filter((n) => !n.reachable).length;
    bar.textContent =
      `${String(graph.nodes.length)} pages · ${String(graph.edges.length)} links` +
      (orphans > 0 ? ` · ${String(orphans)} orphaned` : '') +
      (graph.unresolved.length > 0
        ? ` · ${String(graph.unresolved.length)} decided at runtime` // shown as the dashed "?" node
        : '') +
      ' · click any arrow to see what triggers it';
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close (Esc)';
  Object.assign(close.style, {
    marginLeft: 'auto',
    border: '0',
    borderRadius: '6px',
    padding: '4px 10px',
    background: '#2563eb',
    color: '#fff',
    font: 'inherit',
    cursor: 'pointer',
  });
  close.addEventListener('click', () => closeRouteMap());
  bar.appendChild(close);
  host.appendChild(bar);

  const canvas = document.createElement('div');
  Object.assign(canvas.style, { position: 'absolute', inset: '36px 0 0 0' });
  host.appendChild(canvas);

  if (!graph.error) {
    root = createRoot(canvas);
    root.render(<Map_ graph={graph} />);
  }

  document.addEventListener('keydown', onKey);
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeRouteMap();
}

export function closeRouteMap(): void {
  document.removeEventListener('keydown', onKey);
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
}
