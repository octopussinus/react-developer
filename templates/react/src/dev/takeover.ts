/**
 * The two frames a dev view can open in.
 *
 * `openTakeover` gives it the whole screen: right for Storybook, which is an
 * application in its own right and has nothing to say about the page behind it.
 *
 * `openSidePanel` docks it to the right half and **reflows the app into what is
 * left**, so both are usable at once. That is the difference between a map you
 * look at and a map you navigate with: the site map's whole point is "open this
 * page and show me the links out of it", which needs the page visible. An
 * overlay would have covered the half of the app it was describing.
 *
 * Deliberately NOT in the toolbar's shadow root: what goes in here brings its
 * own stylesheet (React Flow) or its own document (Storybook, in an iframe).
 */

export interface Frame {
  /** The left-hand text of the bar. Write to it; the Close button is separate. */
  status: HTMLSpanElement;
  /** Everything below the bar. A flex child, so it has a definite height. */
  canvas: HTMLDivElement;
  /** Also runs the caller's `onClose`. Safe to call twice. */
  close(): void;
}

const WIDTH_KEY = 'react-dev:side-panel-width';
const MIN_PANEL = 360;
/** Left for the app. Below this the dock is not a split view, it is a cover. */
const MIN_PAGE = 280;

/** The element the app renders into, which is what has to give up the width. */
function pageRoot(): HTMLElement {
  return document.getElementById('root') ?? document.body;
}

function chrome(host: HTMLDivElement, onClose?: () => void): Frame {
  Object.assign(host.style, {
    position: 'fixed',
    // Below the toolbar's own z-index, so the button that opened this stays
    // reachable -- pressing it again is how most people will close it.
    zIndex: '2147483646',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
  });

  const bar = document.createElement('div');
  Object.assign(bar.style, {
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    background: '#111827',
    color: '#f9fafb',
    font: '400 12px system-ui, sans-serif',
  });

  const status = document.createElement('span');
  Object.assign(status.style, { minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis' });

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close (Esc)';
  Object.assign(closeButton.style, {
    marginLeft: 'auto',
    flex: 'none',
    border: '0',
    borderRadius: '6px',
    padding: '4px 10px',
    background: '#2563eb',
    color: '#fff',
    font: 'inherit',
    cursor: 'pointer',
  });

  const canvas = document.createElement('div');
  // min-height: 0 so a flex child that holds a canvas (React Flow) can shrink
  // instead of pushing the bar off the top.
  Object.assign(canvas.style, { position: 'relative', flex: '1', minHeight: '0' });

  let closed = false;
  function close(): void {
    if (closed) return;
    closed = true;
    host.remove();
    onClose?.();
  }

  closeButton.addEventListener('click', close);
  bar.append(status, closeButton);
  host.append(bar, canvas);
  document.body.appendChild(host);

  return { status, canvas, close };
}

export function openTakeover(id: string, onClose?: () => void): Frame {
  const host = document.createElement('div');
  host.id = id;
  host.style.inset = '0';

  const frame = chrome(host, onClose);

  function onKey(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    document.removeEventListener('keydown', onKey);
    frame.close();
  }
  document.addEventListener('keydown', onKey);

  return frame;
}

function storedWidth(): number {
  const saved = Number.parseInt(localStorage.getItem(WIDTH_KEY) ?? '', 10);
  return Number.isInteger(saved) ? saved : Math.round(window.innerWidth / 2);
}

export function openSidePanel(id: string, onClose?: () => void): Frame {
  const host = document.createElement('div');
  host.id = id;
  Object.assign(host.style, {
    top: '0',
    right: '0',
    bottom: '0',
    borderLeft: '1px solid #e2e8f0',
    boxShadow: '-10px 0 30px rgb(15 23 42 / .12)',
  });

  const page = pageRoot();
  const restoreMargin = page.style.marginRight;

  function clamp(width: number): number {
    return Math.max(MIN_PANEL, Math.min(width, window.innerWidth - MIN_PAGE));
  }

  /**
   * The width we asked for, which is not the same as the width on screen.
   *
   * Everything here works from this rather than from `getBoundingClientRect`: a
   * measured width is a frame behind during a drag, and is whatever the browser
   * decided when the panel is mid-transition -- so persisting it saved the wrong
   * number and re-clamping it on a window resize drifted.
   */
  let current = clamp(storedWidth());

  function apply(width: number): void {
    current = width;
    host.style.width = `${String(width)}px`;
    // The app gives up the width rather than being covered by it. React Flow
    // watches its own container, so the graph follows without being told.
    page.style.marginRight = `${String(width)}px`;
  }

  apply(current);

  const grip = document.createElement('div');
  grip.title = 'Drag to resize';
  Object.assign(grip.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '9px',
    height: '100%',
    marginLeft: '-5px',
    cursor: 'col-resize',
    zIndex: '30',
    background: 'transparent',
  });

  let dragging = false;
  grip.addEventListener('pointerdown', (event) => {
    dragging = true;
    grip.setPointerCapture(event.pointerId);
    // Without this, dragging over the app selects its text instead.
    document.body.style.userSelect = 'none';
  });
  grip.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    apply(clamp(window.innerWidth - event.clientX));
  });
  const stop = (): void => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    localStorage.setItem(WIDTH_KEY, String(current));
  };
  grip.addEventListener('pointerup', stop);
  grip.addEventListener('pointercancel', stop);

  const onWindowResize = (): void => {
    apply(clamp(current));
  };
  window.addEventListener('resize', onWindowResize);

  const frame = chrome(host, () => {
    window.removeEventListener('resize', onWindowResize);
    document.removeEventListener('keydown', onKey);
    page.style.marginRight = restoreMargin;
    onClose?.();
  });
  host.appendChild(grip);

  function onKey(event: KeyboardEvent): void {
    // Only when the focus is in the panel. The app is live beside it, and Esc
    // there belongs to whatever dialog the user just opened -- closing the map
    // out from under them would make Esc unusable in both halves.
    if (event.key !== 'Escape' || !host.contains(document.activeElement)) return;
    frame.close();
  }
  document.addEventListener('keydown', onKey);

  return frame;
}
