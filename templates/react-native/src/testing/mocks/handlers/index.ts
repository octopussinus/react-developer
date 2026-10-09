/**
 * The ONE handler list. Composed from per-domain files, and consumed by every
 * environment: `setupWorker` in the browser (dev + Storybook) and `setupServer`
 * in Vitest.
 *
 * That single list is the point. If tests and the dev server had separate mocks
 * they would drift, and you would be testing something you never run.
 *
 * `npm run gen -- mock <feature> <Entity>` adds a domain file and registers it
 * below. Keep these as the HAPPY PATH only -- per-test overrides cover 401s,
 * 500s and empty states (see server.ts).
 */

import type { RequestHandler } from 'msw';

// react-dev:mock-handlers -- the generator inserts imports above this line

export const handlers: RequestHandler[] = [
  // react-dev:mock-list -- the generator inserts spreads above this line
];
