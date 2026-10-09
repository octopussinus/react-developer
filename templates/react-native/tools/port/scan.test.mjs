import { describe, expect, it } from 'vitest';
import { scanSource } from './scan.mjs';

const scan = (text, name = 'a.tsx') => scanSource(name, text);

describe('scanSource', () => {
  it('finds DOM markup and browser globals, not look-alikes', () => {
    const facts = scan(
      `const label = '<div>'; const options = { window: 1 };
       export function A({ history }: { history: string[] }) {
         return <div onClick={() => window.scrollTo(0, 0)}>{history.length}</div>;
       }`,
    );
    expect(facts.intrinsics).toEqual(['div']);
    // `history` is a parameter here, `window` a real global.
    expect(facts.globals).toEqual(['window']);
  });

  it('lets DOM types in an interface through, but not a DOM ref in a hook', () => {
    const types = scan(
      `import type { DragEvent } from 'react';
       export interface ZoneProps { onDrop: (event: DragEvent<HTMLElement>) => void }`,
      'types.ts',
    );
    expect(types.globals).toEqual([]);

    const hook = scan(
      `import { useRef } from 'react';
       export function useFocus() { const ref = useRef<HTMLDivElement>(null); return ref; }`,
      'use-focus.ts',
    );
    expect(hook.globals).toEqual(['HTMLDivElement']);
  });

  it('recognises a barrel and the members it re-exports', () => {
    const facts = scan(
      `export { Button, type ButtonProps } from './button';\nexport * from './badge';`,
      'index.ts',
    );
    expect(facts.barrel).toBe(true);
    expect(facts.reexports[0]?.elements.map((e) => e.name)).toEqual(['Button', 'ButtonProps']);
    expect(facts.reexports[1]?.star).toBe(true);
  });

  it('reports Vite-only syntax', () => {
    expect(scan("const all = import.meta.glob('./*.json');", 'x.ts').viteOnly).toEqual([
      'import.meta.glob',
    ]);
  });
});

describe('import.meta.env', () => {
  it('treats a single variable read as portable, the whole object as Vite-only', () => {
    expect(scan("const u = import.meta.env['VITE_API_URL'];", 'x.ts').viteOnly).toEqual([]);
    expect(scan('const u = import.meta.env.VITE_API_URL;', 'x.ts').viteOnly).toEqual([]);
    expect(scan('const all = { ...import.meta.env };', 'x.ts').viteOnly).toEqual([
      'import.meta.env',
    ]);
  });
});

describe('new URL(image, import.meta.url)', () => {
  it('is an asset reference the port rewrites, not Vite-only', () => {
    expect(
      scan("const p = new URL('../assets/a.webp', import.meta.url).href;", 'x.ts').viteOnly,
    ).toEqual([]);
    expect(scan('const here = new URL(import.meta.url);', 'x.ts').viteOnly).toEqual([
      'import.meta.url',
    ]);
  });
});
