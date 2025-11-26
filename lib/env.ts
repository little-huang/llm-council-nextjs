import { z } from 'zod';

const EnvSchema = z.object({
  // OPENROUTER_API_KEY is now optional - can be provided via frontend
  OPENROUTER_API_KEY: z.string().optional(),
  COUNCIL_MODELS: z.string().optional(),
  CHAIRMAN_MODEL: z.string().optional(),
});

const parsedEnv = EnvSchema.safeParse({
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  COUNCIL_MODELS: process.env.COUNCIL_MODELS,
  CHAIRMAN_MODEL: process.env.CHAIRMAN_MODEL,
});

if (!parsedEnv.success) {
  const message = parsedEnv.error.errors
    .map((err) => err.message)
    .join('; ');
  throw new Error(`Environment validation failed: ${message}`);
}

export const env = parsedEnv.data;


