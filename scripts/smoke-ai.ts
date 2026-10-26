import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { AiProviderPort } from '@/backend/shared/application/ports/ai-provider.port';
import type {
  AiRuntimeConfig,
  SummarizePlacementInput,
} from '@/backend/shared/application/services/requests/ai-request';

function databaseName(value: string | undefined): string {
  assert(value, 'Set DATABASE_URL and AI_TEST_DATABASE_URL explicitly.');

  const url = new URL(value);

  assert.equal(url.protocol, 'mysql:');

  const name = decodeURIComponent(url.pathname.slice(1)).toLowerCase();

  assert(name && !name.includes('/'));

  return name;
}

const testUrl = process.env.AI_TEST_DATABASE_URL;

const testName = databaseName(testUrl);

assert(testName.endsWith('_test'), 'AI smoke database must end in _test.');

assert.notEqual(testName, databaseName(process.env.DATABASE_URL));

assert(
  process.argv.includes('--allow-test-db-write'),
  'Pass --allow-test-db-write for isolated fixture writes.',
);

assert.notEqual(
  process.env.NEXT_PUBLIC_API_MOCKING,
  'true',
  'Persistence verification requires API mocking disabled.',
);

process.env.DATABASE_URL = testUrl;

const [
  { migrate },
  { eq, inArray },
  { getDatabase, closeDatabase },
  { AiServiceImpl },
  { AiFailure },
  { DrizzleAiRequestLogRepository },
  { aiRequestLogs, aiRequestAttempts },
  { users },
] = await Promise.all([
  import('drizzle-orm/mysql2/migrator'),
  import('drizzle-orm'),
  import('@/backend/shared/infrastructure/database/connection'),
  import('@/backend/shared/application/services/impl/ai.service.impl'),
  import('@/backend/shared/domain/exceptions/ai-failure'),
  import('@/backend/shared/interface/secondary/persistence/drizzle-ai-request-log.repository'),
  import('@/backend/shared/infrastructure/database/ai-schema'),
  import('@/backend/users/infrastructure/database/schema'),
]);

const db = getDatabase();

const userId = randomUUID();

const privateNote = 'private smoke learner note: I know hiragana.';

const privateKey = 'sk-private-smoke-never-sent';

const usage = { inputTokens: 100, cachedInputTokens: 20, outputTokens: 50, totalTokens: 150 };

const config: AiRuntimeConfig = {
  provider: 'OPENAI',
  apiKey: privateKey,
  generationModel: 'test-model',
  lightweightModel: 'test-model',
  timeoutMs: 1000,
  maxRetries: 1,
  maxOutputTokens: 512,
  maxInputChars: 40000,
  retryDelayMs: 0,
  modelCosts: {
    'test-model': { inputPerMillionUsd: 1, cachedInputPerMillionUsd: 0.5, outputPerMillionUsd: 2 },
  },
};

function input(): SummarizePlacementInput {
  return {
    metadata: { requestId: randomUUID(), userId, sourceEntityType: 'PERSONALIZATION_ASSESSMENT' },
    note: privateNote,
    context: {
      targetLevel: 'JLPT_N5',
      currentLevel: 'BEGINNER',
      currentUnitSlug: 'smoke-unit',
      catalog: [
        {
          skillCode: 'smoke_kana',
          title: 'Smoke Kana',
          lessonSlug: 'smoke-lesson',
          unitSlug: 'smoke-unit',
          trackSlug: 'smoke-track',
        },
      ],
      weakSkillCodes: ['smoke_kana'],
      masteredSkillCodes: [],
      recentMistakes: [],
      lessonUnderstanding: [{ lessonSlug: 'smoke-lesson', level: 1 }],
      allowedQuestionTypes: ['SHORT_FREE_RESPONSE'],
    },
  };
}

