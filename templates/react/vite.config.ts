/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
// @ts-expect-error -- plain .mjs dev plugin, no types needed
import { feedbackPlugin } from './tools/feedback-plugin.mjs';

export default defineConfig({
  plugins: [react(), tailwindcss(), feedbackPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Prototypes under specs/ are served by the real dev server so they get the
    // project's own Tailwind build and @theme tokens -- never a CDN.
    fs: { allow: ['.'] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testing/setup.ts'],
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,stories}.{ts,tsx}', 'src/testing/**', 'src/lib/api/generated/**'],
      thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 },
    },
  },
});
