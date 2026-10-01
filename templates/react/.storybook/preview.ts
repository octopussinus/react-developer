import type { Preview } from '@storybook/react-vite';
import '@/styles/index.css';

/**
 * Dark mode is the `.dark` class (shadcn's convention), so the toolbar toggles
 * that class rather than emulating a media query.
 */
const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    backgrounds: { disable: true },
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
