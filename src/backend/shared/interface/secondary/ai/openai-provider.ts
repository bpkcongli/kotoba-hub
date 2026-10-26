import 'server-only';
import { z } from 'zod';
import type {
  AiProviderPort,
  AiProviderRequest,
  AiProviderResult,
  AiUsage,
} from '@/backend/shared/application/ports/ai-provider.port';
import { AiFailure } from '@/backend/shared/domain/exceptions/ai-failure';

const usageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  input_tokens_details: z.object({ cached_tokens: z.number().int().nonnegative() }).optional(),
  output_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
});

function readUsage(body: Record<string, unknown>): AiUsage | null {
  const result = usageSchema.safeParse(body.usage);
  if (!result.success) return null;

  const usage = result.data;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;

  if (
    cached > usage.input_tokens ||
    usage.total_tokens !== usage.input_tokens + usage.output_tokens
  )
    return null;

  return {
    inputTokens: usage.input_tokens,
    cachedInputTokens: cached,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class OpenAiProvider implements AiProviderPort {
  readonly name = 'OPENAI';

  constructor(
    private readonly apiKey: string | undefined,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async generate(request: AiProviderRequest): Promise<AiProviderResult> {
    if (!this.apiKey) throw new AiFailure('CONFIGURATION');

    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    // The deadline covers response-body decoding as well as the initial connection.
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new AiFailure('TIMEOUT', true));
      }, request.timeoutMs);
    });

    try {
      return await Promise.race([this.perform(request, controller.signal), deadline]);
    } catch (error) {
      if (error instanceof AiFailure) throw error;
      if (controller.signal.aborted) throw new AiFailure('TIMEOUT', true);

      throw new AiFailure('PROVIDER_UNAVAILABLE', true);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async perform(
    request: AiProviderRequest,
    signal: AbortSignal,
  ): Promise<AiProviderResult> {
    const response = await this.fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal,
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        store: false,
        instructions: request.instructions,
        input: request.input,
        max_output_tokens: request.maxOutputTokens,
        text: {
          format: {
            type: 'json_schema',
            name: request.schemaName,
            strict: true,
            schema: request.jsonSchema,
          },
        },
      }),
    });

    const requestId = response.headers.get('x-request-id')?.slice(0, 100) ?? null;

    if (!response.ok) {
      if (response.status === 429) throw new AiFailure('RATE_LIMIT', true, null, requestId);

      if (response.status >= 500)
        throw new AiFailure('PROVIDER_UNAVAILABLE', true, null, requestId);

      if (response.status === 401 || response.status === 403)
        throw new AiFailure('CONFIGURATION', false, null, requestId);

      throw new AiFailure('PROVIDER_REJECTED', false, null, requestId);
    }

    let body: unknown;

    try {
      body = await response.json();
    } catch {
      throw new AiFailure('INVALID_OUTPUT', true, null, requestId);
    }

    if (!isRecord(body)) throw new AiFailure('INVALID_OUTPUT', true, null, requestId);

    const usage = readUsage(body);
    const output = Array.isArray(body.output) ? body.output : [];
    const parts = output.flatMap((item: unknown) =>
      isRecord(item) && Array.isArray(item.content) ? item.content : [],
    );

    if (parts.some((part: unknown) => isRecord(part) && part.type === 'refusal'))
      throw new AiFailure('REFUSAL', false, usage, requestId);

    if (body.status === 'incomplete') throw new AiFailure('INCOMPLETE', true, usage, requestId);

    if (body.status !== 'completed')
      throw new AiFailure('PROVIDER_UNAVAILABLE', true, usage, requestId);

    const texts = parts.filter(
      (part: unknown): part is Record<string, unknown> =>
        isRecord(part) && part.type === 'output_text',
    );

    if (texts.length !== 1 || typeof texts[0].text !== 'string')
      throw new AiFailure('INVALID_OUTPUT', true, usage, requestId);

    return { outputText: texts[0].text, usage, providerRequestId: requestId };
  }
}
