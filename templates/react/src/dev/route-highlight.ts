/**
 * Puts the map's arrows on the page itself.
 *
 * The map answers "where can this page go?" in the abstract. This answers it on
 * the screen: every link out of the page you are looking at gets a coloured
 * outline, in the same colour the map uses for that arrow, so "two of these
 * cards go to the dog profile and that button goes to the form" is something you
 * see rather than something you reconstruct.
 *
 * The match is exact, not a guess. `tools/route-graph.mjs` reports the FILE AND
 * LINE of the JSX element that navigates, and `@tanstack/devtools-vite` stamps
 * the same file:line onto the DOM element it renders -- so this is a lookup, not
 * a heuristic over class names or hrefs.
 *
 * A navigation it cannot find is reported rather than dropped: a link inside a
 * closed dropdown or an empty state is not on screen, and saying so is the
 * point. Silently showing four of six outlines would read as "there are four".
 */

export interface PageHop {
  /** Where it goes. Hops to the same page share a colour. */
  to: string;
  label: string;
  component: string | null;
  file: string | null;
  line: number | null;
}

export interface Marked {
  hop: PageHop;
  color: string;
  /** How many elements were outlined. 0 = nothing of it is on the page now. */
  count: number;
  /** Whether the link itself was found on the page, or nothing was. */
  how: 'element' | 'absent';
}

/**
 * One hue per destination. Chosen to stay apart from each other and to read on
 * a light page; the map draws the same colour on the matching arrow.
 *
 * The map's own arrows are `#2563eb`, so that blue is LAST: were it first, the
 * lit arrow for the first destination would look exactly like the arrows that
 * are not lit, and the whole point is telling them apart.
 */
export const HOP_COLORS = [
  '#db2777',
  '#0891b2',
  '#d97706',
  '#7c3aed',
  '#059669',
  '#be123c',
  '#4d7c0f',
  '#2563eb',
] as const;

const HOST_ID = 'react-dev-route-marks';

/** `/src/a.tsx:52:7` and `src/a.tsx:52:7` are the same place. */
function sourceOf(element: Element): string {
  return (element.getAttribute('data-tsd-source') ?? '').replace(/^\/+/, '');
}

