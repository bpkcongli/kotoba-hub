export type AiOperation =
  | 'GENERATE_PRACTICE_SESSION'
  | 'GRADE_PRACTICE_ANSWER'
  | 'SUMMARIZE_PLACEMENT'
  | 'GENERATE_STUDY_RECOMMENDATION';

export type AiSourceEntityType =
  'PRACTICE_SESSION' | 'PRACTICE_ANSWER' | 'PERSONALIZATION_ASSESSMENT';

export interface AiUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AiLogStart {
  id: string;
  requestKey: string;
  userId: string | null;
  sourceModule: 'PRACTICE' | 'PERSONALIZATION';
  operationName: AiOperation;
  sourceEntityType: AiSourceEntityType | null;
  sourceEntityId: string | null;
  provider: string;
  model: string;
  schemaName: string;
  startedAt: Date;
  metadata: { templateVersion: number; catalogSkillCount: number };
}

export interface AiAttemptLog {
  id: string;
  aiRequestLogId: string;
  attemptNumber: number;
  provider: string;
  model: string;
  providerRequestId: string | null;
  attemptStatus: 'SUCCEEDED' | 'FAILED' | 'TIMEOUT' | 'PARSE_FAILED';
  latencyMs: number;
  usage: AiUsage | null;
  estimatedCostUsd: number | null;
  schemaParseSuccess: boolean;
  failureCode: string | null;
  failureReason: string | null;
  startedAt: Date;
  completedAt: Date;
}

export interface AiLogCompletion {
  requestStatus: 'SUCCEEDED' | 'FAILED';
  schemaParseSuccess: boolean;
  retryCount: number;
  totalLatencyMs: number;
  usage: AiUsage | null;
  estimatedCostUsd: number | null;
  failureCode: string | null;
  failureReason: string | null;
  completedAt: Date;
}

export interface AiRequestLogRepository {
  start(log: AiLogStart): Promise<void>;

  recordAttempt(log: AiAttemptLog): Promise<void>;

  complete(id: string, completion: AiLogCompletion): Promise<void>;
}
