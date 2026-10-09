import { createHash } from 'node:crypto';
import { cwd, env } from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';
import { devPort, storybookPort, storybookUrl } from './dev-port.mjs';

/**
 * These ports are load-bearing: Playwright baselines, bookmarks and now the
 * toolbar's Storybook button all assume a given checkout keeps the same two
 * ports forever, and that no two checkouts share one.
 */

afterEach(() => {
  delete env['STORYBOOK_PORT'];
});

describe('devPort', () => {
  it('is still the same number this checkout has always had', () => {
    // Pinned on purpose: "tidying" the derivation moves every project's port at
    // once, and what that breaks (a visual baseline, a bookmark, a running
    // worktree) does not fail loudly -- it fails as a wrong-looking screenshot.
    const digest = createHash('sha256').update(cwd()).digest();
    expect(devPort()).toBe(20000 + (digest.readUInt16BE(0) % 10000));
  });
});

describe('storybookPort', () => {
  it('is not the dev server port', () => {
    expect(storybookPort()).not.toBe(devPort());
  });

  it('is stable, and in the same reserved range', () => {
    expect(storybookPort()).toBe(storybookPort());
    expect(storybookPort()).toBeGreaterThanOrEqual(20000);
    expect(storybookPort()).toBeLessThanOrEqual(30000);
  });

  it('is derived from this checkout, so another one cannot collide with it', () => {
    const digest = createHash('sha256').update(`${cwd()}#storybook`).digest();
    expect(storybookPort()).toBe(20000 + (digest.readUInt16BE(0) % 10000));
  });

  it('honours STORYBOOK_PORT, for anyone who needs a fixed one', () => {
    env['STORYBOOK_PORT'] = '6006';
    expect(storybookPort()).toBe(6006);
    expect(storybookUrl()).toBe('http://localhost:6006');
  });

  it('ignores a value that is not a port', () => {
    env['STORYBOOK_PORT'] = 'yes please';
    expect(storybookPort()).toBeGreaterThanOrEqual(20000);
  });
});
