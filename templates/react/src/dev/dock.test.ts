import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createDock, type Dock } from './dock';

/**
 * The bug: every dev panel pinned itself to `bottom: 60px; right: 16px`, so the
 * feedback list opened exactly on top of the feedback form, the theme menu on
 * top of the list, and the one you had just opened hid the one you were reading.
 */

/** A dock in its own shadow root, plus the row element to assert against. */
function dockIn(): Dock & { row: HTMLElement } {
  const shadow = document.createElement('div').attachShadow({ mode: 'open' });
  return { ...createDock(shadow), row: shadow.querySelector('.dock') as HTMLElement };
}

function panel(name: string): HTMLElement {
  const element = document.createElement('div');
  element.className = name;
  return element;
}

describe('createDock', () => {
  it('keeps two open panels side by side instead of one over the other', () => {
    const dock = dockIn();
    const list = panel('list');
    const form = panel('panel');
    dock.add(list);
    dock.add(form);

    dock.open(list);
    dock.open(form);

    // Both visible, both laid out by the same flex row -- which is what makes
    // them siblings in a line rather than two stacked fixed-position boxes.
    expect([list.hidden, form.hidden]).toEqual([false, false]);
    expect(list.parentElement).toBe(dock.row);
    expect(form.parentElement).toBe(dock.row);
    expect(list.contains(form) || form.contains(list)).toBe(false);
  });

  it('puts the newly opened panel at the end, so the open ones do not move', () => {
    const dock = dockIn();
    const list = panel('list');
    const menu = panel('switch-menu');
    dock.add(list);
    dock.add(menu);

    dock.open(list);
    dock.open(menu);

    // The row is `row-reverse`: last child is the LEFTMOST one. The panel the
    // user was already reading therefore keeps the spot it was in.
    expect([...dock.row.children].indexOf(list)).toBeLessThan([...dock.row.children].indexOf(menu));

    // Re-opening moves to the end again; nothing else is disturbed.
    dock.close(list);
    dock.open(list);
    expect(dock.row.lastElementChild).toBe(list);
    expect(menu.hidden).toBe(false);
  });

  it('reports the state a toggle landed on, for the button that owns it', () => {
    const dock = dockIn();
    const menu = panel('switch-menu');
    dock.add(menu);

    expect(menu.hidden).toBe(true);
    expect(dock.toggle(menu)).toBe(true);
    expect(dock.isOpen(menu)).toBe(true);
    expect(dock.toggle(menu)).toBe(false);
    expect(menu.hidden).toBe(true);
  });
});

/**
 * The dock only works while it is the ONLY thing placing panels. A panel that
 * takes itself out of the flow goes straight back to covering its neighbours,
 * and nothing about the page would look broken until two are open at once.
 */
describe('the toolbar stylesheet', () => {
  it('positions nothing by hand except the toolbar and the full-page layers', () => {
    const css = ['./feedback-toolbar.tsx', './dock.ts']
      .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
      .join('\n');

    const anchored = new Set<string>();
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!body?.includes('position: fixed')) continue;
      anchored.add((selector?.trim().split('\n').pop() ?? '').trim());
    }

    expect([...anchored].sort()).toEqual(
      // .bar is the toolbar; .ring/.overlay/.mark cover the page on purpose.
      // Anything else belongs in the dock -- add it there, not here.
      ['.bar', '.dock', '.mark', '.overlay', '.ring'],
    );
  });
});
