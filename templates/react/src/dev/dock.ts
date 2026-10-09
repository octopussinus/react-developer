/**
 * Where every dev-toolbar panel goes.
 *
 * Each panel used to pin itself to `bottom: 60px; right: 16px`, so opening a
 * second one put it exactly on top of the first: the feedback list covered the
 * form, the theme menu covered the list, and the only way to read one was to
 * close the others. They are different views of the same page, so the useful
 * arrangement is side by side.
 *
 * So no panel positions itself any more. The dock is a single flex row laid out
 * right-to-left from the toolbar, and a hidden panel takes no space in it --
 * which means the open ones are always flush against each other with nothing
 * to place by hand, however many there are.
 */

/**
 * Inserted into the toolbar's shadow stylesheet, ahead of the panel rules, so a
 * panel can still override `max-height` for itself.
 */
export const DOCK_CSS = `
  .dock { position: fixed; bottom: 60px; right: 16px; z-index: 2147483647;
          max-width: calc(100vw - 32px); display: flex; flex-direction: row-reverse;
          /* wrap-reverse flips the cross axis, which does two things: a row that
             runs out of width continues ABOVE this one rather than off the left
             edge, and align-items: flex-start means the BOTTOM of the row -- so
             panels of different heights still line up along the toolbar. */
          flex-wrap: wrap-reverse; align-items: flex-start;
          gap: 10px;
          /* On a window too narrow to tile them the rows would keep stacking
             past the top of the screen, and the one off the top edge is the one
             just opened. Bounded and scrollable instead: wrap-reverse puts the
             newest row at the start of the scroll area, so it is the one you
             see, and the older ones are a scroll away rather than unreachable. */
          max-height: calc(100vh - 76px); overflow-y: auto;
          overscroll-behavior: contain;
          pointer-events: none; }
  /* The row itself spans the viewport, so only the panels may take clicks. */
  .dock > * { pointer-events: auto; flex: none;
              max-height: calc(100vh - 92px); overflow: auto; }
`;

export interface Dock {
  /** Register a panel. It moves into the dock and starts closed. */
  add(panel: HTMLElement): void;
  open(panel: HTMLElement): void;
  close(panel: HTMLElement): void;
  isOpen(panel: HTMLElement): boolean;
  /** @returns whether it is now open -- for the button's active state. */
  toggle(panel: HTMLElement): boolean;
}

export function createDock(shadow: ShadowRoot): Dock {
  const row = document.createElement('div');
  row.className = 'dock';
  shadow.appendChild(row);

  const isOpen = (panel: HTMLElement): boolean => !panel.hidden;

  function open(panel: HTMLElement): void {
    // The last child is the FAR LEFT one in a reversed row. Re-appending on
    // every open is what keeps the panels that are already open where the user
    // last saw them: the new one arrives beside them, not in front of them.
    row.appendChild(panel);
    panel.hidden = false;
  }

  function close(panel: HTMLElement): void {
    panel.hidden = true;
  }

  return {
    add(panel) {
      panel.hidden = true;
      row.appendChild(panel);
    },
    open,
    close,
    isOpen,
    toggle(panel) {
      const next = !isOpen(panel);
      if (next) open(panel);
      else close(panel);
      return next;
    },
  };
}
