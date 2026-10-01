import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  // addon-docs is what makes `tags: ['autodocs']` generate a docs page.
  addons: ['@storybook/addon-docs'],
  framework: '@storybook/react-vite',
};

export default config;
