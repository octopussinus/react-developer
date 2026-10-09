import { describe, expect, it } from 'vitest';
import { rewriteEnvReads, rewriteImageImports, swapImports } from './copy.mjs';

describe('swapImports', () => {
  it('points lucide-react at the generated icons, in import positions only', () => {
    const out = swapImports(
      "import { Dog } from 'lucide-react';\nconst docs = 'see lucide-react docs';\n",
    );
    expect(out).toContain("from '@/platform/icons'");
    expect(out).toContain("'see lucide-react docs'");
  });
});

describe('rewriteImageImports', () => {
  it('turns an image import into the URI string the web code expects', () => {
    const out = rewriteImageImports(
      "import { faker } from '@faker-js/faker';\nimport bella from '../assets/bella.webp';\n\nexport const dog = { photo: bella };\n",
    );
    expect(out).toContain("import { assetUri } from '@/platform/asset-uri';");
    expect(out).toContain("import bellaAsset from '../assets/bella.webp';");
    expect(out).toContain('const bella = assetUri(bellaAsset);');
    // Declared after every import, before first use.
    expect(out.indexOf('const bella')).toBeGreaterThan(out.indexOf("from '../assets/bella.webp'"));
    expect(out.indexOf('const bella')).toBeLessThan(out.indexOf('export const dog'));
  });

  it('leaves files without images byte for byte alone', () => {
    const text = "import logo from './logo.svg';\nexport const x = 1;\n";
    expect(rewriteImageImports(text)).toBe(text);
  });
});

describe('rewriteEnvReads', () => {
  it('turns every Vite env read into the literal form Expo inlines', () => {
    const out = rewriteEnvReads(
      "const a = import.meta.env['VITE_API_URL'];\nconst b = import.meta.env.VITE_API_URLS;\nif (import.meta.env.DEV) {}\n",
    );
    expect(out).toBe(
      'const a = process.env.EXPO_PUBLIC_API_URL;\nconst b = process.env.EXPO_PUBLIC_API_URLS;\nif (__DEV__) {}\n',
    );
  });
});

describe("Vite's new URL asset idiom", () => {
  it('becomes an image import passed through assetUri', () => {
    const out = rewriteImageImports(
      "import { x } from './x';\n\nconst photo = new URL('../assets/shop/a.webp', import.meta.url).href;\n",
    );
    expect(out).toContain("import __asset0 from '../assets/shop/a.webp';");
    expect(out).toContain('const photo = assetUri(__asset0);');
    expect(out).toContain("import { assetUri } from '@/platform/asset-uri';");
    expect(out).not.toContain('import.meta');
  });
});

describe('imports added by the port', () => {
  it('go after a MULTI-LINE import, never inside it (this broke a real app)', () => {
    const web = [
      "import { SHOP } from './shop';",
      'import {',
      '  type Product,',
      '  type Sort,',
      "} from '@/lib/api/generated';",
      '',
      "const photo = new URL('../assets/a.jpg', import.meta.url).href;",
      '',
    ].join('\n');
    const out = rewriteImageImports(web);
    // The multi-line import is intact...
    expect(out).toContain("import {\n  type Product,\n  type Sort,\n} from '@/lib/api/generated';");
    // ...and the asset import comes after it.
    expect(out.indexOf("import __asset0 from '../assets/a.jpg';")).toBeGreaterThan(
      out.indexOf("} from '@/lib/api/generated';"),
    );
    expect(out).toContain('const photo = assetUri(__asset0);');
  });
});
