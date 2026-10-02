import type { Preview } from '@storybook/react-vite';
import { setupWorker } from 'msw/browser';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { handlers } from '@/testing/mocks/handlers';
import '@/styles/index.css';

/**
 * Storybook uses the SAME handler list as dev and tests, so a story cannot show
 * data the app would never receive.
 *
 * msw-storybook-addon 3 removed the `initialize` + bare `mswLoader` pair: the
 * root entrypoint now exports only a CSF Next addon, and CSF 3 projects import
 * `mswLoader` from `/csf3`, where it is a FACTORY taking the worker setup.
 *
 * The setup is supplied rather than defaulted because the addon's own default
 * passes `onUnhandledRequest`, which msw 3 renamed to `onUnhandledFrame` -- so
 * the default silently fails to configure anything.
 */
const startWorker = async () => {
  const worker = setupWorker();
  await worker.start({ onUnhandledFrame: 'bypass' });
  return worker;
};

/**
 * Dark mode is the `.dark` class (shadcn's convention), so the toolbar toggles
 * that class rather than emulating a media query.
 */
const preview: Preview = {
  loaders: [mswLoader(startWorker)],
  parameters: {
    controls: { expanded: true },
    backgrounds: { disable: true },
    msw: { handlers },
  },
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.classList.toggle('dark', context.globals['theme'] === 'dark');
      return Story();
    },
  ],
};

export default preview;
