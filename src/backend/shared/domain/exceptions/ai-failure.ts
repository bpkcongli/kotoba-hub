import type { AiUsage } from '@/backend/shared/domain/repositories/ai-request-log.repository';

export type AiFailureCode =
  | 'CONFIGURATION'
  | 'INVALID_INPUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'RATE_LIMIT'
  | 'PROVIDER_REJECTED'
  | 'TIMEOUT'
  | 'REFUSAL'
  | 'INCOMPLETE'
  | 'INVALID_OUTPUT'
  | 'OBSERVABILITY';

const messages: Record<AiFailureCode, string> = {
  CONFIGURATION: 'AI provider configuration is missing or invalid.',
  INVALID_INPUT: 'AI input does not match the authorized context constraints.',
  PROVIDER_UNAVAILABLE: 'AI provider is temporarily unavailable.',
  RATE_LIMIT: 'AI provider rate limit was reached.',
  PROVIDER_REJECTED: 'AI provider rejected the request.',
  TIMEOUT: 'AI provider request timed out.',
  REFUSAL: 'AI provider declined this operation.',
  INCOMPLETE: 'AI provider returned an incomplete response.',
  INVALID_OUTPUT: 'AI output failed structural or semantic validation.',
  OBSERVABILITY: 'AI request observability could not be persisted.',
};

export class AiFailure extends Error {
  constructor(
    readonly code: AiFailureCode,
    readonly retryable = false,
    readonly usage: AiUsage | null = null,
    readonly providerRequestId: string | null = null,
  ) {
    super(messages[code]);
    this.name = 'AiFailure';
  }
}
