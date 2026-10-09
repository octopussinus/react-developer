import { createHash } from 'node:crypto';
import { cwd, env } from 'node:process';

/**
 * One dev-server port per checkout.
 *
 * Worktrees solve file collisions, not runtime ones: two checkouts still share
 * ports. With a fixed 5173 and Playwright's `reuseExistingServer`, the second
 * worktree finds the first one's server already listening and runs its whole
 * suite against the WRONG SOURCE TREE -- green, and meaningless. That is the
 * documented failure mode, not a hypothetical.
 *
 * So the port is derived from the absolute path of the checkout: stable across
 * runs (baselines and bookmarks keep working), different per worktree, and
 * needing no coordination between agents that cannot see each other.
 *
 * Range 20000-29999: above the ephemeral-port floor on Linux (32768) is riskier
 * than it looks on other platforms, and well clear of the usual dev ports.
 */
function derive(seed, overrides) {
  for (const name of overrides) {
    const override = env[name];
    if (override === undefined || override === '') continue;
    const parsed = Number.parseInt(override, 10);
    if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) return parsed;
  }
  const digest = createHash('sha256')
    .update(cwd() + seed)
    .digest();
  return 20000 + (digest.readUInt16BE(0) % 10000);
}

export function devPort() {
  return derive('', ['PORT', 'PW_PORT']);
}

export function devUrl() {
  return `http://localhost:${String(devPort())}`;
}

/**
 * Same reasoning for Storybook, one port along.
 *
 * Storybook's own default is a fixed 6006 and it does not use `strictPort`, so
 * with several checkouts on one machine -- which `react-dev dispatch` creates by
 * design -- the second `npm run storybook` either prompts or quietly lands
 * somewhere else, and the toolbar's Storybook button opens ANOTHER project's
 * component library. Looks fine; shows components that are not yours.
 */
export function storybookPort() {
  const port = derive('#storybook', ['STORYBOOK_PORT']);
  // One chance in 10000 of hashing onto this checkout's own dev port.
  if (port !== devPort()) return port;
  return port + 1 > 29999 ? 20000 : port + 1;
}

export function storybookUrl() {
  return `http://localhost:${String(storybookPort())}`;
}
