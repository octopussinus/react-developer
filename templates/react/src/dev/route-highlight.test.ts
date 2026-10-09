import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearMarks,
  goToRoute,
  HOP_COLORS,
  litColors,
  markNavigations,
  type Marked,
  type PageHop,
} from './route-highlight';

/**
 * This is the one place in the toolbar where a WRONG answer is plausible and
 * silent: outline four of six links and the page reads as having four. So the
 * count is asserted as hard as the drawing is.
 */

const CARD = 'src/card.tsx';
/** A route with a parameter: the interesting case for href matching. */
const DETAIL = '/dogs/:dogId';
/** A plain route, reached from more than one place on the page. */
const LIST = '/categories';
const BOX = { top: 40, left: 20, width: 120, height: 36, right: 140, bottom: 76, x: 20, y: 40 };

function stamped(source: string, into?: HTMLElement): HTMLElement {
  const element = document.createElement('a');
  element.setAttribute('data-tsd-source', source);
  // jsdom lays nothing out, and a zero-size element is deliberately not drawn.
  element.getBoundingClientRect = () => ({ ...BOX, toJSON: () => BOX });
  element.scrollIntoView = vi.fn();
  (into ?? document.getElementById('root') ?? document.body).appendChild(element);
  return element;
}

/** Markup a component drew, with something else written inside it. */
function drawnBy(source: string): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('data-tsd-source', source);
  (document.getElementById('root') ?? document.body).appendChild(element);
  return element;
}

function root(): HTMLElement {
  const element = document.createElement('div');
  element.id = 'root';
  document.body.appendChild(element);
  return element;
}

const hop = (to: string, file: string, line: number, component: string): PageHop => ({
  to,
  label: 'cta',
  component,
  file,
  line,
});

function outlines(): HTMLElement[] {
  return [...(document.getElementById('react-dev-route-marks')?.children ?? [])] as HTMLElement[];
}

afterEach(() => {
  clearMarks();
  document.body.replaceChildren();
});

