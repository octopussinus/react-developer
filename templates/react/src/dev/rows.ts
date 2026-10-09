/**
 * A column of choices where each one has an (i) that says what it means.
 *
 * The feedback form already worked this way: five intents nobody can rank
 * without being told what the agent will do with each. The Dev overlay had the
 * same problem and no answer for it -- "New, placed as shared" and a purple box
 * mean nothing until someone says why you would care -- so the two share one
 * control rather than growing two that drift apart.
 *
 * The explanation lands in a box inside the panel, not in a `title` tooltip: a
 * native tooltip needs a mouse, waits a second, and disappears while you read
 * the thing it describes.
 */

export interface Choice {
  label: string;
  /** What this row means, in full. Shown in the panel's explain box. */
  explains: string;
  /** Colour chip before the label, where the colour is the point. */
  color?: string;
  /** Struck through: chosen, and currently switched off. */
  off?: boolean;
  onPick?: () => void;
}

/** Shared by every panel that renders choices. See DOCK_CSS for placement. */
export const ROWS_CSS = `
  .rows { display: flex; flex-direction: column; gap: 6px; }
  .rows .row { display: flex; align-items: stretch; gap: 4px; }
  .rows button.pick { flex: 1; display: flex; align-items: center; gap: 8px;
                      text-align: left; background: #1f2937; font: inherit; }
  .rows button.pick:hover, .rows button.pick:focus-visible { background: #2563eb; }
  .rows button.pick[data-off="true"] { opacity: .45; text-decoration: line-through; }
  .rows button.pick i { width: 10px; height: 10px; border-radius: 3px; flex: none; }
  .rows button.info { width: 28px; padding: 0; background: #1f2937; color: #9ca3af;
                      font: 600 12px system-ui, sans-serif; }
  .rows button.info:hover, .rows button.info:focus-visible {
    background: #374151; color: #f9fafb; }
  .explain { margin: 8px 0 0; padding: 7px 8px; border-radius: 6px; background: #0b1220;
             font-size: 11px; line-height: 1.45; color: #cbd5e1; }
  .explain[hidden] { display: none; }
`;

/**
 * Replaces `into`'s contents with one row per choice. `explain` is the box the
 * (i) buttons write into; it lives outside `into` so that re-rendering the rows
 * does not wipe the explanation the user is in the middle of reading.
 */
export function renderChoices(
  into: HTMLElement,
  choices: readonly Choice[],
  explain: HTMLElement,
): void {
  into.classList.add('rows');
  into.replaceChildren();

  for (const choice of choices) {
    const row = document.createElement('div');
    row.className = 'row';

    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'pick';
    if (choice.off !== undefined) pick.dataset['off'] = String(choice.off);
    if (choice.color !== undefined) {
      const chip = document.createElement('i');
      chip.style.background = choice.color;
      pick.appendChild(chip);
    }
    const text = document.createElement('span');
    text.textContent = choice.label;
    pick.appendChild(text);
    if (choice.onPick) pick.addEventListener('click', choice.onPick);

    const info = document.createElement('button');
    info.type = 'button';
    info.className = 'info';
    info.textContent = 'i';
    info.setAttribute('aria-label', `What "${choice.label}" means`);
    // Click as well as hover: a tooltip you have to keep hovering is unreadable
    // on a touch screen and annoying with a trackpad.
    const show = (): void => {
      explain.textContent = choice.explains;
      explain.hidden = false;
    };
    info.addEventListener('click', show);
    info.addEventListener('mouseenter', show);
    info.addEventListener('focus', show);

    row.append(pick, info);
    into.appendChild(row);
  }
}
