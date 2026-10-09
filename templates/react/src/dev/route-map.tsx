/**
 * Dev-only site map: every route, and every way the code can get from one to
 * another.
 *
 * The graph is built by static analysis of the real AST (tools/route-graph.mjs),
 * not by asking a model what it thinks the links are. A map you cannot trust is
 * worse than no map, because you act on it.
 *
 * It docks to half the screen rather than covering it, because the map is a
 * thing you navigate WITH: the ↗ on a page opens that page in the other half
 * and outlines, on the page itself, every link out of it. A full-page map
 * would have hidden the app it is describing.
 *
 * Rendered with React Flow outside the toolbar's shadow root: React Flow ships
 * a stylesheet, and a shadow root would need it injected separately for no
 * benefit here.
 */

import dagre from '@dagrejs/dagre';
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  MiniMap,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import '@xyflow/react/dist/style.css';

import {
  clearMarks,
  goToRoute,
  litColors,
  markNavigations,
  type Marked,
  type PageHop,
} from './route-highlight';
import { openSidePanel, type Frame } from './takeover';

export interface GraphNode {
  path: string;
  module: string | null;
  titleKey: string | null;
  permission: boolean;
  inSidebar: boolean;
  reachable: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: string;
  label: string;
  component: string | null;
  file: string;
  line: number;
}

