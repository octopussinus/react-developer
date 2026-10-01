import type { Preview } from '@storybook/react-vite';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { handlers } from '@/testing/mocks/handlers';
import '@/styles/index.css';

// Storybook uses the SAME handler list as dev and tests, so a story cannot show
// data the app would never receive.
initialize({ onUnhandledFrame: 'bypass' });

/**
 * Dark mode is the `.dark` class (shadcn's convention), so the toolbar toggles
 * that class rather than emulating a media query.
 */
const preview: Preview = {
  loaders: [mswLoader],
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
