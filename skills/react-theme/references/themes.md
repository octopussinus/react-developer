# The three themes

## A theme is shape, not just colour

With the same radius, border and weight, every "theme" is the same app in a
different hue. The shape tokens are what make them look like different designs:

| Token | Default | Ocean | Sunset |
|---|---|---|---|
| `--radius` | 0.625rem | 0.25rem | 1rem |
| `--ui-border-width` | 1px | 1px | 2px |
| `--ui-font-weight` | 500 | 450 | 650 |
| `--ui-shadow` | subtle | none | pronounced |

Override those plus the brand colours, and **nothing else** — copying all 34
variables per theme gives four places to change one neutral, and they drift
apart within a month.

**Never override the chart palette per theme.** It is validated for colourblind
separation and contrast; re-picking it by eye throws that away. A theme that
truly needs different chart hues re-runs the validator.

Selectors are `:root[data-theme='name']`, not `[data-theme='name']` — equal
specificity with `:root` plus `@import` having to come first means the plain
form silently changes nothing in light mode.

Switch while developing with the **Theme** and **language** buttons in the dev
toolbar; nothing has to be built into the product for that.



## The specificity trap — why light and dark must cover the same tokens

Selectors are `:root[data-theme='x']`, which is (0,2,0). The base dark block is
`.dark`, which is (0,1,0). So a colour a theme sets in its **light** block and
forgets in its **dark** block wins over `.dark` and leaks the light value into
dark mode. Confirmed in a browser, not assumed: a probe theme overriding
`--card` in light alone rendered that light value with `.dark` active.

The specificity itself is not optional. `@import` has to come first in a CSS
file, so a plain `[data-theme='x']` ties with `:root` on specificity and loses on
source order — the themes then change nothing in light mode, silently.

Lowering the base to `:root.dark` would even the scores, but it would also
outrank the `cssVars` that shadcn registry items inject into `.dark`, breaking
their dark variants on install. Not worth it.

So the rule is mechanical instead: **every colour token a theme sets in light, it
must also set in dark.** A test enforces it and prints which tokens are missing
from which side. Shape tokens (`--radius`, `--ui-*`) are exempt — they belong to
the theme, not the colour scheme, so setting them once is correct.
