/**
 * Dev-only "Dev" overlay: shows, on the page itself, which components are
 * SHARED across the app and which were written for this one page.
 *
 * Why it exists: after an agent builds a feature you cannot tell by looking
 * whether it reused the design system or quietly rebuilt a card. This answers
 * that without reading any code.
 *
 * The classification comes from the dev server (`/__react-dev/component-map`),
 * which reads the real import graph. The DOM only knows a file path; whether
 * that file has two consumers is not a DOM fact, and guessing it from the path
 * is how you end up calling everything in `components/` "reused".
 */

interface ComponentRecord {
  name: string;
  scope: 'shared' | 'feature' | 'app';
  layer: string;
  origin: 'new' | 'existing' | 'unknown';
}

interface ComponentMap {
  branch: string | null;
  base: string | null;
  determined: boolean;
  components: Record<string, ComponentRecord>;
}

type Category = 'reused' | 'newShared' | 'newHere' | 'existingHere' | 'app';

const CATEGORY: Record<Category, { label: string; color: string; hint: string }> = {
  reused: {
    label: 'Reused from the design system',
    color: '#10b981',
    hint: 'a shared component that already existed before this branch',
  },
  newShared: {
    label: 'New, placed as shared',
    color: '#a855f7',
    hint: 'written on this branch but put in a shared layer -- check a second feature really needs it',
  },
  newHere: {
    label: 'Written for this feature',
    color: '#3b82f6',
    hint: 'new on this branch, inside the page slice',
  },
  existingHere: {
    label: 'Existing feature code',
    color: '#0ea5e9',
    hint: 'inside a feature, but it predates this branch',
  },
  app: { label: 'App shell', color: '#6b7280', hint: 'layout and routing' },
};

function categorise(record: ComponentRecord): Category {
  if (record.scope === 'app') return 'app';
  if (record.scope === 'shared') return record.origin === 'new' ? 'newShared' : 'reused';
  return record.origin === 'new' ? 'newHere' : 'existingHere';
}

/** `/src/components/atoms/button.tsx:12:4` -> `src/components/atoms/button.tsx` */
function fileFromSource(raw: string): string | null {
  const match = /^(.*):\d+:\d+$/.exec(raw);
  if (!match?.[1]) return null;
  return match[1].replace(/^\/+/, '');
}

