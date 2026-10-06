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
export function devPort() {
  const override = env['PORT'] ?? env['PW_PORT'];
  if (override !== undefined && override !== '') {
    const parsed = Number.parseInt(override, 10);
    if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) return parsed;
  }
  const digest = createHash('sha256').update(cwd()).digest();
  return 20000 + (digest.readUInt16BE(0) % 10000);
}

export function devUrl() {
  return `http://localhost:${String(devPort())}`;
}
