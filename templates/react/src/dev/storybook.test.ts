import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountStorybook } from './storybook';

/**
 * The failure this guards against is a blank white screen: an iframe pointed at
 * a Storybook nobody started renders the browser's own error page and fires
 * `load` like a success, so the button looks broken and says nothing.
 */

const ID = 'react-dev-storybook';

function toolbar(): { bar: HTMLDivElement; next: HTMLButtonElement } {
  const bar = document.createElement('div');
  const next = document.createElement('button');
  next.id = 'list';
  bar.appendChild(next);
  document.body.appendChild(bar);
  return { bar, next };
}

function press(label: string): void {
  const host = document.getElementById(ID);
  const button = [...(host?.querySelectorAll('button') ?? [])].find(
    (candidate) => candidate.textContent === label,
  );
  button?.click();
}

afterEach(() => {
  press('Close (Esc)');
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('mountStorybook', () => {
  it('puts its button where it was asked to, not at the end of the bar', () => {
    const { bar, next } = toolbar();
    mountStorybook(bar, next);

    expect([...bar.children].map((child) => child.id)).toEqual(['storybook', 'list']);
  });

  it('says it is not running, and names the command that starts it', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('ECONNREFUSED')));
    const { bar, next } = toolbar();
    mountStorybook(bar, next);

    bar.querySelector<HTMLButtonElement>('#storybook')?.click();

    await vi.waitFor(() => {
      const host = document.getElementById(ID);
      expect(host?.textContent).toContain('Storybook is not running');
    });
    const host = document.getElementById(ID);
    expect(host?.querySelector('code')?.textContent).toBe('npm run storybook');
    // No iframe: a blank frame is exactly the thing being avoided.
    expect(host?.querySelector('iframe')).toBeNull();
  });

  it('frames the real Storybook once something answers there', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 200 })));
    const { bar, next } = toolbar();
    mountStorybook(bar, next);

    bar.querySelector<HTMLButtonElement>('#storybook')?.click();

    await vi.waitFor(() => {
      expect(document.getElementById(ID)?.querySelector('iframe')).not.toBeNull();
    });
    const host = document.getElementById(ID);
    // The port comes from this checkout, so assert the shape, not the number.
    expect(host?.querySelector('iframe')?.src).toMatch(/^http:\/\/localhost:\d+\/?$/);
    // And the bar still offers the URL, for when you want a real tab.
    expect(host?.querySelector('a')?.target).toBe('_blank');
  });

  it('closes on Esc and hands the button back', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('ECONNREFUSED')));
    const { bar, next } = toolbar();
    mountStorybook(bar, next);
    const button = bar.querySelector<HTMLButtonElement>('#storybook');

    button?.click();
    await vi.waitFor(() => {
      expect(document.getElementById(ID)).not.toBeNull();
    });
    expect(button?.dataset['active']).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById(ID)).toBeNull();
    expect(button?.dataset['active']).toBe('false');

    // Reopens: closing has to clear the singleton, or the button goes dead.
    button?.click();
    await vi.waitFor(() => {
      expect(document.getElementById(ID)).not.toBeNull();
    });
  });
});