/** Does this href go where the hop goes? `/dogs/dog-bruno` ⇢ `/dogs/:dogId`. */
function goesTo(href: string | null, to: string): boolean {
  if (href === null || href.startsWith('http')) return false;
  const path = href.split(/[?#]/)[0] ?? href;
  if (!to.includes(':')) return path === to;
  const fixed = to.slice(0, to.indexOf(':'));
  return path.startsWith(fixed) && path.split('/').length === to.split('/').length;
}

/** Elements this component rendered, by the stamp the Vite transform leaves. */
function fromFile(file: string): Element[] {
  const prefix = `${file}:`;
  return [...document.querySelectorAll('[data-tsd-source]')].filter((element) =>
    sourceOf(element).startsWith(prefix),
  );
}

/**
 * Did `file` put this element on the screen -- directly, or through a wrapper?
 *
 * The stamp names the file the DOM element is WRITTEN in, which for
 * `<SeeAllLink to="/categories" />` is see-all-link.tsx, while the map reports
 * the call site in home-page.tsx. Nothing in the DOM carries the call site, so
 * the only link between the two is containment: the `<a>` sits inside the markup
 * home-page.tsx drew. Walking up to find that is what makes a project built out
 * of wrapper components report the same as one that writes its `<a>`s inline.
 */
function insideFile(element: Element, file: string): boolean {
  const prefix = `${file}:`;
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    if (sourceOf(node).startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Every element that navigates this way -- not the first.
 *
 * Two ways, strongest first, because each fails on a real pattern:
 *
 * 1. **The href, anywhere inside what this component drew.** Decisive for a
 *    link, and immune to how many components the `to` prop was passed through
 *    on its way to the `<a>` -- wrappers drop the source stamp, and this
 *    survives it. Scoped by containment rather than taken page-wide, so the
 *    nav's own link to the same page is not claimed as this component's.
 * 2. **The source line** (±1, for a prop written on its own line). The only
 *    thing that works for a `navigate()` in a handler, which renders no href.
 *
 * And no third way. Outlining the whole component when neither matches was
 * tried, and it claimed a link that was not there: an empty state's CTA, drawn
 * as a box around the page that is rendering something else. "Not on screen" is
 * the honest answer and the report says it.
 *
 * A list renders the same `<Link>` once per item, so both ways return ALL their
 * matches: outlining one of five identical cards reads as "this one is special".
 */
function matchesFor(hop: PageHop): { elements: Element[]; how: Marked['how'] } {
  const file = hop.file;
  if (file === null) return { elements: [], how: 'absent' };
  const candidates = fromFile(file);
  if (candidates.length === 0) return { elements: [], how: 'absent' };

  const byHref = [...document.querySelectorAll('a[href]')].filter(
    (element) => goesTo(element.getAttribute('href'), hop.to) && insideFile(element, file),
  );
  if (byHref.length > 0) return { elements: byHref, how: 'element' };

  if (hop.line !== null) {
    const lines = [hop.line, hop.line - 1, hop.line + 1].map((line) => `${file}:${String(line)}:`);
    const byLine = candidates.filter((element) =>
      lines.some((prefix) => sourceOf(element).startsWith(prefix)),
    );
    if (byLine.length > 0) return { elements: byLine, how: 'element' };
  }

  return { elements: [], how: 'absent' };
}

function elementsFor(hop: PageHop): Element[] {
  return matchesFor(hop).elements;
}

function host(): HTMLDivElement {
  const existing = document.getElementById(HOST_ID);
  if (existing !== null) return existing as HTMLDivElement;

  const element = document.createElement('div');
  element.id = HOST_ID;
  Object.assign(element.style, {
    position: 'fixed',
    inset: '0',
    // Under the map panel, over the app, and transparent to the mouse: the
    // links being outlined have to stay clickable.
    zIndex: '2147483644',
    pointerEvents: 'none',
  });
  document.body.appendChild(element);
  return element;
}

function mark(element: Element, hop: PageHop, color: string): HTMLDivElement | null {
  const box = element.getBoundingClientRect();
  if (box.width < 4 || box.height < 4) return null;

  const outline = document.createElement('div');
  Object.assign(outline.style, {
    position: 'fixed',
    top: `${String(box.top)}px`,
    left: `${String(box.left)}px`,
    width: `${String(box.width)}px`,
    height: `${String(box.height)}px`,
    border: `2px solid ${color}`,
    borderRadius: '8px',
    background: `${color}12`,
    boxShadow: `0 0 0 3px ${color}22`,
    boxSizing: 'border-box',
  });

  const tag = document.createElement('span');
  Object.assign(tag.style, {
    position: 'absolute',
    // Above the box, unless the box is at the top of the screen.
    top: box.top < 20 ? '2px' : '-10px',
    left: '-2px',
    padding: '1px 6px',
    borderRadius: '5px',
    background: color,
    color: '#fff',
    font: '600 10px/1.5 system-ui, sans-serif',
    whiteSpace: 'nowrap',
  });
  tag.textContent = `→ ${hop.to}`;
  outline.appendChild(tag);
  return outline;
}

/** State kept so scrolling, resizing and the app re-rendering can redraw. */
let shown: Marked[] = [];
/** Which hop set has already been scrolled to, so a redraw does not re-scroll. */
let revealedFor = '';
let watching = false;
let frame = 0;
let listener: ((marks: readonly Marked[]) => void) | null = null;
let reported = '';
let observed: Element | null = null;
let observer: MutationObserver | null = null;

/**
 * Draw, and recount.
 *
 * The count is recomputed here rather than once at the start, because the page
 * is usually still rendering when the map asks: a navigation plus a fetch means
 * the links appear several hundred milliseconds later. Counting once said
 * "0 of 6 on screen" while six outlines were being drawn behind it -- a report
 * that contradicted the screen, which is worse than no report.
 */
function draw(): void {
  const layer = host();
  layer.replaceChildren();

  const next = shown.map((entry) => {
    const { elements, how } = matchesFor(entry.hop);
    for (const element of elements) {
      const outline = mark(element, entry.hop, entry.color);
      if (outline) layer.appendChild(outline);
    }
    return { ...entry, count: elements.length, how };
  });
  shown = next;

  reveal();

  // Only when it changed: this runs on every DOM mutation under #root.
  const signature = next.map((entry) => `${entry.how}:${String(entry.count)}`).join('|');
  if (signature === reported) return;
  reported = signature;
  listener?.(next);
}

function redraw(): void {
  if (frame !== 0) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (shown.length > 0) draw();
  });
}

function watch(): void {
  if (!watching) {
    watching = true;
    // capture, so a scroll inside the app's own scrolling panel counts too.
    window.addEventListener('scroll', redraw, { passive: true, capture: true });
    window.addEventListener('resize', redraw);
  }

  // The app keeps rendering underneath -- a list loads, a card opens -- and an
  // outline left at the old coordinates is worse than no outline.
  //
  // Re-attached whenever the root is a different element than last time: held
  // by a flag alone, the observer stayed bound to a root that had been replaced
  // and nothing redrew again. `document.body` because a project is free to
  // mount somewhere other than #root, and then no redraw at all is the worst of
  // the options.
  const root = document.getElementById('root') ?? document.body;
  if (root === observed) return;
  observer?.disconnect();
  observed = root;
  observer = new MutationObserver(redraw);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  });
}

