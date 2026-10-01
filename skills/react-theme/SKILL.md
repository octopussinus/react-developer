---
name: react-theme
description: Add or change design tokens - colours, spacing, radii, typography - in the Tailwind v4 @theme layer. Use when the user wants to restyle, add a brand colour, or when a skill reported a missing token.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Theme

Tokens live in one place and both platforms read them. Components reference
roles, never raw values — which is what makes dark mode and rebranding a
one-file change instead of a sweep through 200 components.

## Token model

Two layers, and the distinction is the whole point:

```css
/* src/styles/index.css */
@theme {
  /* 1. palette — raw ramps, never used directly in components */
  --color-brand-50: oklch(97% 0.02 264);
  --color-brand-500: oklch(62% 0.19 264);
  --color-brand-900: oklch(32% 0.12 264);

  /* 2. roles — what components actually reference */
  --color-background: var(--color-white);
  --color-foreground: var(--color-brand-900);
  --color-surface: var(--color-white);
  --color-muted-foreground: oklch(55% 0.01 264);
  --color-status-warning: oklch(75% 0.17 70);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { /* role overrides only */ }
}
:root[data-theme='dark'] { /* same overrides */ }
```

A component says `bg-surface text-foreground`. It never says `bg-brand-500` and
never says `bg-white dark:bg-gray-800`.

## Procedure

1. Read the current `@theme` block and list the existing roles. Reuse before
   adding — most "missing" tokens are an existing role under another name.
2. Add palette ramps in OKLCH (Tailwind v4's native space; it interpolates
   cleanly and keeps perceived lightness consistent across hues).
3. Map roles for **both** schemes. A role defined in light only is a dark-mode
   bug waiting to happen.
4. **Check contrast.** Every foreground/background pair used for text must meet
   WCAG AA (4.5:1 normal, 3:1 large). State the computed ratios — do not
   eyeball them.
5. Verify: `npm run verify`, then look at Storybook in both schemes.

## Hard rules

- NEVER reference a palette ramp from a component. Roles only.
- NEVER use `dark:` variants for colour. The role already changed.
- NEVER ship a pair below AA. Adjust the token, not the rule.

## Report

Tokens added or changed, both schemes, the contrast ratios, and which
components now pick up the change for free.
