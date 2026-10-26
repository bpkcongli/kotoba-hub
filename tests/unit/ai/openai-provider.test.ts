import type { AiProviderRequest } from '@/backend/shared/application/ports/ai-provider.port';
import { OpenAiProvider } from '@/backend/shared/interface/secondary/ai/openai-provider';

function request(): AiProviderRequest {
  return {
    model: 'test-model',
    instructions: 'Return a structured draft.',
    input: JSON.stringify({ note: 'learner data' }),
    schemaName: 'test_placement',
    jsonSchema: { type: 'object', properties: {}, additionalProperties: false, required: [] },
    timeoutMs: 1000,
    maxOutputTokens: 512,
  };
}

function responseBody(overrides: Record<string, unknown> = {}) {
  return {
    status: 'completed',
    output: [{ type: 'message', content: [{ type: 'output_text', text: '{"claims":[]}' }] }],
    usage: {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 20 },
      output_tokens: 50,
      total_tokens: 150,
    },
    ...overrides,
  };
}

function setup(body: unknown = responseBody(), status = 200) {
  const response = Response.json(body, {
    status,
    headers: { 'x-request-id': 'openai-request-123' },
  });
  const fetcher: jest.MockedFunction<typeof fetch> = jest.fn<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >(async () => response);
  const provider = new OpenAiProvider('sk-private-test-key', fetcher);

  return { provider, fetcher, response };
}

describe('OpenAI Responses provider', () => {
  it('uses strict JSON Schema, disables response storage, and returns usage without raw metadata', async () => {
    const { provider, fetcher } = setup();

    await expect(provider.generate(request())).resolves.toEqual({
      outputText: '{"claims":[]}',
      providerRequestId: 'openai-request-123',
      usage: { inputTokens: 100, cachedInputTokens: 20, outputTokens: 50, totalTokens: 150 },
    });

    const [url, options] = fetcher.mock.calls[0];

    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(options).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer sk-private-test-key' },
    });
    expect(JSON.parse(options!.body as string)).toEqual({
      model: 'test-model',
      instructions: 'Return a structured draft.',
      input: JSON.stringify({ note: 'learner data' }),
      store: false,
      max_output_tokens: 512,
      text: {
        format: {
          type: 'json_schema',
          name: 'test_placement',
          strict: true,
          schema: request().jsonSchema,
        },
      },
    });
  });

  it('rejects a missing API key only when the AI operation is invoked', async () => {
    const fetcher: jest.MockedFunction<typeof fetch> = jest.fn();
    const provider = new OpenAiProvider(undefined, fetcher);

    await expect(provider.generate(request())).rejects.toMatchObject({
      code: 'CONFIGURATION',
      retryable: false,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'CONFIGURATION', false],
    [403, 'CONFIGURATION', false],
    [400, 'PROVIDER_REJECTED', false],
    [429, 'RATE_LIMIT', true],
    [500, 'PROVIDER_UNAVAILABLE', true],
    [503, 'PROVIDER_UNAVAILABLE', true],
  ])(
    'maps HTTP %s without reading or exposing provider error bodies',
    async (status, code, retryable) => {
      const { provider, response } = setup(
        { error: { message: 'private provider body sk-private-test-key' } },
        status,
      );
      const readBody = jest.spyOn(response, 'json');

      await expect(provider.generate(request())).rejects.toMatchObject({
        code,
        retryable,
        providerRequestId: 'openai-request-123',
      });
      expect(readBody).not.toHaveBeenCalled();
    },
  );

  it('preserves billed usage on refusal and does not expose refusal text', async () => {
    const { provider } = setup(
      responseBody({
        output: [
          { type: 'message', content: [{ type: 'refusal', refusal: 'private refusal text' }] },
        ],
      }),
    );

    await expect(provider.generate(request())).rejects.toMatchObject({
      code: 'REFUSAL',
      retryable: false,
      usage: { inputTokens: 100, cachedInputTokens: 20, outputTokens: 50, totalTokens: 150 },
    });
  });

  it('preserves billed usage on truncated output and makes it eligible for bounded retry', async () => {
    const { provider } = setup(
      responseBody({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }),
    );

    await expect(provider.generate(request())).rejects.toMatchObject({
      code: 'INCOMPLETE',
      retryable: true,
      usage: { inputTokens: 100, cachedInputTokens: 20, outputTokens: 50, totalTokens: 150 },
    });
  });

  it.each([
    null,
    [],
    responseBody({ output: [] }),
    responseBody({ output: [{ content: [{ type: 'output_text', text: 42 }] }] }),
    responseBody({
      output: [
        {
          content: [
            { type: 'output_text', text: '{}' },
            { type: 'output_text', text: '{}' },
          ],
        },
      ],
    }),
  ])('rejects malformed or ambiguous response bodies (%#)', async (body) => {
    const { provider } = setup(body);

    await expect(provider.generate(request())).rejects.toMatchObject({
      code: 'INVALID_OUTPUT',
      retryable: true,
    });
  });

  it('rejects malformed JSON transport bodies with a safe failure', async () => {
    const fetcher: jest.MockedFunction<typeof fetch> = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >(async () => new Response('private malformed body'));

    await expect(
      new OpenAiProvider('sk-private-test-key', fetcher).generate(request()),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  });

  it.each([
    { input_tokens: 100, output_tokens: 50, total_tokens: 999 },
    {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 101 },
      output_tokens: 50,
      total_tokens: 150,
    },
    { input_tokens: -1, output_tokens: 50, total_tokens: 49 },
  ])('does not report inconsistent usage as valid accounting (%#)', async (usage) => {
    const { provider } = setup(responseBody({ usage }));

    await expect(provider.generate(request())).resolves.toMatchObject({ usage: null });
  });

  it('sanitizes network errors before they leave the provider boundary', async () => {
    const { provider, fetcher } = setup();

    fetcher.mockRejectedValue(new Error('network error containing sk-private-test-key'));

    await expect(provider.generate(request())).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      retryable: true,
    });
    await expect(provider.generate(request())).rejects.not.toThrow('sk-private-test-key');
  });

  it.each(['connection', 'body'])('enforces the deadline during %s processing', async (phase) => {
    jest.useFakeTimers();

    try {
      const { provider, fetcher, response } = setup();

      if (phase === 'connection') fetcher.mockImplementation(() => new Promise(() => {}));
      else jest.spyOn(response, 'json').mockImplementation(() => new Promise(() => {}));

      const result = provider.generate(request());
      const assertion = expect(result).rejects.toMatchObject({ code: 'TIMEOUT', retryable: true });

      await jest.advanceTimersByTimeAsync(1000);
      await assertion;
      expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
