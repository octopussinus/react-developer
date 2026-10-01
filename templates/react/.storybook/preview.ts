import type { Preview } from '@storybook/react-vite';
import '@/styles/index.css';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    // Dark is a first-class scheme, so review both.
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset['theme'] = context.globals['theme'] as string;
      return Story();
    },
  ],
};

export default preview;