describe('markNavigations', () => {
  it('outlines every element that navigates, not just the first', () => {
    root();
    // One <Link> in a list renders once per item, all from the same source line.
    const card = 'src/cards/dog-card.tsx';
    for (let i = 0; i < 3; i += 1) stamped(`/${card}:54:7`);

    const marks = markNavigations([hop(DETAIL, card, 54, 'DogCard')]);

    expect(marks[0]?.count).toBe(3);
    expect(outlines()).toHaveLength(3);
    expect(outlines()[0]?.textContent).toBe(`→ ${DETAIL}`);
  });

  it('matches whether or not the stamped path has a leading slash', () => {
    root();
    stamped('src/a.tsx:10:1');

    expect(markNavigations([hop('/x', 'src/a.tsx', 10, 'A')])[0]?.count).toBe(1);
  });

  it('counts a link that is not rendered as nothing, instead of hiding it', () => {
    root();
    stamped('/src/header.tsx:55:5');

    const marks = markNavigations([
      hop('/dogs/new', 'src/header.tsx', 55, 'Header'),
      // Inside a closed menu: real in the source, absent from the DOM.
      hop('/dogs/new', 'src/menu.tsx', 39, 'CardMenu'),
    ]);

    expect(marks.map((mark) => mark.count)).toEqual([1, 0]);
    expect(outlines()).toHaveLength(1);
  });

  it('gives one colour per destination, and never the colour of an unlit arrow', () => {
    root();
    stamped('/src/a.tsx:1:1');
    stamped('/src/b.tsx:2:1');
    stamped('/src/c.tsx:3:1');

    const marks = markNavigations([
      hop('/dogs/new', 'src/a.tsx', 1, 'A'),
      hop('/dogs/:dogId', 'src/b.tsx', 2, 'B'),
      hop('/dogs/new', 'src/c.tsx', 3, 'C'),
    ]);

    // Same destination, same colour -- that is what makes the outline on the
    // page and the arrow in the map one statement instead of two.
    expect(marks[0]?.color).toBe(marks[2]?.color);
    expect(marks[0]?.color).not.toBe(marks[1]?.color);
    // #2563eb is what the map draws an ordinary arrow in.
    expect(marks[0]?.color).not.toBe('#2563eb');
    expect(HOP_COLORS[HOP_COLORS.length - 1]).toBe('#2563eb');
  });

  it('scrolls to the first link only when it is off screen', () => {
    root();
    const onScreenScroll = vi.fn();
    stamped('/src/a.tsx:1:1').scrollIntoView = onScreenScroll;
    markNavigations([hop('/x', 'src/a.tsx', 1, 'A')]);
    expect(onScreenScroll).not.toHaveBeenCalled();

    clearMarks();
    document.body.replaceChildren();
    root();
    const belowScroll = vi.fn();
    const below = stamped('/src/b.tsx:2:1');
    below.scrollIntoView = belowScroll;
    const far = { ...BOX, top: window.innerHeight + 500 };
    below.getBoundingClientRect = () => ({ ...far, toJSON: () => far });

    markNavigations([hop('/x', 'src/b.tsx', 2, 'B')]);
    // Otherwise the outlines are correct, 700px below the fold, and the feature
    // looks broken on every page longer than the window.
    expect(belowScroll).toHaveBeenCalledTimes(1);

    // A redraw must not yank the page again.
    markNavigations([hop('/x', 'src/b.tsx', 2, 'B')]);
    expect(belowScroll).toHaveBeenCalledTimes(1);
  });

  it('finds the link by its href when the stamp was lost on the way down', () => {
    root();
    // A wrapper that destructures its props (`{ to, label }`) never passes the
    // stamp on, so NO element carries the line the map reported -- but the <a>
    // it rendered still knows where it goes.
    const tile = stamped('src/tile.tsx:26:5');
    tile.setAttribute('href', '/health/documents');
    const other = stamped('src/tile.tsx:26:5');
    other.setAttribute('href', '/health/weight?log=1');

    const marks = markNavigations([hop('/health/documents', 'src/tile.tsx', 61, 'ActionTile')]);

    expect(marks[0]?.count).toBe(1);
    expect(marks[0]?.how).toBe('element');
    expect(outlines()).toHaveLength(1);
  });

  it('follows the link into the wrapper that rendered it, but not into the nav', () => {
    root();
    const page = 'src/modules/discovery/home/home-page.tsx';
    // `<SeeAllLink to="/categories" />` on line 80 of the page. The <a> is
    // written in see-all-link.tsx, so NOTHING in the DOM carries the line the
    // map reported -- only this ancestor names the file at all.
    const drew = drawnBy(`/${page}:74:5`);
    stamped('/src/modules/discovery/home/components/see-all-link.tsx:21:5', drew).setAttribute(
      'href',
      LIST,
    );
    // The shell's own link to the same page. Outside what the page drew, so
    // claiming it would report the sidebar as this component's link.
    stamped('/src/components/organisms/sidebar-nav.tsx:79:17').setAttribute('href', LIST);

    const marks = markNavigations([hop(LIST, page, 80, 'HomePage')]);

    expect(marks[0]?.count).toBe(1);
    expect(marks[0]?.how).toBe('element');
    expect(outlines()).toHaveLength(1);
  });

  it('matches an href against a route with a parameter in it', () => {
    root();
    for (const id of ['dog-bruno', 'dog-bella']) {
      stamped(`${CARD}:74:9`).setAttribute('href', `/dogs/${id}`);
    }
    // Same prefix, one segment deeper: not this route.
    stamped(`${CARD}:74:9`).setAttribute('href', '/dogs/dog-bruno/edit');

    const marks = markNavigations([hop(DETAIL, CARD, 75, 'DogCard')]);
    expect(marks[0]?.count).toBe(2);
  });

  it('accepts a line one off, because a prop sits below its element', () => {
    root();
    // `<ActionLink` on 74, `to={…}` on 75: the stamp is the element's.
    stamped(`${CARD}:74:9`);

    const marks = markNavigations([hop('/x', CARD, 75, 'DogCard')]);
    expect(marks[0]?.count).toBe(1);
    expect(marks[0]?.how).toBe('element');
  });

  it('says nothing is on screen rather than outlining the whole component', () => {
    root();
    // RecentActivity is rendered, but the link the map reported is inside a row
    // this data never produced. Outlining the component instead claimed a link
    // that is not there -- a box round the page, labelled with a page it cannot
    // reach from here.
    const outer = stamped('src/activity.tsx:107:13');
    outer.setAttribute('href', 'https://files.example/doc.pdf');

    const marks = markNavigations([hop(DETAIL, 'src/activity.tsx', 48, 'RecentActivity')]);

    expect(marks[0]?.how).toBe('absent');
    expect(marks[0]?.count).toBe(0);
    expect(outlines()).toHaveLength(0);
  });

  it('leaves nothing behind when cleared', () => {
    root();
    stamped('/src/a.tsx:1:1');
    markNavigations([hop('/x', 'src/a.tsx', 1, 'A')]);
    expect(document.getElementById('react-dev-route-marks')).not.toBeNull();

    clearMarks();
    expect(document.getElementById('react-dev-route-marks')).toBeNull();
  });
});

describe('litColors', () => {
  it('lights only the arrows that have an outline on the page to pair with', () => {
    const marked = (to: string, color: string, count: number): Marked => ({
      hop: hop(to, 'src/a.tsx', 1, 'A'),
      color,
      count,
      how: count > 0 ? 'element' : 'absent',
    });

    const lit = litColors([
      marked(LIST, '#db2777', 1),
      // In the code, not on the screen: the report says so in words, and a lit
      // arrow beside it would promise an outline that is not there.
      marked('/welcome', '#0891b2', 0),
    ]);

    expect(lit.get(LIST)).toBe('#db2777');
    expect(lit.has('/welcome')).toBe(false);
  });
});

describe('goToRoute', () => {
  it('drives the router from outside React, and says where it actually went', () => {
    const seen: string[] = [];
    const listener = (): void => {
      seen.push(window.location.pathname);
    };
    window.addEventListener('popstate', listener);

    try {
      expect(goToRoute('/dogs')).toBe('/dogs');
      // A route with parameters cannot be visited as written.
      expect(goToRoute('/dogs/:dogId/edit')).toBe('/dogs/1/edit');
      // pushState alone is silent; the popstate is what React Router listens to.
      expect(seen).toEqual(['/dogs', '/dogs/1/edit']);
    } finally {
      window.removeEventListener('popstate', listener);
    }
  });
});
