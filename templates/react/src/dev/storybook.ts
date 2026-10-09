/**
 * The project's Storybook, from the dev toolbar.
 *
 * Storybook is where the shared components are documented in isolation, and the
 * reason nobody looks at it is that it lives at a URL you have to remember, on a
 * server you have to have started. One button, in the page, with the answer to
 * both.
 *
 * It is shown in an iframe rather than a new tab so it sits beside the app it
 * documents -- and because a new tab blocked by the browser looks like a broken
 * button. The bar still carries the real URL for when you want the tab.
 */

import { openTakeover, type Frame } from './takeover';

/**
 * Injected by vite.config.ts from `tools/dev-port.mjs` -- the same helper
 * `npm run storybook` reads, so the two cannot disagree. `typeof` because the
 * token only exists when Vite has substituted it.
 */
declare const __STORYBOOK_URL__: string;

const ID = 'react-dev-storybook';

function configuredUrl(): string {
  return typeof __STORYBOOK_URL__ === 'string' ? __STORYBOOK_URL__ : '';
}

/**
 * Is anything actually listening there?
 *
 * An iframe cannot tell you: a refused connection renders the browser's own
 * error page inside it and fires `load` like a success, so without this the
 * button shows a blank white screen and no reason for it.
 */
async function listening(at: string): Promise<boolean> {
  if (at === '') return false;
  try {
    // no-cors, so the opaque response is unreadable -- which is all this needs.
    // Only a refused connection rejects.
    await fetch(`${at}/index.json`, { mode: 'no-cors', cache: 'no-store' });
    return true;
  } catch {
    return false;
  }
}

function frame(at: string): HTMLIFrameElement {
  const element = document.createElement('iframe');
  element.src = at;
  element.title = 'Storybook';
  Object.assign(element.style, { width: '100%', height: '100%', border: '0' });
  return element;
}

function missing(at: string, recheck: () => void): HTMLDivElement {
  const box = document.createElement('div');
  Object.assign(box.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    height: '100%',
    padding: '24px',
    background: '#111827',
    color: '#f9fafb',
    font: '400 14px system-ui, sans-serif',
    textAlign: 'center',
  });

  const title = document.createElement('strong');
  title.textContent = 'Storybook is not running';

  const how = document.createElement('p');
  how.style.margin = '0';
  how.style.color = '#9ca3af';
  how.textContent = 'Start it in a second terminal, in this project:';

  const command = document.createElement('code');
  command.textContent = 'npm run storybook';
  Object.assign(command.style, {
    padding: '8px 12px',
    borderRadius: '8px',
    background: '#0b1220',
    font: '600 13px ui-monospace, monospace',
  });

  const where = document.createElement('p');
  where.style.margin = '0';
  where.style.color = '#6b7280';
  where.style.fontSize = '12px';
  where.textContent =
    at === ''
      ? 'Then reopen this; the port is this checkout’s own.'
      : `It will listen on ${at} — a port derived from this checkout, so other projects do not take it.`;

  const again = document.createElement('button');
  again.type = 'button';
  again.textContent = 'Check again';
  Object.assign(again.style, {
    border: '0',
    borderRadius: '8px',
    padding: '8px 14px',
    background: '#2563eb',
    color: '#fff',
    font: 'inherit',
    cursor: 'pointer',
  });
  again.addEventListener('click', recheck);

  box.append(title, how, command, where, again);
  return box;
}

async function render(view: Frame, at: string): Promise<void> {
  view.canvas.replaceChildren();
  view.status.textContent = 'Looking for Storybook…';

  if (!(await listening(at))) {
    view.status.textContent = 'Storybook is not running';
    view.canvas.appendChild(missing(at, () => void render(view, at)));
    return;
  }

  view.status.replaceChildren();
  view.status.append('Storybook · ');
  const link = document.createElement('a');
  link.href = at;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = at;
  link.style.color = '#93c5fd';
  view.status.appendChild(link);
  view.canvas.appendChild(frame(at));
}

let view: Frame | null = null;

/** Adds the button to the toolbar, before `before` (null appends). */
export function mountStorybook(bar: HTMLElement, before: Element | null): void {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'storybook';
  button.textContent = 'Storybook';
  button.title = "This checkout's component library, in isolation";
  bar.insertBefore(button, before);

  button.addEventListener('click', () => {
    if (view) {
      view.close();
      return;
    }
    const opened = openTakeover(ID, () => {
      view = null;
      button.dataset['active'] = 'false';
    });
    view = opened;
    button.dataset['active'] = 'true';
    void render(opened, configuredUrl());
  });
}