async function main() {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  assert.equal(
    (await db.select().from(users)).length,
    0,
    'Provision an empty isolated test database.',
  );
  assert.equal(
    (await db.select().from(aiRequestLogs)).length,
    0,
    'AI smoke database must contain no existing AI logs.',
  );

  let calls = 0;
  const provider: AiProviderPort = {
    name: 'TEST_DOUBLE',
    generate: async () => {
      calls += 1;

      return {
        outputText:
          calls === 1
            ? 'malformed JSON'
            : JSON.stringify({
                suggestedKnownSkillClaims: [{ skillCode: 'smoke_kana', confidence: 0.9 }],
              }),
        providerRequestId: `smoke-provider-${calls}`,
        usage,
      };
    },
  };
  const repository = new DrizzleAiRequestLogRepository();
  const service = new AiServiceImpl(provider, repository, config, async () => {});

  try {
    await db
      .insert(users)
      .values({ id: userId, email: `${userId}@example.test`, displayName: 'AI smoke learner' });

    const request = input();
    const result = await service.summarizePlacement(request);

    assert.equal(result.suggestedKnownSkillClaims[0].skillCode, 'smoke_kana');
    assert.equal(calls, 2);

    const [saved] = await db
      .select()
      .from(aiRequestLogs)
      .where(eq(aiRequestLogs.requestKey, request.metadata.requestId));

    assert(saved);
    assert.equal(saved.userId, userId);
    assert.equal(saved.requestStatus, 'SUCCEEDED');
    assert.equal(saved.schemaParseSuccess, true);
    assert.equal(saved.retryCount, 1);
    assert.equal(saved.promptTokens, 200);
    assert.equal(saved.completionTokens, 100);
    assert.equal(saved.totalTokens, 300);
    assert.equal(saved.estimatedCostUsd, 0.00038);

    const attempts = (
      await db
        .select()
        .from(aiRequestAttempts)
        .where(eq(aiRequestAttempts.aiRequestLogId, saved.id))
    ).sort((left, right) => left.attemptNumber - right.attemptNumber);

    assert.equal(attempts.length, 2);
    assert.equal(attempts[0].attemptStatus, 'PARSE_FAILED');
    assert.equal(attempts[0].failureCode, 'INVALID_OUTPUT');
    assert.equal(attempts[0].totalTokens, 150);
    assert.equal(attempts[1].attemptStatus, 'SUCCEEDED');
    assert.equal(attempts[1].schemaParseSuccess, true);

    await assert.rejects(() => service.summarizePlacement(request), { code: 'OBSERVABILITY' });
    assert.equal(calls, 2, 'Duplicate request keys must fail before another paid provider call.');

    const failingProvider: AiProviderPort = {
      name: 'TEST_DOUBLE',
      generate: async () => {
        throw new AiFailure('REFUSAL', false, usage, 'refused-request');
      },
    };
    const failedInput = input();

    await assert.rejects(
      () => new AiServiceImpl(failingProvider, repository, config).summarizePlacement(failedInput),
      { code: 'REFUSAL' },
    );

    const [failed] = await db
      .select()
      .from(aiRequestLogs)
      .where(eq(aiRequestLogs.requestKey, failedInput.metadata.requestId));

    assert.equal(failed.requestStatus, 'FAILED');
    assert.equal(failed.failureCode, 'REFUSAL');
    assert.equal(failed.retryCount, 0);
    assert.equal(failed.totalTokens, 150);

    const [failedAttempt] = await db
      .select()
      .from(aiRequestAttempts)
      .where(eq(aiRequestAttempts.aiRequestLogId, failed.id));

    assert.equal(failedAttempt.attemptStatus, 'FAILED');
    assert.equal(failedAttempt.failureCode, 'REFUSAL');

    const ownedLogs = await db.select().from(aiRequestLogs).where(eq(aiRequestLogs.userId, userId));

    assert.equal(ownedLogs.length, 2);

    const stored = JSON.stringify([ownedLogs, attempts, failedAttempt]);

    assert(!stored.includes(privateNote));
    assert(!stored.includes(privateKey));
    assert(!stored.includes('malformed JSON'));
    assert(
      ownedLogs.every(
        (log) => log.redactedInputPayload === null && log.redactedOutputPayload === null,
      ),
    );

    console.log(
      'AI MySQL smoke passed: migration, request/attempt persistence, bounded retry, cumulative usage/cost, refusal, duplicate request protection, and payload privacy.',
    );
  } finally {
    const ownedLogs = await db
      .select({ id: aiRequestLogs.id })
      .from(aiRequestLogs)
      .where(eq(aiRequestLogs.userId, userId));

    if (ownedLogs.length)
      await db.delete(aiRequestAttempts).where(
        inArray(
          aiRequestAttempts.aiRequestLogId,
          ownedLogs.map((log) => log.id),
        ),
      );

    await db.delete(aiRequestLogs).where(eq(aiRequestLogs.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
}

try {
  await main();
} finally {
  await closeDatabase();
}
