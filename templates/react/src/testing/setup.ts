import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// The app validates env at import time, so tests need it present and valid.
vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
vi.stubEnv('VITE_API_TIMEOUT_MS', '5000');

beforeAll(() => {
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
});
