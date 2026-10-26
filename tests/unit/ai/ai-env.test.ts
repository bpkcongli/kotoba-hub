import { readAiEnv } from '@/backend/shared/infrastructure/config/ai-env';

describe('AI environment configuration', () => {
  it('lets unrelated app features start without an OpenAI API key', () => {
    expect(readAiEnv({})).toMatchObject({
      provider: 'OPENAI',
      apiKey: undefined,
      timeoutMs: 30000,
      maxRetries: 1,
    });
    expect(readAiEnv({ OPENAI_API_KEY: '   ' }).apiKey).toBeUndefined();
  });

  it('reads independent server-side model choices and bounded runtime settings', () => {
    expect(
      readAiEnv({
        OPENAI_API_KEY: 'sk-test-server-only',
        OPENAI_GENERATION_MODEL: 'generation-snapshot-2026-10-01',
        OPENAI_NORMALIZATION_MODEL: 'lightweight-snapshot-2026-10-01',
        AI_TIMEOUT_MS: '120000',
        AI_MAX_RETRIES: '2',
        AI_MAX_OUTPUT_TOKENS: '16384',
        AI_RETRY_DELAY_MS: '0',
        AI_MAX_INPUT_CHARS: '100000',
      }),
    ).toMatchObject({
      apiKey: 'sk-test-server-only',
      generationModel: 'generation-snapshot-2026-10-01',
      lightweightModel: 'lightweight-snapshot-2026-10-01',
      timeoutMs: 120000,
      maxRetries: 2,
      maxOutputTokens: 16384,
      retryDelayMs: 0,
      maxInputChars: 100000,
    });
  });

  it.each([
    ['AI_PROVIDER', 'UNSUPPORTED_PROVIDER'],
    ['AI_TIMEOUT_MS', '99'],
    ['AI_TIMEOUT_MS', '120001'],
    ['AI_MAX_RETRIES', '3'],
    ['AI_MAX_RETRIES', '-1'],
    ['AI_MAX_RETRIES', '1.5'],
    ['AI_MAX_OUTPUT_TOKENS', '255'],
    ['AI_MAX_OUTPUT_TOKENS', '16385'],
    ['AI_RETRY_DELAY_MS', '-1'],
    ['AI_RETRY_DELAY_MS', '5001'],
    ['AI_MAX_INPUT_CHARS', '999'],
    ['AI_MAX_INPUT_CHARS', '100001'],
    ['AI_TIMEOUT_MS', 'NaN'],
  ])('rejects invalid %s settings before provider invocation', (name, value) => {
    expect(() => readAiEnv({ [name]: value })).toThrow(name);
  });

  it.each([
    ['OPENAI_API_KEY', 'sk-secret with-space'],
    ['OPENAI_API_KEY', 'sk-secret\nheader'],
    ['OPENAI_GENERATION_MODEL', 'model/secret'],
    ['OPENAI_NORMALIZATION_MODEL', 'secret model'],
  ])('never echoes invalid %s values in configuration errors', (name, value) => {
    let message = '';

    try {
      readAiEnv({ [name]: value });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain(name);
    expect(message).not.toContain(value);
    expect(message).not.toContain('secret');
  });

  it('ignores browser-prefixed credentials', () => {
    expect(
      readAiEnv({ NEXT_PUBLIC_OPENAI_API_KEY: 'sk-never-a-server-key' }).apiKey,
    ).toBeUndefined();
  });
});
