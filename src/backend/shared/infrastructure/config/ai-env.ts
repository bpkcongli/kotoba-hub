import type { AiRuntimeConfig } from '@/backend/shared/application/services/requests/ai-request';

function readInteger(
  environment: Record<string, string | undefined>,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const raw = environment[name];

  if (raw === undefined || raw === '') return fallback;

  const value = Number(raw);

  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }

  return value;
}

function readModel(
  environment: Record<string, string | undefined>,
  name: string,
  fallback: string,
): string {
  const value = environment[name]?.trim() || fallback;

  if (value.length > 100 || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) {
    throw new Error(`${name} must be a model identifier of at most 100 characters.`);
  }

  return value;
}

export function readAiEnv(
  environment: Record<string, string | undefined> = process.env,
): AiRuntimeConfig {
  if (environment.AI_PROVIDER && environment.AI_PROVIDER !== 'OPENAI') {
    throw new Error('AI_PROVIDER must be OPENAI for the installed adapter.');
  }

  const rawKey = environment.OPENAI_API_KEY;
  const apiKey = rawKey?.trim() ? rawKey : undefined;

  if (apiKey && !/^[\x21-\x7e]+$/.test(apiKey)) {
    throw new Error('OPENAI_API_KEY must contain only printable characters without whitespace.');
  }

  return {
    provider: 'OPENAI',
    apiKey,

    generationModel: readModel(environment, 'OPENAI_GENERATION_MODEL', 'gpt-5.6-terra'),
    lightweightModel: readModel(environment, 'OPENAI_NORMALIZATION_MODEL', 'gpt-5.6-luna'),

    timeoutMs: readInteger(environment, 'AI_TIMEOUT_MS', 30_000, 100, 120_000),
    maxRetries: readInteger(environment, 'AI_MAX_RETRIES', 1, 0, 2),
    maxOutputTokens: readInteger(environment, 'AI_MAX_OUTPUT_TOKENS', 8192, 256, 16_384),
    retryDelayMs: readInteger(environment, 'AI_RETRY_DELAY_MS', 250, 0, 5000),
    maxInputChars: readInteger(environment, 'AI_MAX_INPUT_CHARS', 40_000, 1000, 100_000),

    // Standard text rates verified on 2026-10-26; unknown model prices stay unavailable.
    modelCosts: {
      'gpt-5.6-terra': {
        inputPerMillionUsd: 2,
        cachedInputPerMillionUsd: 0.2,
        outputPerMillionUsd: 12,
      },

      'gpt-5.6-luna': {
        inputPerMillionUsd: 0.2,
        cachedInputPerMillionUsd: 0.02,
        outputPerMillionUsd: 1.2,
      },
    },
  };
}
