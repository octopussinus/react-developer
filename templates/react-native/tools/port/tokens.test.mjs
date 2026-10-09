import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertTokens, parseSelector, variantName } from './tokens.mjs';

function webApp(css, extra = {}) {
  const root = mkdtempSync(join(tmpdir(), 'tokens-'));
  mkdirSync(join(root, 'src/styles'), { recursive: true });
  writeFileSync(join(root, 'src/styles/index.css'), css);
  for (const [name, text] of Object.entries(extra))
    writeFileSync(join(root, 'src/styles', name), text);
  return root;
}

describe('parseSelector', () => {
  it('reads every way the web templates write a theme block', () => {
    expect(parseSelector(':root')).toEqual({ theme: 'default', scheme: 'light' });
    expect(parseSelector('.dark')).toEqual({ theme: 'default', scheme: 'dark' });
    expect(parseSelector(":root[data-theme='clay']")).toEqual({ theme: 'clay', scheme: 'light' });
    expect(parseSelector(":root[data-theme='clay'].dark")).toEqual({
      theme: 'clay',
      scheme: 'dark',
    });
    expect(parseSelector('.dark[data-theme="clay"]')).toEqual({ theme: 'clay', scheme: 'dark' });
    expect(parseSelector('.contrast')).toEqual({ theme: 'default', scheme: 'contrast' });
    // "any named theme" -- omni's High Contrast applies on top of every theme.
    expect(parseSelector(':root.contrast[data-theme]')).toEqual({ theme: '*', scheme: 'contrast' });
  });

  it('refuses shapes it cannot map rather than guessing', () => {
    expect(parseSelector('.dark .card')).toBeNull();
    expect(parseSelector('body')).toBeNull();
  });

  it('names variants the way theme.ts asks for them', () => {
    expect(variantName('default', 'dark')).toBe('dark');
    expect(variantName('clay', 'light')).toBe('clay');
    expect(variantName('clay', 'dark')).toBe('clay-dark');
  });
});

describe('convertTokens', () => {
  const root = webApp(
    `@import 'tailwindcss';
@import 'tw-animate-css';
@import './themes.css';
@custom-variant dark (&:is(.dark *));
@theme inline { --color-background: var(--background); --radius-card: var(--radius); }
:root { --background: oklch(1 0 0); --radius: 0.5rem; color-scheme: light; }
.dark { --background: oklch(0.2 0 0); }
@layer base { body { @apply bg-background; } }
`,
    {
      'themes.css': `:root[data-theme='clay'] { --background: #f5efe6; --radius: 1rem; }
:root[data-theme='clay'].dark { --background: #2b2118; }`,
    },
  );
  const result = convertTokens(root);

  it('keeps the @theme block verbatim, so utility names mean the same thing', () => {
    expect(result.css).toContain('--color-background: var(--background)');
    expect(result.css).toContain('--radius-card: var(--radius)');
  });

  it('declares every variable in every theme, merged like the cascade', () => {
    expect(result.css).toMatch(
      /@variant light \{\s+--background: oklch\(1 0 0\);\s+--radius: 0.5rem;/,
    );
    expect(result.css).toMatch(
      /@variant dark \{\s+--background: oklch\(0.2 0 0\);\s+--radius: 0.5rem;/,
    );
    // clay-dark: clay's radius, clay-dark's background.
    expect(result.css).toMatch(/@variant clay-dark \{\s+--background: #2b2118;\s+--radius: 1rem;/);
    expect(result.gaps).toEqual([]);
  });

  it('registers the named themes for metro and drops what native cannot use', () => {
    expect(result.extraThemes).toEqual(['clay', 'clay-dark']);
    expect(result.themes).toEqual(['default', 'clay']);
    expect(result.dropped).toContain("@import 'tw-animate-css'");
    expect(result.dropped).toContain('@custom-variant dark (&:is(.dark *))');
    expect(result.css).not.toContain('color-scheme');
  });
});
