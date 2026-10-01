import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Node-side mock server for Vitest. Started in src/testing/setup.ts.
 *
 * `onUnhandledFrame: 'error'` on purpose: in a test, a request nobody mocked
 * is a bug in the test, and failing loudly beats a silent real network call.
 * The browser worker uses 'bypass' instead -- see browser.ts.
 */
export const server = setupServer(...handlers);

/*
 * MSW 3 renamed `onUnhandledRequest` to `onUnhandledFrame` -- v3 intercepts
 * WebSocket frames too, not only HTTP requests. Guides written for v2 still use
 * the old name and will fail to typecheck.
 */

/**
 * Override a handler for one test. Use for the unhappy paths the default
 * handlers deliberately do not cover:
 *
 *   it('shows the error state', async () => {
 *     server.use(http.get('/orders', () => HttpResponse.json(null, { status: 500 })));
 *     ...
 *   });
 *
 * `setup.ts` resets handlers after every test, so an override cannot leak.
 */
