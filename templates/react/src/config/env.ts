import { z } from 'zod';

/**
 * Environment is validated once, at startup, so a misconfigured deploy fails
 * immediately with a readable message instead of surfacing as `undefined` deep
 * inside a request three screens later.
 */
const schema = z.object({
  VITE_API_URL: z.string().url(),
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
