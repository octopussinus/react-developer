import { describe, expect, it } from 'vitest';
import { nativeDotEnv, nativeEnvModule } from './env.mjs';

const WEB = `import { z } from 'zod';

const schema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_API_TIMEOUT_MS: z.coerce.number().default(15_000),
});

const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) throw new Error('bad env');
export const env = parsed.data;
export const mocks = import.meta.env['VITE_ENABLE_MOCKS'] !== 'false';
`;

describe('nativeEnvModule', () => {
  const out = nativeEnvModule(WEB);

  it('reads every VITE_ key from a LITERAL process.env.EXPO_PUBLIC_ read', () => {
    // `process.env[name]` is not inlined by Expo and comes back undefined on a
    // phone -- each key must be written out in full.
    expect(out).toContain('VITE_API_URL: process.env.EXPO_PUBLIC_API_URL,');
    expect(out).toContain('VITE_API_TIMEOUT_MS: process.env.EXPO_PUBLIC_API_TIMEOUT_MS,');
    expect(out).toContain('VITE_ENABLE_MOCKS: process.env.EXPO_PUBLIC_ENABLE_MOCKS,');
  });

  it('keeps the schema and the exports, and leaves no import.meta behind', () => {
    expect(out).toContain('const schema = z.object({');
    expect(out).toContain('schema.safeParse(expoEnv)');
    expect(out).toContain("expoEnv.VITE_ENABLE_MOCKS !== 'false'");
    expect(out).not.toContain('import.meta');
  });

  it('keeps imports above the generated object', () => {
    expect(out.indexOf("import { z } from 'zod';")).toBeLessThan(out.indexOf('const expoEnv'));
    expect(out.startsWith('// react-dev:generated')).toBe(true);
  });
});

describe('nativeDotEnv', () => {
  it('renames variables, including commented-out ones', () => {
    const out = nativeDotEnv('VITE_API_URL=http://x\n# VITE_API_URLS={"a":"b"}\nOTHER=1\n');
    expect(out).toBe('EXPO_PUBLIC_API_URL=http://x\n# EXPO_PUBLIC_API_URLS={"a":"b"}\nOTHER=1\n');
  });
});
