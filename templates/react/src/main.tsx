import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './config/i18n';
import { Providers } from './app/providers';
import { AppRouter } from './app/router';

const container = document.getElementById('root');
if (!container) throw new Error('#root not found in index.html');

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
