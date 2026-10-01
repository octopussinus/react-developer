import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './config/i18n';
import { initTheme } from './lib/theme';
import { Providers } from './app/providers';
import { AppRouter } from './app/router';

// Before render, so there is no flash of the wrong scheme.
initTheme();

const container = document.getElementById('root');
if (!container) throw new Error('#root not found in index.html');

/**
 * Mocks start BEFORE render, otherwise the first queries race the worker and
 * fire against the real network. Dev only, and opt-out via
 * VITE_ENABLE_MOCKS=false once a real API exists.
 */
async function enableMocks(): Promise<void> {
  if (!import.meta.env.DEV) return;
  if (import.meta.env['VITE_ENABLE_MOCKS'] === 'false') return;
  const { startMockWorker } = await import('./testing/mocks/browser');
  await startMockWorker();
}

await enableMocks();

createRoot(container).render(
  <StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </StrictMode>,
);

// Dev-only feedback toolbar: click an element, describe what is wrong, and the
// agent receives file:line + component + styles + screenshot via .ai/inbox/.
if (import.meta.env.DEV) {
  void import('./dev/feedback-toolbar').then((m) => {
    m.mountFeedbackToolbar();
  });
}
