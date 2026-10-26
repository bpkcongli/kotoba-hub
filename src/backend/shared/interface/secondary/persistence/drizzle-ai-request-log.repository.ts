import { eq } from 'drizzle-orm';
import type {
  AiAttemptLog,
  AiLogCompletion,
  AiLogStart,
  AiRequestLogRepository,
} from '@/backend/shared/domain/repositories/ai-request-log.repository';
import {
  aiRequestAttempts,
  aiRequestLogs,
} from '@/backend/shared/infrastructure/database/ai-schema';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';

type Database = ReturnType<typeof getDatabase>;

export class DrizzleAiRequestLogRepository implements AiRequestLogRepository {
  constructor(private readonly database: () => Database = getDatabase) {}

  async start(log: AiLogStart): Promise<void> {
    await this.database()
      .insert(aiRequestLogs)
      .values({ ...log, requestStatus: 'STARTED' });
  }

  async recordAttempt(log: AiAttemptLog): Promise<void> {
    const { usage, ...fields } = log;

    await this.database()
      .insert(aiRequestAttempts)
      .values({
        ...fields,

        promptTokens: usage?.inputTokens ?? null,
        completionTokens: usage?.outputTokens ?? null,
        totalTokens: usage?.totalTokens ?? null,

        attemptMetadata: {
          cachedInputTokens: usage?.cachedInputTokens ?? null,
          usageAvailable: usage !== null,
        },
      });
  }

  async complete(id: string, completion: AiLogCompletion): Promise<void> {
    const { usage, ...fields } = completion;

    await this.database()
      .update(aiRequestLogs)
      .set({
        ...fields,
        promptTokens: usage?.inputTokens ?? null,
        completionTokens: usage?.outputTokens ?? null,
        totalTokens: usage?.totalTokens ?? null,
      })
      .where(eq(aiRequestLogs.id, id));
  }
}
