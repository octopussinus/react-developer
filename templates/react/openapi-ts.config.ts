import { defineConfig } from '@hey-api/openapi-ts';

/**
 * Generates types, a client and Zod schemas from the OpenAPI contract.
 *
 * This is what makes "never hand-write an API response type" enforceable: the
 * shapes come from the contract, so a guessed field name cannot compile.
 *
 * Point `input` at your real spec (a path or a URL), then run:
 *   npm run api:generate
 */
export default defineConfig({
  input: './openapi.json',
  output: {
    path: './src/lib/api/generated',
    format: 'prettier',
    lint: 'eslint',
  },
  plugins: ['@hey-api/client-fetch', 'zod'],
});
