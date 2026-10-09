import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { classify } from './classify.mjs';

const DONE = new Set(['done', 'unstamped']);

/**
 * Which translations can be done RIGHT NOW, independently of each other.
 *
 * A file is on the frontier when everything it imports is already native: a
 * worker can then translate it, type-check it and run it without waiting for
 * anyone. Two frontier files never depend on each other, which is what lets
 * `react-dev dispatch` hand them to separate agents at the same time. When a
 * wave lands and the port runs, the next frontier opens up.
 *
 * Grouped by module, so one worker gets one area of the app and reads its
 * neighbours' context once, not a scattering of unrelated files.
 */
export function planWork({ webRoot, nativeRoot }) {
  const { entries, ready } = classify({ webRoot, nativeRoot });
  const work = [...entries.values()].filter(
    (entry) => entry.status === 'translate' && !entry.isTest && !DONE.has(entry.nativeState),
  );
  const waitingOn = (entry) =>
    entry.deps.filter((dep) => dep.target !== entry.rel && !ready(dep.target));

  let frontier = work.filter((entry) => waitingOn(entry).length === 0);
  let cycle = false;
  if (frontier.length === 0 && work.length > 0) {
    // Everything left waits on something else that is left: an import cycle.
    // Hand the least-tangled files to ONE worker, which can do both sides.
    const pending = new Set(work.map((entry) => entry.rel));
    const internal = work.filter((entry) =>
      waitingOn(entry).every((dep) => pending.has(dep.target)),
    );
    const fewest = Math.min(...internal.map((entry) => waitingOn(entry).length));
    frontier = internal.filter((entry) => waitingOn(entry).length === fewest);
    cycle = frontier.length > 0;
  }

  // How much each file holds back: everything that imports it, directly or
  // through files that are themselves waiting. The wave takes the files that
  // unlock most first -- one locale helper can hold back hundreds of copies.
  const importers = new Map();
  for (const entry of entries.values())
    for (const dep of entry.deps) {
      if (!importers.has(dep.target)) importers.set(dep.target, new Set());
      importers.get(dep.target).add(entry.rel);
    }
  const unlocks = (rel) => {
    const seen = new Set();
    const queue = [rel];
    while (queue.length > 0) {
      for (const user of importers.get(queue.pop()) ?? []) {
        const status = entries.get(user)?.status;
        if (seen.has(user) || (status !== 'blocked' && status !== 'translate')) continue;
        seen.add(user);
        queue.push(user);
      }
    }
    return seen.size;
  };

  const item = (entry) => ({
    web: entry.rel,
    native: entry.native,
    state: entry.nativeState,
    reasons: entry.reasons,
    lines: readFileSync(join(webRoot, entry.rel), 'utf8').split('\n').length,
    group: groupOf(entry.native),
    unlocks: unlocks(entry.rel),
    cycle,
  });

  return {
    frontier: frontier.map(item),
    remaining: work.length,
    blocked: [...entries.values()].filter((entry) => entry.status === 'blocked' && !entry.isTest)
      .length,
    shell: [...entries.values()].filter((entry) => entry.status === 'shell').map((e) => e.rel),
  };
}

/** `src/modules/orders/list/components/x.tsx` -> `modules/orders/list`. */
export function groupOf(rel) {
  const parts = rel.split('/');
  if (parts[1] === 'modules') return parts.slice(1, 4).join('/');
  if (parts[1] === 'components') return parts.slice(1, 3).join('/');
  return dirname(rel).replace(/^src\//, '');
}
