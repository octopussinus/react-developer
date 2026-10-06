import { z } from 'zod';

/**
 * Environment is validated once, at startup, so a misconfigured deploy fails
 * immediately with a readable message instead of surfacing as `undefined` deep
 * inside a request three screens later.
 */
const url = z.string().url();

/**
 * Extra APIs, as a JSON object of name -> base URL:
 *
 *   VITE_API_URLS={"auth":"https://auth.example.com","payments":"https://pay.example.com"}
 *
 * Adding a backend is an .env change and nothing else -- no new variable to
 * declare here, no new export in api-client.ts. The names are validated as URLs
 * at startup like everything else, so a typo fails the boot rather than the
 * first request that happens to use it.
 */
const extraApis = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (raw === undefined || raw.trim() === '') return {};
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'must be a JSON object, e.g. {"auth":"https://auth.example.com"}',
      });
      return z.NEVER;
    }
  })
  .pipe(z.record(url));

const schema = z.object({
  VITE_API_URL: url,
  VITE_API_URLS: extraApis,
  VITE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(
    `Invalid environment configuration:\n${issues}\n\n` +
      'Development defaults live in .env.development; copy .env.example to ' +
      '.env.local for personal overrides, and configure these in your deployment.',
  );
}

export const env = parsed.data;
