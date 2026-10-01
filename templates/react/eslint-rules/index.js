/**
 * Local ESLint plugin: the last rung of the feedback ladder.
 *
 * `react-feedback` promotes a correction here once it has recurred 3+ times and
 * is mechanically checkable. The plugin is wired into eslint.config.js with
 * NO rules enabled by default -- shipping an active rule nobody asked for would
 * contradict the rule that promotions are the user's call.
 *
 * To enable one, add it to the `rules` block in eslint.config.js:
 *   'local/no-raw-color': 'error',
 */

import noRawColor from './no-raw-color.js';

export default {
  rules: {
    'no-raw-color': noRawColor,
  },
};
