import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  // addon-docs is what makes `tags: ['autodocs']` generate a docs page.
  addons: ['@storybook/addon-docs'],
  framework: '@storybook/react-vite',

  /**
   * The absolute path of the project, so a story can show where the component
   * lives ON DISK. Storybook only knows `./src/...` relative to the root, which
   * is not something you can paste into an editor or a terminal.
   */
  viteFinal(viteConfig) {
    viteConfig.define = {
      ...viteConfig.define,
      __PROJECT_ROOT__: JSON.stringify(process.cwd()),
    };
    return viteConfig;
  },
};

export default config;