export interface Unresolved {
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

const NODE_W = 290;
const NODE_H = 44;

/**
 * Positions, by dagre.
 *
 * The hand-rolled BFS layout this replaces put every node of a level in one
 * column in registry order, with React Flow's default top/bottom handles — so
 * arrows left the bottom of a box, crossed four others and came back into the
 * top of one two columns away. Dagre is what the React Flow docs reach for
 * here: it ranks the graph left to right and then ORDERS each rank to minimise
 * crossings, which is the part that actually makes a map readable.
 *
 * Edge labels are given to dagre with a width, so it reserves a gap for the
 * component name instead of letting it land on top of a box.
 */
interface Placed {
  nodes: Map<string, { x: number; y: number }>;
  labels: Map<string, { x: number; y: number }>;
}

/** dagre's graph is untyped (`any` labels), so read the numbers out deliberately. */
function pointOf(value: unknown): { x: number; y: number } {
  const placed = value as { x?: number; y?: number } | undefined;
  return { x: placed?.x ?? 0, y: placed?.y ?? 0 };
}

export function layout(
  nodes: GraphNode[],
  edges: { id: string; from: string; to: string; label: string }[],
): Placed {
  const graph = new dagre.graphlib.Graph({ multigraph: true });
  graph.setGraph({
    rankdir: 'LR',
    ranksep: 90,
    nodesep: 20,
    edgesep: 14,
    marginx: 24,
    marginy: 24,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) graph.setNode(node.path, { width: NODE_W, height: NODE_H });
  for (const edge of edges) {
    graph.setEdge(
      edge.from,
      edge.to,
      { width: edge.label.length * 6.2 + 10, height: 18, labelpos: 'c' },
      edge.id,
    );
  }

  dagre.layout(graph);

  const placed: Placed = { nodes: new Map(), labels: new Map() };
  for (const node of nodes) {
    const point = pointOf(graph.node(node.path));
    // dagre centres a node; React Flow positions its top-left corner.
    placed.nodes.set(node.path, { x: point.x - NODE_W / 2, y: point.y - NODE_H / 2 });
  }
  for (const edge of edges) {
    placed.labels.set(edge.id, pointOf(graph.edge(edge.from, edge.to, edge.id)));
  }
  return placed;
}

interface LabelData extends Record<string, unknown> {
  text: string;
  labelX: number;
  labelY: number;
  /** Set while this arrow is one of the outlined links on the shown page. */
  color?: string;
}

/**
 * An edge whose label sits where dagre put it.
 *
 * React Flow's own label goes at the midpoint of the path, and in a
 * left-to-right layout every edge of a rank has the SAME midpoint — so the
 * component names stacked into one vertical list and you could not tell which
 * arrow each belonged to. dagre already solved this: it lays labels out as
 * real objects in their own rank, and this just draws them there.
 */
function MapEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 10,
  });
  const label = data as LabelData | undefined;
  return (
    <>
      <BaseEdge id={id} path={path} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${String(label.labelX)}px, ${String(label.labelY)}px)`,
              padding: '1px 5px',
              borderRadius: 4,
              background: label.color === undefined ? '#ffffffee' : label.color,
              color: label.color === undefined ? '#334155' : '#ffffff',
              font: '600 10px system-ui, sans-serif',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {label.text}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const edgeTypes = { map: MapEdge };

/** The runtime-decided targets, as a node you can see rather than a footnote. */
const UNKNOWN = '__unknown__';

const nodeBase = {
  padding: '0 10px',
  borderRadius: 8,
  fontSize: 12,
  fontFamily: 'ui-monospace, Menlo, monospace',
  width: NODE_W,
  height: NODE_H,
  textAlign: 'left' as const,
};

/**
 * The row inside a page box.
 *
 * The count used to be `+6` appended to the path, which reads as part of the
 * route and tells you nothing. As a filled badge pushed to the far right, in
 * the same blue as the arrows, it is visibly a separate thing — and the legend
 * in the corner says what it counts.
 */
function NodeLabel({
  node,
  targets,
  isOpen,
  isShowing,
  onOpen,
}: {
  node: GraphNode;
  targets: number;
  isOpen: boolean;
  /** This is the page currently open in the other half. */
  isShowing: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: NODE_H - 4,
        width: '100%',
      }}
    >
      <span style={{ width: 10, color: '#64748b', flexShrink: 0 }}>
        {targets === 0 ? '' : isOpen ? '▾' : '▸'}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {node.path}
        {node.permission ? ' 🔒' : ''}
      </span>
      {/*
        `nodrag nopan` or React Flow's own drag handler swallows the click, and
        stopPropagation so opening the page does not also toggle the branch --
        two different things that both read as "clicking the box".
      */}
      <button
        type="button"
        className="nodrag nopan"
        title={`Show ${node.path} in the other half and outline every link out of it`}
        aria-label={`Show ${node.path}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        style={{
          flexShrink: 0,
          width: 22,
          height: 20,
          padding: 0,
          borderRadius: 6,
          border: `1px solid ${isShowing ? '#1d4ed8' : '#bfdbfe'}`,
          background: isShowing ? '#1d4ed8' : '#ffffff',
          color: isShowing ? '#ffffff' : '#1d4ed8',
          font: '700 11px system-ui, sans-serif',
          cursor: 'pointer',
          lineHeight: '18px',
        }}
      >
        ↗
      </button>
      {node.reachable ? null : (
        <span title="nothing links here" style={{ color: '#b45309', flexShrink: 0 }}>
          ⚠
        </span>
      )}
      {targets > 0 && !isOpen ? (
        <span
          title={`leads to ${String(targets)} page(s) — click to open`}
          style={{
            flexShrink: 0,
            padding: '1px 8px',
            borderRadius: 999,
            background: '#2563eb',
            color: '#ffffff',
            font: '700 10px system-ui, sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          {targets} →
        </span>
      ) : null}
    </div>
  );
}

interface Hop {
  id: string;
  from: string;
  to: string;
  navigations: (GraphEdge | Unresolved)[];
}

/**
 * One arrow per PAIR of pages, however many navigations it stands for.
 *
 * Two reasons, and the second is not optional. Two identical arrows between the
 * same boxes carry no more information than one — and dagre throws outright
 * ("Not possible to find intersection inside of the rectangle") when it is
 * handed parallel edges, so on a real app pressing Expand all killed the map.
 */
export function groupHops(edges: GraphEdge[], unresolved: Unresolved[]): Hop[] {
  const byPair = new Map<string, Hop>();
  const add = (from: string, to: string, navigation: GraphEdge | Unresolved) => {
    const key = `${from}->${to}`;
    const hop = byPair.get(key) ?? {
      id: `h${String(byPair.size)}`,
      from,
      to,
      navigations: [],
    };
    hop.navigations.push(navigation);
    byPair.set(key, hop);
  };

  for (const edge of edges) add(edge.from, edge.to, edge);
  for (const item of unresolved) add(item.from, UNKNOWN, item);
  return [...byPair.values()];
}

