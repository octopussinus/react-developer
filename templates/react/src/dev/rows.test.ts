import { describe, expect, it } from 'vitest';
import { renderChoices } from './rows';

/**
 * The legend used to carry its explanations in `title` attributes, which is the
 * same as not having them: a native tooltip needs a mouse, waits a second, and
 * vanishes while you read the thing it describes. Nobody ever learned what
 * "New, placed as shared" meant from one.
 */

function setup(): { rows: HTMLDivElement; explain: HTMLParagraphElement } {
  const rows = document.createElement('div');
  const explain = document.createElement('p');
  explain.hidden = true;
  return { rows, explain };
}

describe('renderChoices', () => {
  it('gives every row an (i) that reveals what that row means', () => {
    const { rows, explain } = setup();
    renderChoices(
      rows,
      [
        { label: 'Reused', explains: 'Green. Already existed.' },
        { label: 'New here', explains: 'Blue. Written on this branch.' },
      ],
      explain,
    );

    const infos = rows.querySelectorAll<HTMLButtonElement>('button.info');
    expect(infos).toHaveLength(2);
    expect(explain.hidden).toBe(true);

    infos[1]?.click();
    expect(explain.hidden).toBe(false);
    expect(explain.textContent).toBe('Blue. Written on this branch.');

    // Readable without a mouse: the same text on focus, and a label that says
    // which row the (i) belongs to.
    expect(infos[0]?.getAttribute('aria-label')).toBe('What "Reused" means');
    infos[0]?.dispatchEvent(new FocusEvent('focus'));
    expect(explain.textContent).toBe('Green. Already existed.');
  });

  it('shows the colour it is explaining, and marks a row that is switched off', () => {
    const { rows, explain } = setup();
    renderChoices(
      rows,
      [
        { label: 'Reused (3)', explains: 'x', color: '#10b981', off: false },
        { label: 'App shell (1)', explains: 'y', color: '#6b7280', off: true },
      ],
      explain,
    );

    const chips = [...rows.querySelectorAll<HTMLElement>('button.pick i')];
    expect(chips.map((chip) => chip.style.background)).toEqual([
      'rgb(16, 185, 129)',
      'rgb(107, 114, 128)',
    ]);
    const picks = [...rows.querySelectorAll<HTMLButtonElement>('button.pick')];
    expect(picks.map((pick) => pick.dataset['off'])).toEqual(['false', 'true']);
  });

  it('re-rendering the rows leaves the explanation on screen', () => {
    const { rows, explain } = setup();
    const choices = [{ label: 'Reused', explains: 'Green.' }];
    renderChoices(rows, choices, explain);
    rows.querySelector<HTMLButtonElement>('button.info')?.click();

    // The Dev overlay redraws its rows on every scroll event. Wiping the box the
    // user is reading from, 60 times a second, is not an explanation.
    renderChoices(rows, choices, explain);
    expect(explain.hidden).toBe(false);
    expect(explain.textContent).toBe('Green.');
  });

  it('runs the row own action, not the (i)', () => {
    const { rows, explain } = setup();
    let picked = 0;
    renderChoices(
      rows,
      [{ label: 'Hide me', explains: 'z', onPick: () => (picked += 1) }],
      explain,
    );

    rows.querySelector<HTMLButtonElement>('button.info')?.click();
    expect(picked).toBe(0);
    rows.querySelector<HTMLButtonElement>('button.pick')?.click();
    expect(picked).toBe(1);
  });
});
