import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Browser worker for local development and Storybook, so the whole frontend can
 * be built and reviewed before any backend exists.
 *
 * `onUnhandledFrame: 'bypass'` here, unlike the Node server: in a browser the
 * unmatched requests are real ones -- assets, HMR, fonts -- and they must reach
 * the network. Only start it in dev; see src/main.tsx.
 */
export const worker = setupWorker(...handlers);

export async function startMockWorker(): Promise<void> {
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: false,
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
  console.info(
    '[msw] mocking enabled. Set VITE_ENABLE_MOCKS=false in .env.local to hit the real API.',
  );
}
