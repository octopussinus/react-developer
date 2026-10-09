const { existsSync, readFileSync } = require('node:fs');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * Files copied verbatim from the web app are linted THERE, by the web app's own
 * rules -- their disable comments name plugins this app does not load, and
 * re-linting a byte-for-byte copy under different rules is noise. Everything
 * written here (translations, layouts, platform code) is linted here.
 */
const copied = existsSync('.react-dev-port.json')
  ? Object.keys(JSON.parse(readFileSync('.react-dev-port.json', 'utf8')).files ?? {})
  : [];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      '.expo/*',
      'coverage/*',
      'src/uniwind-types.d.ts',
      '.agents/**',
      // Parallel port workers' checkouts and logs (`react-dev dispatch`).
      '.worktrees/**',
      '.ai/**',
      ...copied,
    ],
  },
  {
    rules: {
      // Metro resolves `@/` through tsconfig paths; TypeScript already reports
      // a genuinely missing module.
      'import/no-unresolved': 'off',
      // Flags `i18n.use(...)` because i18next ALSO exports `use` -- calling the
      // method on the instance is i18next's documented API, not a mistake.
      'import/no-named-as-default-member': 'off',
    },
  },
  {
    files: ['tools/jest/**'],
    languageOptions: { globals: { jest: 'readonly' } },
  },
]);