/**
 * Destination -> colour, for the hops that are actually outlined right now.
 *
 * The colour is a pairing: this arrow in the map, that outline on the page. A
 * hop with nothing on screen has no outline to pair with, so lighting its arrow
 * would promise an outline that is not there -- and the report, one line below
 * the map, says in words that this one is not on screen.
 */
export function litColors(marks: readonly Marked[]): Map<string, string> {
  return new Map(marks.filter((mark) => mark.count > 0).map((mark) => [mark.hop.to, mark.color]));
}

/**
 * Outlines every navigation out of the page currently on screen.
 *
 * @returns one entry per hop, in the order given, with the colour it was drawn
 * in and how many elements carry it -- `count: 0` meaning "not rendered now",
 * which is for the caller to report, not to hide.
 */
export function markNavigations(
  hops: readonly PageHop[],
  onChange?: (marks: readonly Marked[]) => void,
): Marked[] {
  const colorOf = new Map<string, string>();
  shown = hops.map((hop) => {
    const existing = colorOf.get(hop.to);
    const color = existing ?? HOP_COLORS[colorOf.size % HOP_COLORS.length] ?? HOP_COLORS[0];
    colorOf.set(hop.to, color);
    return { hop, color, count: 0, how: 'absent' as const };
  });
  listener = onChange ?? null;
  reported = '';

  draw();
  watch();
  return shown;
}

/**
 * Bring the first outlined link into view.
 *
 * Without this the feature looks broken on any page longer than the window: the
 * outlines are drawn correctly, 700px below the fold, and the page you were
 * sent to appears to have none. Once per page, so the second pass -- and every
 * redraw after it -- does not yank the page while you are reading.
 */
function reveal(): void {
  const signature = shown
    .map((entry) => `${String(entry.hop.file)}:${String(entry.hop.line)}`)
    .join('|');
  if (signature === revealedFor) return;

  const found = shown
    .flatMap((entry) => elementsFor(entry.hop))
    .map((element) => ({ element, top: element.getBoundingClientRect().top }))
    .sort((a, b) => a.top - b.top);
  const first = found[0];
  if (!first) return;

  revealedFor = signature;
  // Only when it is actually off screen: scrolling a page that already shows
  // the link is motion for nothing.
  if (first.top >= 0 && first.top <= window.innerHeight - 40) return;
  first.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

export function clearMarks(): void {
  shown = [];
  revealedFor = '';
  reported = '';
  listener = null;
  document.getElementById(HOST_ID)?.remove();
}

/**
 * Sends the app to `path`, without reloading it.
 *
 * `pushState` alone changes the URL and nothing else -- React Router never hears
 * about it. The `popstate` that follows is what it listens to, and the pair is
 * the standard way to drive a router from outside the React tree. A full
 * `location.assign` would work too, and would throw away the map.
 *
 * @returns the path actually opened: a route with parameters cannot be visited
 * as written, so `:dogId` becomes `1` and the caller can say so.
 */
export function goToRoute(path: string): string {
  const concrete = path.replace(/:[A-Za-z0-9_]+/g, '1');
  window.history.pushState({}, '', concrete);
  window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  return concrete;
}
