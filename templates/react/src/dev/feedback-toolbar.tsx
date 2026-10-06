/**
 * Dev-only visual feedback channel.
 *
 * The problem it solves: you see something wrong on screen, describe it in
 * prose, and the agent guesses which of N files you meant. Here you click the
 * element and the agent gets the exact source location.
 *
 * `file` and `line` come from React's dev-mode fiber (`_debugSource`, populated
 * by the JSX dev transform), not from guessing at the DOM -- which is the
 * difference between "fix the badge somewhere" and a one-line edit.
 *
 * Entries land in `.ai/inbox/`. The `react-feedback` skill reads them, counts
 * recurrences, and promotes anything seen 3+ times into a rule.
 */

/**
 * Source location comes from `data-tsd-source="file:line:column"`, injected in
 * dev by `@tanstack/devtools-vite` (see vite.config.ts).
 *
 * It used to come from `fiber._debugSource`, which **React 19 removed** -- that
 * silently made `file`, `line` and `component` null in every entry, which is the
 * most useful part of the payload. A build-time attribute does not depend on
 * React internals, so it survives React majors.
 *
 * The component NAME still comes from the fiber: `type.name` was not removed.
 */

import { mountComponentOverlay } from './component-overlay';

interface Fiber {
  return: Fiber | null;
  type: unknown;
  _debugOwner?: Fiber | null;
}

const FIBER_KEY_PREFIX = '__reactFiber$';

function findFiber(element: Element): Fiber | null {
  const key = Object.keys(element).find((k) => k.startsWith(FIBER_KEY_PREFIX));
  return key ? ((element as unknown as Record<string, Fiber>)[key] ?? null) : null;
}

function componentName(type: unknown): string | null {
  if (typeof type === 'function') return type.name || null;
  if (typeof type === 'object' && type !== null && 'displayName' in type) {
    return String(type.displayName);
  }
  return null;
}

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  component: string | null;
}

