import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openSidePanel, openTakeover } from './takeover';

/**
 * The side panel's whole claim is that the app stays usable beside it. That is
 * one property -- the app gives up exactly as much width as the panel takes, and
 * gets it back on close -- and these pin it.
 */

const WIDTH_KEY = 'react-dev:side-panel-width';

function root(): HTMLElement {
  const element = document.createElement('div');
  element.id = 'root';
  document.body.appendChild(element);
  return element;
}

/** jsdom has no PointerEvent and no setPointerCapture. */
function drag(panel: HTMLElement, to: number): void {
  const grip = panel.querySelector<HTMLElement>('div[title="Drag to resize"]');
  if (!grip) throw new Error('no resize grip');
  grip.setPointerCapture = () => undefined;
  grip.dispatchEvent(new MouseEvent('pointerdown', { clientX: 500, bubbles: true }));
  grip.dispatchEvent(new MouseEvent('pointermove', { clientX: to, bubbles: true }));
  grip.dispatchEvent(new MouseEvent('pointerup', { clientX: to, bubbles: true }));
}

beforeEach(() => {
  localStorage.removeItem(WIDTH_KEY);
});

afterEach(() => {
  document.body.replaceChildren();
  localStorage.removeItem(WIDTH_KEY);
});

describe('openSidePanel', () => {
  it('takes half the screen and gives the app the other half', () => {
    const page = root();
    const frame = openSidePanel('panel');
    const host = document.getElementById('panel');

    const half = `${String(Math.round(window.innerWidth / 2))}px`;
    expect(host?.style.width).toBe(half);
    // Not an overlay: the app is narrower, so nothing of it is hidden under the
    // panel -- which is what the outlines on the page depend on.
    expect(page.style.marginRight).toBe(half);

    frame.close();
    expect(page.style.marginRight).toBe('');
  });

  it('resizes by the grip, and remembers the width for next time', () => {
    const page = root();
    openSidePanel('panel');
    const host = document.getElementById('panel');

    drag(host as HTMLElement, window.innerWidth - 700);

    expect(host?.style.width).toBe('700px');
    expect(page.style.marginRight).toBe('700px');
    expect(localStorage.getItem(WIDTH_KEY)).toBe('700');
  });

  it('always leaves room for the app, however far you drag', () => {
    root();
    openSidePanel('panel');
    const host = document.getElementById('panel') as HTMLElement;

    drag(host, 0);

    // A dock wide enough to hide the app is not a split view, it is a cover.
    expect(Number.parseInt(host.style.width, 10)).toBe(window.innerWidth - 280);
  });

  it('restores a width it was given last time, clamped to this window', () => {
    root();
    localStorage.setItem(WIDTH_KEY, '640');
    openSidePanel('panel');
    expect(document.getElementById('panel')?.style.width).toBe('640px');

    document.getElementById('panel')?.remove();
    localStorage.setItem(WIDTH_KEY, '99999');
    openSidePanel('panel2');
    expect(Number.parseInt(document.getElementById('panel2')?.style.width ?? '', 10)).toBe(
      window.innerWidth - 280,
    );
  });

  it('only takes Esc when the focus is inside it', () => {
    root();
    openSidePanel('panel');

    // The app is live beside the panel, and Esc there belongs to whatever dialog
    // the user just opened. Closing the map from under them would make Esc
    // unusable in both halves.
    document.body.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('panel')).not.toBeNull();

    const inside = document.createElement('button');
    document.getElementById('panel')?.appendChild(inside);
    inside.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('panel')).toBeNull();
  });
});

describe('openTakeover', () => {
  it('covers the screen and leaves the app layout alone', () => {
    const page = root();
    const frame = openTakeover('full');

    expect(document.getElementById('full')?.style.inset).toBe('0');
    expect(page.style.marginRight).toBe('');

    // Esc anywhere, here: there is nothing else on screen to take it.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('full')).toBeNull();
    frame.close();
  });
});
