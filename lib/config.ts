import { env } from './env';

/**
 * Configuration for the LLM Council.
 */

// OpenRouter API key from environment
export const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;

// Default models (can be overridden by environment variables)
const DEFAULT_COUNCIL_MODELS = [
  'openai/gpt-5.1',
  'google/gemini-3-pro-preview',
  'anthropic/claude-opus-4.5'
];

const DEFAULT_CHAIRMAN_MODEL = 'google/gemini-3-pro-preview';

// Parse models from environment variable (comma-separated)
function parseModelsFromEnv(
  envVar: string | undefined,
  defaultModels: string[]
): string[] {
  if (!envVar) return defaultModels;
  return envVar
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}

// Council members - list of OpenRouter model identifiers
// Can be overridden with COUNCIL_MODELS environment variable (comma-separated)
export const COUNCIL_MODELS = parseModelsFromEnv(
  env.COUNCIL_MODELS,
  DEFAULT_COUNCIL_MODELS
);

export const RESOLVED_COUNCIL_MODEL_CONFIGS = COUNCIL_MODELS.map((model) => ({
  model,
  systemPrompt: '',
}));

// Chairman model - synthesizes final response
// Can be overridden with CHAIRMAN_MODEL environment variable
export const CHAIRMAN_MODEL = env.CHAIRMAN_MODEL || DEFAULT_CHAIRMAN_MODEL;

// OpenRouter API endpoint
export const OPENROUTER_API_URL =
  'https://openrouter.ai/api/v1/chat/completions';

// Data directory for conversation storage
export const DATA_DIR = './data/conversations';

