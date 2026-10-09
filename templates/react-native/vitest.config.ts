import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Vitest runs the code copied from the web app -- logic, data, mocks -- with
 * the web app's own tests, in Node, exactly as it ran there. Native UI is
 * tested by Jest (jest-expo), in `*.native.test.tsx` files.
 *
 * Why two runners: the copied tests are written for Vitest and run unchanged
 * here, which is the cheapest proof the copied code still behaves. Jest with
 * jest-expo is what Expo supports for React Native components.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  // React Native's dev flag, which the port writes for Vite's import.meta.env.DEV.
  define: { __DEV__: 'true' },
  resolve: {
    // Order matters: the specific `@/platform/icons` before the general `@`.
    alias: [
      // `npm run port` points copied files' lucide-react imports at the
      // generated @/platform/icons (lucide-react-native + Uniwind). Under Vitest
      // -- jsdom, no React Native -- they get the web package back: the copied
      // tests were written against it, and React Native's Flow source cannot
      // load in Node.
      { find: /^@\/platform\/icons$/, replacement: 'lucide-react' },
      { find: /^lucide-react-native$/, replacement: 'lucide-react' },
      // Native modules a translated platform file may import, stubbed for Node.
      {
        find: /^expo-localization$/,
        replacement: fileURLToPath(new URL('./tools/vitest/expo-localization.ts', import.meta.url)),
      },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: existsSync('src/testing/setup.ts') ? ['src/testing/setup.ts'] : [],
    include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.mjs'],
    exclude: ['**/*.native.test.{ts,tsx}', 'node_modules/**', '.worktrees/**'],
    // The copied env module validates at import time; give it this app's values.
    env: loadEnv('development', process.cwd(), 'EXPO_PUBLIC_'),
  },
});
