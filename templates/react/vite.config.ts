/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { devtools } from '@tanstack/devtools-vite';
// @ts-expect-error -- plain .mjs dev plugin, no types needed
import { feedbackPlugin } from './tools/feedback-plugin.mjs';
// @ts-expect-error -- plain .mjs dev plugin, no types needed
import { componentMapPlugin } from './tools/component-map-plugin.mjs';
// @ts-expect-error -- plain .mjs dev plugin, no types needed
import { routeGraphPlugin } from './tools/route-graph.mjs';
// @ts-expect-error -- plain .mjs helper, no types needed
import { devPort } from './tools/dev-port.mjs';

export default defineConfig({
  plugins: [
    /*
     * Injects `data-tsd-source="file:line:column"` onto DOM elements in dev via
     * an AST transform. Used ONLY for that attribute -- the feedback toolbar
     * reads it to report an exact source location.
     *
     * Why a dependency rather than our own Babel plugin: React 19 removed
     * `fiber._debugSource`, which is how this used to be done, so the attribute
     * has to come from a build-time transform. That is a maintained wheel; the
     * older react-dev-inspector was last published in 2024 and predates React 19.
     */
    devtools({ injectSource: { enabled: true } }),
    react(),
    tailwindcss(),
    feedbackPlugin(),
    componentMapPlugin(),
    routeGraphPlugin(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    /*
     * One port per checkout, and `strictPort` so a taken one is an ERROR.
     * Vite's default is to pick the next free port silently, which is exactly
     * how a second worktree ends up serving on 5174 while Playwright keeps
     * testing whatever still holds 5173.
     */
    port: devPort(),
    strictPort: true,
    // Prototypes under specs/ are served by the real dev server so they get the
    // project's own Tailwind build and @theme tokens -- never a CDN.
    fs: { allow: ['.'] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testing/setup.ts'],
    css: true,
    include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,stories}.{ts,tsx}', 'src/testing/**', 'src/lib/api/generated/**'],
      thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 },
    },
  },
});
