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

interface FiberSource {
  fileName: string;
  lineNumber: number;
}

interface Fiber {
  return: Fiber | null;
  type: unknown;
  _debugSource?: FiberSource;
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

/** Walk up the fiber tree to the nearest component that has source info. */
function resolveSource(element: Element): { file: string; line: number; component: string } | null {
  let fiber = findFiber(element);
  while (fiber) {
    const source = fiber._debugSource;
    const name = componentName(fiber.type);
    if (source && name) {
      return {
        file: source.fileName.replace(`${window.location.origin}/`, '').replace(/^\/+/, ''),
        line: source.lineNumber,
        component: name,
      };
    }
    fiber = fiber._debugOwner ?? fiber.return;
  }
  return null;
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
    </style>
    <div class="bar"><button type="button" id="pick">Feedback</button></div>
    <div class="ring" id="ring" hidden></div>
  `;
  document.body.appendChild(host);

  const pickButton = shadow.getElementById('pick') as HTMLButtonElement;
  const ring = shadow.getElementById('ring') as HTMLDivElement;

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

  async function onClick(event: MouseEvent): Promise<void> {
    if (!picking || !highlighted) return;
    event.preventDefault();
    event.stopPropagation();

    const target = highlighted;
    setPicking(false);

    const comment = window.prompt('What should be improved here?');
    if (!comment) return;

    const source = resolveSource(target);
    await send({
      ts: new Date().toISOString(),
      comment,
      file: source?.file ?? null,
      line: source?.line ?? null,
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
  }

  pickButton.addEventListener('click', () => setPicking(!picking));
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', (e) => void onClick(e), true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setPicking(false);
  });
}
