const { readFileSync } = require('node:fs');
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

/**
 * The named themes come from the web app (`npm run port` writes them), so they
 * are read here rather than listed -- a theme added on the web reaches the
 * phone by re-running the port, not by remembering to edit this file.
 */
const { extraThemes } = JSON.parse(readFileSync(`${__dirname}/src/styles/themes.json`, 'utf8'));

const config = getDefaultConfig(__dirname);

// Parallel port workers' checkouts (`react-dev dispatch`) are whole copies of
// this app, node_modules included: never something to bundle or watch.
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`${__dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\.worktrees/.*`),
];

// withUniwindConfig must stay the OUTERMOST wrapper (Uniwind's own rule).
module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
  extraThemes,
});
