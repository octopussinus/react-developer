import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// The app validates env at import time, so tests need it present and valid.
vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
vi.stubEnv('VITE_API_TIMEOUT_MS', '5000');

beforeAll(() => {
  // 'error' means an unmocked request fails the test rather than silently
  // reaching the network. A missing handler is a bug in the test.
  server.listen({ onUnhandledFrame: 'error' });

  // jsdom implements neither, and components that read them would otherwise throw.
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  // Reset per-test overrides so one test cannot leak into the next.
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