/** The component responsible — the thing you open in order to change it. */
function hopLabel(hop: Hop): string {
  const names = [...new Set(hop.navigations.map((n) => n.component ?? n.label))];
  const [first, ...rest] = names;
  return rest.length > 0 ? `${first ?? ''} +${String(rest.length)}` : (first ?? '');
}

/** The page being shown in the other half, and what was found on it. */
interface Showing {
  path: string;
  /** What the browser actually opened: `/dogs/:dogId` cannot be visited. */
  url: string;
  marks: Marked[];
}

function Map_({ graph }: { graph: Graph }) {
  const [selected, setSelected] = useState<(GraphEdge | Unresolved)[] | null>(null);
  const [showing, setShowing] = useState<Showing | null>(null);
  /** Which press of ↗ is the current one. See `show`. */
  const attempt = useRef(0);

  /**
   * Which pages have been opened.
   *
   * A 26-page app drawn all at once is a hairball — every arrow crosses three
   * others and the thing you came to answer ("where does THIS page go?") is the
   * one thing you cannot see. So it starts at the entry points, only the index
   * is open, and you open the pages you care about.
   */
  const entries = graph.nodes
    .filter((n) => n.path === '/' || (n.inSidebar && !n.path.includes(':')))
    .map((n) => n.path);
  // No entry point found (no `/`, no sidebar): collapsing to nothing would show
  // an empty map, so every page is its own starting point instead.
  const roots = entries.length > 0 ? entries : graph.nodes.map((n) => n.path);
  const [open, setOpen] = useState<Set<string>>(new Set(roots.slice(0, 1)));

  const outgoing = new Map<string, (GraphEdge | Unresolved)[]>();
  for (const edge of [...graph.edges, ...graph.unresolved]) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
  }

  // Visible = the roots, plus whatever an opened page points at.
  const visible = new Set<string>(roots);
  for (const path of open) {
    visible.add(path);
    for (const edge of outgoing.get(path) ?? []) {
      visible.add('to' in edge && edge.to ? edge.to : UNKNOWN);
    }
  }

  const shownNodes = graph.nodes.filter((n) => visible.has(n.path));
  const shownEdges = graph.edges.filter((e) => open.has(e.from) && visible.has(e.to));
  const shownUnresolved = graph.unresolved.filter((u) => open.has(u.from));

  const hops = groupHops(shownEdges, shownUnresolved);
  const laidOut = hops.map((hop) => ({
    id: hop.id,
    from: hop.from,
    to: hop.to,
    label: hopLabel(hop),
  }));
  const placed = layout(
    shownUnresolved.length > 0
      ? [
          ...shownNodes,
          {
            path: UNKNOWN,
            module: null,
            titleKey: null,
            permission: false,
            inSidebar: false,
            reachable: true,
          },
        ]
      : shownNodes,
    laidOut,
  );
  const positions = placed.nodes;
  const labelAt = (id: string) => placed.labels.get(id) ?? { x: 0, y: 0 };

  function toggle(path: string): void {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  /**
   * Show a page in the other half and outline its links.
   *
   * Twice, 500ms apart: the app has to render the new route before anything can
   * be found, and a page that fetches renders its links after its skeleton. The
   * second pass is what makes "4 of 6 on screen" true rather than optimistic --
   * the outlines themselves follow the DOM on their own after that.
   */
  function show(path: string): void {
    const url = goToRoute(path);
    const hops: PageHop[] = (outgoing.get(path) ?? []).map((navigation) => ({
      to: 'to' in navigation && navigation.to ? navigation.to : UNKNOWN,
      label: navigation.label,
      component: navigation.component,
      file: navigation.file,
      line: navigation.line,
    }));

    if (!open.has(path)) toggle(path);

    /*
     * Everything below belongs to THIS press of ↗.
     *
     * Two things arrive late and have to be ignored once you press ↗ again: the
     * second timer, and the highlighter's recount. Telling them apart by the
     * path they carry does not work -- "a late call about the old page" and "the
     * first call about the new page" look identical from in here, and a guard
     * that compared paths kept showing the previous page's report. A token does
     * not have that problem.
     */
    attempt.current += 1;
    const mine = attempt.current;
    const update = (marks: readonly Marked[]): void => {
      if (attempt.current !== mine) return;
      setShowing({ path, url, marks: [...marks] });
    };
    const look = () => {
      if (attempt.current !== mine) return;
      update(markNavigations(hops, update));
    };
    // Once now, once after the page has had time to fetch and render.
    window.setTimeout(look, 150);
    window.setTimeout(look, 650);
  }

  // Closing the map must not leave outlines on the app.
  useEffect(() => clearMarks, []);

  /**
   * Re-fit whenever the visible set changes.
   *
   * Opening a page puts its targets to the RIGHT of it, which on a map already
   * filling the screen means off the edge of it: you click, something happens,
   * and you see nothing. The animation is what makes it readable rather than
   * disorienting -- you watch the new column arrive.
   */
  // Just the one method, not the instance: React Flow types the instance by the
  // node and edge shapes, and naming that here fights the inferred literals for
  // no gain.
  const fit = useRef<(() => void) | null>(null);
  const shape = [...open].sort().join('|');
  useEffect(() => {
    fit.current?.();
  }, [shape]);

  const nodes = shownNodes.map((node) => {
    const targets = (outgoing.get(node.path) ?? []).length;
    const isOpen = open.has(node.path);
    const closed = targets > 0 && !isOpen;
    return {
      id: node.path,
      position: positions.get(node.path) ?? { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      // The caret and the badge are the affordance: without them a leaf and an
      // unopened page with six exits look identical, and you click to find out.
      data: {
        label: (
          <NodeLabel
            node={node}
            targets={targets}
            isOpen={isOpen}
            isShowing={showing?.path === node.path}
            onOpen={() => {
              show(node.path);
            }}
          />
        ),
      },
      style: {
        ...nodeBase,
        border: `2px solid ${
          showing?.path === node.path ? '#1d4ed8' : node.reachable ? '#2563eb' : '#f59e0b'
        }`,
        background: closed ? '#dbeafe' : node.reachable ? '#eff6ff' : '#fffbeb',
        color: '#111827',
        cursor: targets > 0 ? 'pointer' : 'default',
        // The page you are looking at, found at a glance in a 26-box map.
        boxShadow: showing?.path === node.path ? '0 0 0 4px #1d4ed836' : undefined,
      },
    };
  });

  if (shownUnresolved.length > 0) {
    nodes.push({
      id: UNKNOWN,
      position: positions.get(UNKNOWN) ?? { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: <span style={{ lineHeight: `${String(NODE_H - 4)}px` }}>? decided at runtime</span>,
      },
      style: {
        ...nodeBase,
        border: '2px dashed #6b7280',
        background: '#f9fafb',
        color: '#374151',
        cursor: 'default',
        boxShadow: undefined,
      },
    });
  }

  const byId = new Map<string, (GraphEdge | Unresolved)[]>();

  /**
   * The arrow and the outline on the page are the same colour.
   *
   * Without that the two halves are two separate pictures and you match them up
   * by reading path names. With it, "the pink one" is a complete sentence.
   */
  const litUp = litColors(showing?.marks ?? []);

  const edges = hops.map((hop) => {
    byId.set(hop.id, hop.navigations);
    const at = labelAt(hop.id);
    const unknown = hop.to === UNKNOWN;
    const redirect = hop.navigations.some((n) => n.kind === 'redirect');
    const lit = hop.from === showing?.path ? litUp.get(hop.to) : undefined;
    return {
      id: hop.id,
      source: hop.from,
      target: hop.to,
      type: 'map',
      data: { text: hopLabel(hop), labelX: at.x, labelY: at.y, color: lit },
      style: {
        // Shown, not hidden: a page that navigates somewhere unknowable is a
        // fact about the app, and leaving it off makes the map look complete.
        stroke: lit ?? (unknown ? '#9ca3af' : redirect ? '#7c3aed' : '#2563eb'),
        strokeWidth: lit === undefined ? 1.5 : 2.5,
        ...(unknown ? { strokeDasharray: '4 3' } : {}),
      },
    };
  });

  /*
   * Rows, not floating boxes.
   *
   * In a half-width dock a floating control strip covers the graph it is meant
   * to help with, and React Flow's own Controls and MiniMap are already in two
   * of the four corners. So the hint and the report are real rows and the graph
   * gets everything between them.
   */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Hint
        shown={shownNodes.length}
        total={graph.nodes.length}
        onExpandAll={() => setOpen(new Set(graph.nodes.map((n) => n.path)))}
        onCollapse={() => setOpen(new Set(roots.slice(0, 1)))}
      />
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          edgeTypes={edgeTypes}
          onInit={(instance) => {
            fit.current = () => {
              void instance.fitView({ padding: 0.14, duration: 260, maxZoom: 1 });
            };
          }}
          fitView
          fitViewOptions={{ padding: 0.14, maxZoom: 1 }}
          minZoom={0.1}
          nodesDraggable={false}
          onNodeClick={(_, node) => {
            if (node.id !== UNKNOWN) toggle(node.id);
          }}
          onEdgeClick={(_, edge) => setSelected(byId.get(edge.id) ?? null)}
          onPaneClick={() => setSelected(null)}
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable style={{ width: 118, height: 86 }} />
        </ReactFlow>
        {selected ? <Details navigations={selected} onClose={() => setSelected(null)} /> : null}
      </div>
      {showing ? (
        <OnScreen
          showing={showing}
          onClear={() => {
            clearMarks();
            setShowing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Hint({
  shown,
  total,
  onExpandAll,
  onCollapse,
}: {
  shown: number;
  total: number;
  onExpandAll: () => void;
  onCollapse: () => void;
}) {
  const button = {
    flex: 'none',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '3px 9px',
    background: '#ffffff',
    color: '#1f2937',
    font: 'inherit',
    cursor: 'pointer',
  } as const;
  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
        color: '#334155',
        font: '400 11px system-ui, sans-serif',
      }}
    >
      <span style={{ minWidth: 0 }}>
        Click a box to unfold it, <strong style={{ color: '#1d4ed8' }}>↗</strong> to open that page
        beside the map · {shown} of {total} shown
      </span>
      <button type="button" style={{ ...button, marginLeft: 'auto' }} onClick={onExpandAll}>
        Expand all
      </button>
      <button type="button" style={button} onClick={onCollapse}>
        Collapse
      </button>
    </div>
  );
}

/**
 * What the outlines on the page add up to.
 *
 * The honest part is the count. Four outlines out of six links looks like four
 * links until something says otherwise: the other two are a CTA in an empty
 * state and an item in a closed menu, and they are not on the page right now.
 * Saying "not on screen" turns a silent gap into a fact about the page.
 */
function OnScreen({ showing, onClear }: { showing: Showing; onClear: () => void }) {
  const live = showing.marks.filter((mark) => mark.count > 0).length;
  return (
    <div
      style={{
        flex: 'none',
        maxHeight: 190,
        overflowY: 'auto',
        padding: '8px 10px',
        borderTop: '1px solid #e2e8f0',
        background: '#f8fafc',
        color: '#334155',
        font: '400 11px system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 11 }}>
          Outlined on {showing.url}
          {showing.url === showing.path ? '' : ` (${showing.path})`}
        </strong>
        <span style={{ color: '#64748b' }}>
          {live} of {showing.marks.length} on screen
        </span>
        <button
          type="button"
          onClick={onClear}
          style={{
            marginLeft: 'auto',
            flex: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            padding: '2px 8px',
            background: '#ffffff',
            color: '#1f2937',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>
      {showing.marks.map((mark, index) => (
        <div
          key={`${String(mark.hop.file)}:${String(mark.hop.line)}:${String(index)}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '2px 0',
            opacity: mark.count > 0 ? 1 : 0.55,
          }}
        >
          <i
            style={{
              flex: 'none',
              width: 9,
              height: 9,
              borderRadius: 3,
              background: mark.color,
              border: mark.count > 0 ? '0' : `1px dashed ${mark.color}`,
              backgroundColor: mark.count > 0 ? mark.color : 'transparent',
            }}
          />
          <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>→ {mark.hop.to}</span>
          <span style={{ color: '#64748b', minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {mark.hop.component ?? mark.hop.label}
          </span>
          <span style={{ marginLeft: 'auto', flex: 'none', color: '#64748b' }}>
            {mark.count === 0
              ? 'not on screen'
              : mark.count === 1
                ? 'outlined'
                : `×${String(mark.count)}`}
          </span>
        </div>
      ))}
      {live < showing.marks.length ? (
        <p style={{ margin: '6px 0 0', color: '#64748b', lineHeight: 1.45 }}>
          Greyed rows are links this page can draw but is not drawing now — inside a closed menu, an
          empty state, or a branch this data does not reach.
        </p>
      ) : null}
    </div>
  );
}

const KIND_TEXT: Record<string, string> = {
  link: '<Link to="…">',
  anchor: '<a href="…">',
  navigate: "navigate('…')",
  redirect: "redirect('…')",
};

/** One navigation, as the rows you need to go and change it. */
function Navigation({ item }: { item: GraphEdge | Unresolved }) {
  const target = 'to' in item ? item.to : null;
  const location = `${item.file}:${String(item.line)}`;

  const rows: [string, string][] = [
    ['From', item.from],
    ['To', target ?? 'decided at runtime — cannot be known statically'],
    ['Trigger', item.label],
    ['How', KIND_TEXT[item.kind] ?? item.kind],
    ['Component', item.component ?? 'not inside a named component'],
    ['Source', location],
  ];

  return (
    <div>
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
          marginTop: 8,
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
    </div>
  );
}

/**
 * Everything needed to go and change this arrow, without grepping.
 *
 * An arrow can stand for several navigations -- two components both linking to
 * the dashboard is one line on the map and two places in the code -- so this
 * lists every one of them rather than picking the first and calling it the
 * answer.
 */
function Details({
  navigations,
  onClose,
}: {
  navigations: (GraphEdge | Unresolved)[];
  onClose: () => void;
}) {
  return (
    <aside
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 310,
        maxWidth: 'calc(100% - 24px)',
        maxHeight: 'calc(100% - 24px)',
        overflowY: 'auto',
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
        <strong style={{ fontSize: 12 }}>
          What makes this happen
          {navigations.length > 1 ? ` · ${String(navigations.length)} ways` : ''}
        </strong>
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
      {navigations.map((item, index) => (
        <div
          key={`${item.file}:${String(item.line)}:${String(index)}`}
          style={{
            marginTop: index === 0 ? 0 : 12,
            paddingTop: index === 0 ? 0 : 12,
            borderTop: index === 0 ? undefined : '1px solid #374151',
          }}
        >
          <Navigation item={item} />
        </div>
      ))}
    </aside>
  );
}

let root: Root | null = null;
let view: Frame | null = null;

export async function openRouteMap(): Promise<void> {
  if (view) return closeRouteMap();

  const graph = (await fetch('/__react-dev/route-graph').then((r) => r.json())) as Graph & {
    error?: string;
  };

  view = openSidePanel('react-dev-route-map', () => {
    root?.unmount();
    root = null;
    view = null;
    // Belt and braces: Map_'s own cleanup does this too, but a frame that closes
    // without unmounting cleanly would otherwise leave outlines on the app.
    clearMarks();
  });

  if (graph.error) {
    view.status.textContent = `Could not build the map: ${graph.error}`;
  } else {
    const orphans = graph.nodes.filter((n) => !n.reachable).length;
    view.status.textContent =
      `${String(graph.nodes.length)} pages · ${String(graph.edges.length)} links` +
      (orphans > 0 ? ` · ${String(orphans)} orphaned` : '') +
      (graph.unresolved.length > 0
        ? ` · ${String(graph.unresolved.length)} decided at runtime` // shown as the dashed "?" node
        : '') +
      ' · click any arrow to see what triggers it';
    root = createRoot(view.canvas);
    root.render(<Map_ graph={graph} />);
  }
}

export function closeRouteMap(): void {
  view?.close();
}