/** Nearest ancestor carrying a source attribute, plus the owning component. */
function resolveSource(element: Element): SourceLocation | null {
  const stamped = element.closest('[data-tsd-source]');
  const raw = stamped?.getAttribute('data-tsd-source');
  if (!raw) return null;

  // "file:line:column" -- rsplit, because a path may contain a colon.
  const match = /^(.*):(\d+):(\d+)$/.exec(raw);
  if (!match) return null;

  let component: string | null = null;
  let fiber = findFiber(stamped ?? element);
  while (fiber && !component) {
    component = componentName(fiber.type);
    fiber = fiber._debugOwner ?? fiber.return;
  }

  return {
    file: (match[1] ?? '').replace(/^\//, ''),
    line: Number(match[2]),
    column: Number(match[3]),
    component,
  };
}

function cssPath(element: Element): string {
  const parts: string[] = [];
  let node: Element | null = element;
  while (node && node !== document.body && parts.length < 5) {
    const tag = node.tagName.toLowerCase();
    const cls =
      node.className && typeof node.className === 'string'
        ? `.${node.className.trim().split(/\s+/).slice(0, 2).join('.')}`
        : '';
    parts.unshift(`${tag}${cls}`);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

const TRACKED_STYLES = [
  'color',
  'backgroundColor',
  'fontSize',
  'fontWeight',
  'padding',
  'margin',
  'display',
  'borderRadius',
] as const;

function relevantStyles(element: Element): Record<string, string> {
  const computed = window.getComputedStyle(element);
  return Object.fromEntries(TRACKED_STYLES.map((prop) => [prop, computed[prop]]));
}

async function send(payload: unknown): Promise<void> {
  // Vite dev server plugin writes this to .ai/inbox/. See tools/gen/feedback-plugin.mjs.
  await fetch('/__react-dev/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((error: unknown) => {
    console.error('[feedback] could not reach the dev server', error);
  });
}

interface Intent {
  id: string;
  label: string;
  /** What the agent will actually DO. Shown behind the (i), not guessed at. */
  explains: string;
}

const INTENTS: readonly Intent[] = [
  {
    id: 'fix',
    label: 'Something is wrong with it',
    explains:
      'Treated as a defect. The agent reads the exact file and line, fixes it, and if the same kind of correction comes up three times it becomes a permanent project rule.',
  },
  {
    id: 'reuse',
    label: 'I want this elsewhere too',
    explains:
      'A request to share the component. The agent will ask WHICH other page needs it, because a second real use is what decides where it should live. "Just in case" is not enough and it will say so.',
  },
  {
    id: 'style',
    label: 'Change how it looks',
    explains:
      'Treated as a change to the design tokens — colours, spacing, radii — so it applies everywhere consistently. It will not patch one component with a hardcoded colour.',
  },
  {
    id: 'wording',
    label: 'Fix the wording',
    explains:
      'The text goes to the translation files, so English and Polish stay in step. A missing translation then fails the automatic check rather than shipping half-translated.',
  },
  {
    id: 'explain',
    label: 'Explain what this is',
    explains:
      'Nothing is changed and nothing is recorded as feedback. You just get an explanation of what this element is and which file draws it.',
  },
];

interface FeedbackItem {
  id: string;
  folder: 'inbox' | 'working' | 'done';
  status?: string;
  intent?: string;
  comment?: string | null;
  file?: string | null;
  line?: number | null;
  agentNote?: string;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  inbox: { text: 'waiting', color: '#6b7280' },
  working: { text: 'in progress', color: '#f59e0b' },
  done: { text: 'done', color: '#10b981' },
};

export function mountFeedbackToolbar(): void {
  if (document.getElementById('react-dev-feedback')) return;

  let picking = false;
  let highlighted: Element | null = null;

  const host = document.createElement('div');
  host.id = 'react-dev-feedback';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .bar { position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
             font: 500 13px system-ui, sans-serif; display: flex; gap: 8px; }
      button { border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer;
               background: #1f2937; color: #fff; box-shadow: 0 4px 14px rgb(0 0 0 / .25); }
      button[data-active="true"] { background: #2563eb; }
      .ring { position: fixed; pointer-events: none; z-index: 2147483646;
              outline: 2px solid #2563eb; outline-offset: 2px; border-radius: 4px;
              transition: all 60ms linear; }
      .panel { position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
               width: 320px; padding: 14px; border-radius: 12px; background: #111827;
               color: #f9fafb; font: 400 13px system-ui, sans-serif;
               box-shadow: 0 10px 30px rgb(0 0 0 / .4); }
      .panel h2 { margin: 0 0 2px; font-size: 13px; font-weight: 600; }
      .panel .where { margin: 0 0 10px; font-size: 11px; color: #9ca3af;
                      word-break: break-all; }
      .panel textarea { width: 100%; box-sizing: border-box; min-height: 132px;
                        margin-bottom: 10px; padding: 9px; border-radius: 7px;
                        border: 1px solid #374151; background: #1f2937; color: #f9fafb;
                        font: inherit; line-height: 1.45; resize: vertical; }
      .intents { display: flex; flex-direction: column; gap: 6px; }
      .intents .row { display: flex; align-items: stretch; gap: 4px; }
      .intents .row button.pick { flex: 1; text-align: left; background: #1f2937; font: inherit; }
      .intents .row button.pick:hover, .intents .row button.pick:focus-visible { background: #2563eb; }
      .intents .row button.info { width: 28px; padding: 0; background: #1f2937; color: #9ca3af;
                                  font: 600 12px system-ui, sans-serif; }
      .intents .row button.info:hover, .intents .row button.info:focus-visible {
        background: #374151; color: #f9fafb; }
      .explain { margin: 8px 0 0; padding: 7px 8px; border-radius: 6px; background: #0b1220;
                 font-size: 11px; line-height: 1.45; color: #cbd5e1; }
      .explain[hidden] { display: none; }
      .list { position: fixed; bottom: 60px; right: 16px; z-index: 2147483647; width: 340px;
              max-height: 62vh; overflow: auto; padding: 12px; border-radius: 12px;
              background: #111827; color: #f9fafb; font: 400 12px system-ui, sans-serif;
              box-shadow: 0 10px 30px rgb(0 0 0 / .4); }
      .list h2 { margin: 0 0 8px; font-size: 12px; font-weight: 600; }
      .item { padding: 8px; border-radius: 8px; background: #1f2937; margin-bottom: 7px; }
      .item .top { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
      .item .badge { padding: 1px 6px; border-radius: 999px; font-size: 10px; font-weight: 600; }
      .item .where { font-size: 10px; color: #9ca3af; word-break: break-all; }
      .item .said { margin: 4px 0 0; font-size: 11px; }
      .item .agent { margin: 5px 0 0; padding: 5px 6px; border-radius: 5px; background: #0b1220;
                     font-size: 11px; color: #cbd5e1; }
      .item .acts { display: flex; gap: 6px; margin-top: 7px; }
      .item .acts button { flex: 1; font: inherit; font-size: 11px; padding: 5px 8px; }
      .item .acts .yes { background: #10b981; }
      .item .acts .no { background: #374151; }
      .list .empty { color: #9ca3af; font-size: 11px; line-height: 1.5; }
      .panel .cancel { margin-top: 10px; background: transparent; color: #9ca3af;
                       padding: 4px 0; }
      .overlay { position: fixed; inset: 0; pointer-events: none; z-index: 2147483645; }
      .mark { position: fixed; border: 2px solid; border-radius: 4px; }
      .tag { position: absolute; top: -9px; left: -2px; padding: 1px 5px;
             border-radius: 4px; color: #fff; white-space: nowrap;
             font: 600 10px/1.4 system-ui, sans-serif; }
      .legend { position: fixed; bottom: 60px; right: 16px; z-index: 2147483647;
                width: 268px; padding: 12px; border-radius: 12px; background: #111827;
                color: #f9fafb; font: 400 12px system-ui, sans-serif;
                box-shadow: 0 10px 30px rgb(0 0 0 / .4); }
      .legend h2 { margin: 0 0 8px; font-size: 12px; font-weight: 600; }
      .legend .row { display: flex; align-items: center; gap: 8px; width: 100%;
                     padding: 5px 6px; background: transparent; color: inherit;
                     font: inherit; border-radius: 6px; }
      .legend .row:hover { background: #1f2937; }
      .legend .row[data-off="true"] { opacity: .4; text-decoration: line-through; }
      .legend .row i { width: 10px; height: 10px; border-radius: 3px; flex: none; }
      .legend p { margin: 8px 0 0; font-size: 10px; line-height: 1.45; color: #9ca3af; }
    </style>
    <div class="bar">
      <button type="button" id="inbox" title="Feedback you have sent">List</button>
      <button type="button" id="pick">Feedback</button>
    </div>
    <div class="ring" id="ring" hidden></div>
    <div class="panel" id="panel" hidden role="dialog" aria-label="Send feedback">
      <h2>What do you want here?</h2>
      <p class="where" id="where"></p>
      <textarea id="note" placeholder="Describe it in your own words — the more detail, the less guessing. Optional."></textarea>
      <div class="intents" id="intents"></div>
      <p class="explain" id="explain" hidden></p>
      <button type="button" class="cancel" id="cancel">Cancel (Esc)</button>
    </div>
    <div class="list" id="list" hidden role="dialog" aria-label="Feedback you have sent"></div>
  `;
  document.body.appendChild(host);

  const pickButton = shadow.getElementById('pick') as HTMLButtonElement;
  const ring = shadow.getElementById('ring') as HTMLDivElement;
  const panel = shadow.getElementById('panel') as HTMLDivElement;
  const listPanel = shadow.getElementById('list') as HTMLDivElement;
  const explain = shadow.getElementById('explain') as HTMLParagraphElement;

  // Build the intent rows: a wide button to choose, and an (i) that says what
  // choosing it will actually make the agent do.
  const intentsBox = shadow.getElementById('intents') as HTMLDivElement;
  for (const intent of INTENTS) {
    const row = document.createElement('div');
    row.className = 'row';

    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'pick';
    pick.dataset['intent'] = intent.id;
    pick.textContent = intent.label;

    const info = document.createElement('button');
    info.type = 'button';
    info.className = 'info';
    info.textContent = 'i';
    info.setAttribute('aria-label', `What "${intent.label}" does`);
    const show = () => {
      explain.textContent = intent.explains;
      explain.hidden = false;
    };
    info.addEventListener('click', show);
    info.addEventListener('mouseenter', show);
    info.addEventListener('focus', show);

    row.append(pick, info);
    intentsBox.appendChild(row);
  }
  const where = shadow.getElementById('where') as HTMLParagraphElement;
  const note = shadow.getElementById('note') as HTMLTextAreaElement;

  /** The element awaiting an intent. Held between picking and sending. */
  let pending: Element | null = null;

  function closePanel(): void {
    panel.hidden = true;
    pending = null;
    note.value = '';
    explain.hidden = true;
  }

  function setPicking(next: boolean): void {
    picking = next;
    pickButton.dataset['active'] = String(next);
    pickButton.textContent = next ? 'Click an element…' : 'Feedback';
    if (!next) {
      ring.hidden = true;
      highlighted = null;
    }
  }

  function onMove(event: MouseEvent): void {
    if (!picking) return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || target === highlighted || host.contains(target)) return;
    highlighted = target;
    const box = target.getBoundingClientRect();
    Object.assign(ring.style, {
      top: `${box.top}px`,
      left: `${box.left}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    });
    ring.hidden = false;
  }

  function onClick(event: MouseEvent): void {
    if (!picking || !highlighted) return;
    event.preventDefault();
    event.stopPropagation();

    const target = highlighted;
    setPicking(false);

    // Ask what the user WANTS, not just what is wrong. An intent the agent can
    // branch on beats free text it has to interpret -- "I want this elsewhere
    // too" plus an exact file is everything `gen -- promote` needs.
    pending = target;
    const source = resolveSource(target);
    where.textContent = source ? `${source.file}:${source.line}` : cssPath(target);
    panel.hidden = false;
    note.focus();
  }

  function renderItem(item: FeedbackItem): HTMLDivElement {
    const box = document.createElement('div');
    box.className = 'item';

    const top = document.createElement('div');
    top.className = 'top';
    const badge = document.createElement('span');
    badge.className = 'badge';
    const status = STATUS_LABEL[item.folder] ?? STATUS_LABEL['inbox'];
    badge.textContent = status?.text ?? item.folder;
    badge.style.background = status?.color ?? '#6b7280';
    const intent = document.createElement('strong');
    intent.textContent = item.intent ?? 'fix';
    top.append(badge, intent);
    box.appendChild(top);

    const where = document.createElement('div');
    where.className = 'where';
    where.textContent = item.file ? `${item.file}:${item.line ?? '?'}` : item.id;
    box.appendChild(where);

    if (item.comment) {
      const said = document.createElement('p');
      said.className = 'said';
      said.textContent = item.comment;
      box.appendChild(said);
    }

    if (item.agentNote) {
      const note = document.createElement('p');
      note.className = 'agent';
      note.textContent = item.agentNote;
      box.appendChild(note);
    }

    // Confirmation is yours. The agent can say it finished; only you can say it
    // is done, and nothing leaves `working/` until you do.
    if (item.folder === 'working') {
      const acts = document.createElement('div');
      acts.className = 'acts';
      const yes = document.createElement('button');
      yes.type = 'button';
      yes.className = 'yes';
      yes.textContent = 'Yes, done';
      yes.addEventListener('click', () => void resolve(item.id, 'done'));
      const no = document.createElement('button');
      no.type = 'button';
      no.className = 'no';
      no.textContent = 'Not fixed';
      no.addEventListener('click', () => void resolve(item.id, 'reopen'));
      acts.append(yes, no);
      box.appendChild(acts);
    }

    return box;
  }

  async function resolve(id: string, action: 'done' | 'reopen'): Promise<void> {
    await fetch('/__react-dev/feedback/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    }).catch((error: unknown) => {
      console.error('[feedback] could not reach the dev server', error);
    });
    await renderList();
  }

  async function renderList(): Promise<void> {
    let items: FeedbackItem[] = [];
    try {
      const response = await fetch('/__react-dev/feedback/list');
      ({ items } = (await response.json()) as { items: FeedbackItem[] });
    } catch {
      items = [];
    }

    listPanel.replaceChildren();
    const title = document.createElement('h2');
    const open = items.filter((item) => item.folder !== 'done');
    title.textContent = `Your feedback — ${open.length} open, ${items.length - open.length} done`;
    listPanel.appendChild(title);

    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent =
        'Nothing yet. Click Feedback, click something on the page, and pick what you want.';
      listPanel.appendChild(empty);
      return;
    }

    for (const item of items) listPanel.appendChild(renderItem(item));

    const hint = document.createElement('p');
    hint.className = 'empty';
    hint.textContent =
      'Nothing is deleted. An entry only becomes done when you confirm it, and the agent never reads done ones again.';
    listPanel.appendChild(hint);
  }

  async function sendIntent(intent: string): Promise<void> {
    const target = pending;
    if (!target) return;
    const comment = note.value.trim();
    closePanel();

    const source = resolveSource(target);
    await send({
      ts: new Date().toISOString(),
      intent,
      comment: comment || null,
      file: source?.file ?? null,
      line: source?.line ?? null,
      column: source?.column ?? null,
      component: source?.component ?? null,
      selector: cssPath(target),
      // `||` not `??`: an empty string should become null, and TS 5.9's DOM lib
      // types textContent as non-nullable so `?.` would be dead code.
      text: target.textContent.trim().slice(0, 140) || null,
      computedStyles: relevantStyles(target),
      route: window.location.pathname,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    });

    pickButton.textContent = 'Sent ✓';
    window.setTimeout(() => setPicking(false), 1200);
    if (!listPanel.hidden) await renderList();
  }

  const inboxButton = shadow.getElementById('inbox') as HTMLButtonElement;
  inboxButton.addEventListener('click', () => {
    const next = listPanel.hidden;
    listPanel.hidden = !next;
    inboxButton.dataset['active'] = String(next);
    if (next) void renderList();
  });

  mountComponentOverlay(shadow.querySelector('.bar') as HTMLElement, shadow);

  pickButton.addEventListener('click', () => {
    closePanel();
    setPicking(!picking);
  });
  (shadow.getElementById('cancel') as HTMLButtonElement).addEventListener('click', closePanel);
  for (const button of shadow.querySelectorAll<HTMLButtonElement>('[data-intent]')) {
    button.addEventListener('click', () => void sendIntent(button.dataset['intent'] ?? 'fix'));
  }
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closePanel();
    setPicking(false);
  });
}