export function mountComponentOverlay(bar: HTMLElement, shadow: ShadowRoot): void {
  let active = false;
  let map: ComponentMap | null = null;
  const hidden = new Set<Category>();

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'dev';
  button.textContent = 'Dev';
  bar.appendChild(button);

  const canvas = document.createElement('div');
  canvas.className = 'overlay';
  canvas.hidden = true;
  shadow.appendChild(canvas);

  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.hidden = true;
  shadow.appendChild(legend);

  function clear(): void {
    canvas.replaceChildren();
  }

  /** One outline for one component instance. Null when it is not worth drawing. */
  function buildMark(
    element: Element,
    record: ComponentRecord,
    category: Category,
  ): HTMLDivElement | null {
    const box = element.getBoundingClientRect();
    // Zero-size elements (an empty wrapper, a hidden node) would draw a dot in
    // the corner and read as noise.
    if (box.width < 4 || box.height < 4) return null;

    const mark = document.createElement('div');
    mark.className = 'mark';
    mark.style.top = `${box.top}px`;
    mark.style.left = `${box.left}px`;
    mark.style.width = `${box.width}px`;
    mark.style.height = `${box.height}px`;
    mark.style.borderColor = CATEGORY[category].color;
    // A page-sized wrapper (a template, the shell) filled at 8% tints the whole
    // screen and reads as "the page is green" rather than "this box is green".
    // Large areas get the outline only; the tint is for things you can point at.
    const share = (box.width * box.height) / (window.innerWidth * window.innerHeight);
    mark.style.background = share > 0.4 ? 'transparent' : `${CATEGORY[category].color}14`;

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.style.background = CATEGORY[category].color;
    // Sitting above the box puts it off-screen for anything flush with the top.
    if (box.top < 12) tag.style.top = '2px';
    tag.textContent = `${record.name} · ${record.layer}`;
    mark.appendChild(tag);
    return mark;
  }

  function draw(): void {
    clear();
    if (!active || !map) return;

    // Count distinct COMPONENTS, not outlined elements: "9 written for this
    // feature" is a fact about the code, "18 boxes" is a fact about the DOM.
    const seen: Record<Category, Set<string>> = {
      reused: new Set(),
      newShared: new Set(),
      newHere: new Set(),
      existingHere: new Set(),
      app: new Set(),
    };
    /** Outermost already-marked elements per file, so nesting draws once. */
    const outermost = new Map<string, Element[]>();

    for (const element of document.querySelectorAll('[data-tsd-source]')) {
      const raw = element.getAttribute('data-tsd-source');
      const file = raw ? fileFromSource(raw) : null;
      const record = file ? map.components[file] : undefined;
      if (!file || !record) continue;

      const category = categorise(record);
      seen[category].add(file);
      if (hidden.has(category)) continue;

      // One component renders a whole subtree and the transform stamps every
      // element in it. Outlining all of them stacks identical borders, so only
      // the outermost element of each run draws.
      const already = outermost.get(file) ?? [];
      if (already.some((ancestor) => ancestor.contains(element))) continue;
      already.push(element);
      outermost.set(file, already);

      const mark = buildMark(element, record, category);
      if (mark) canvas.appendChild(mark);
    }

    const counts = {} as Record<Category, number>;
    for (const key of Object.keys(seen) as Category[]) counts[key] = seen[key].size;
    renderLegend(counts);
  }

  function renderLegend(counts: Record<Category, number>): void {
    legend.replaceChildren();

    const title = document.createElement('h2');
    title.textContent = 'What is on this page';
    legend.appendChild(title);

    for (const key of Object.keys(CATEGORY) as Category[]) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'row';
      row.dataset['off'] = String(hidden.has(key));
      row.title = CATEGORY[key].hint;

      const swatch = document.createElement('i');
      swatch.style.background = CATEGORY[key].color;
      row.appendChild(swatch);

      const text = document.createElement('span');
      text.textContent = `${CATEGORY[key].label} (${counts[key]})`;
      row.appendChild(text);

      row.addEventListener('click', () => {
        if (hidden.has(key)) hidden.delete(key);
        else hidden.add(key);
        draw();
      });
      legend.appendChild(row);
    }

    const note = document.createElement('p');
    if (map && !map.determined) {
      note.textContent =
        'No git branch to compare against, so new and existing cannot be told apart. Only location is shown.';
    } else if (counts.newShared > 0) {
      note.textContent =
        'Purple was written on this branch but placed in a shared layer. Fine if a second feature needs it — otherwise it was shared too early.';
    } else if (map?.base) {
      note.textContent = `New = added on ${map.branch} since ${map.base}. Click a row to hide it.`;
    } else {
      note.textContent = 'Click a row to hide that group. Uncommitted files count as new.';
    }
    legend.appendChild(note);
  }

  async function load(): Promise<void> {
    try {
      const response = await fetch('/__react-dev/component-map');
      map = (await response.json()) as ComponentMap;
    } catch {
      map = { branch: null, base: null, determined: false, components: {} };
    }
  }

  async function toggle(): Promise<void> {
    active = !active;
    button.dataset['active'] = String(active);
    canvas.hidden = !active;
    legend.hidden = !active;
    if (!active) return clear();
    // Always refetch: the agent may have added a component since the last look,
    // and a stale map would show it as untraced rather than new.
    await load();
    draw();
  }

  button.addEventListener('click', () => void toggle());
  window.addEventListener('scroll', draw, { passive: true });
  window.addEventListener('resize', draw);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !active) return;
    void toggle();
  });
}
