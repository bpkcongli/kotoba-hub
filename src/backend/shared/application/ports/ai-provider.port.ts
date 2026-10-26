import type { AiUsage } from '@/backend/shared/domain/repositories/ai-request-log.repository';

export type { AiUsage } from '@/backend/shared/domain/repositories/ai-request-log.repository';

export interface AiProviderResult {
  outputText: string;
  providerRequestId: string | null;
  usage: AiUsage | null;
}

export interface AiProviderRequest {
  model: string;
  instructions: string;
  input: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  timeoutMs: number;
  maxOutputTokens: number;
}

export interface AiProviderPort {
  readonly name: string;

  generate(request: AiProviderRequest): Promise<AiProviderResult>;
}
