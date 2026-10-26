import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { PracticeAiPort } from '@/backend/practice/application/ports/practice-ai.port';
import type { PracticeProgressPort } from '@/backend/practice/application/ports/practice-progress.port';
import type { PracticeRepository } from '@/backend/practice/domain/repositories/practice.repository';

function databaseName(value: string | undefined): string {
  assert(value, 'Set DATABASE_URL and PRACTICE_TEST_DATABASE_URL explicitly.');

  const url = new URL(value);
  assert.equal(url.protocol, 'mysql:');

  const name = decodeURIComponent(url.pathname.slice(1)).toLowerCase();
  assert(name && !name.includes('/'));

  return name;
}

const testUrl = process.env.PRACTICE_TEST_DATABASE_URL;
const testName = databaseName(testUrl);

assert(testName.endsWith('_test'), 'Practice smoke database must end in _test.');
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
  { PrepareSyllabusSeedServiceImpl },
  { SeedSyllabusCatalogRepository },
  { DrizzleSyllabusImporter },
  { DrizzleSyllabusCatalogRepository },
  { SyllabusCatalogServiceImpl },
  { ProgressCatalogAdapter },
  { DrizzleProgressRepository },
  { ProgressServiceImpl },
  { LearningContextServiceImpl },
  { DrizzlePracticeRepository },
  { PracticeServiceImpl },
  { PracticeCatalogAdapter },
  { PracticeProgressAdapter },
  { RecommendationServiceImpl },
  { RecommendationCatalogAdapter },
  { RecommendationProgressAdapter },
  { users },
  practiceSchema,
  progressSchema,
] = await Promise.all([
  import('drizzle-orm/mysql2/migrator'),
  import('drizzle-orm'),
  import('@/backend/shared/infrastructure/database/connection'),
  import('@/backend/syllabus/application/services/impl/prepare-syllabus-seed.service.impl'),
  import('@/backend/syllabus/interface/secondary/seed/seed-syllabus-catalog.repository'),
  import('@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-importer'),
  import('@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-catalog.repository'),
  import('@/backend/syllabus/application/services/impl/syllabus-catalog.service.impl'),
  import('@/backend/progress/interface/secondary/syllabus/progress-catalog.adapter'),
  import('@/backend/progress/interface/secondary/persistence/drizzle-progress.repository'),
  import('@/backend/progress/application/services/impl/progress.service.impl'),
  import('@/backend/progress/application/services/impl/learning-context.service.impl'),
  import('@/backend/practice/interface/secondary/persistence/drizzle-practice.repository'),
  import('@/backend/practice/application/services/impl/practice.service.impl'),
  import('@/backend/practice/interface/secondary/syllabus/practice-catalog.adapter'),
  import('@/backend/practice/interface/secondary/progress/practice-progress.adapter'),
  import('@/backend/personalization/application/services/impl/recommendation.service.impl'),
  import('@/backend/personalization/interface/secondary/syllabus/recommendation-catalog.adapter'),
  import('@/backend/personalization/interface/secondary/progress/recommendation-progress.adapter'),
  import('@/backend/users/infrastructure/database/schema'),
  import('@/backend/practice/infrastructure/database/schema'),
  import('@/backend/progress/infrastructure/database/schema'),
]);

const db = getDatabase();

const userId = randomUUID();
const otherUserId = randomUUID();

const syllabus = new SyllabusCatalogServiceImpl(new DrizzleSyllabusCatalogRepository());

const progressRepository = new DrizzleProgressRepository();
const progress = new ProgressServiceImpl(progressRepository, new ProgressCatalogAdapter(syllabus));

const catalog = new PracticeCatalogAdapter(syllabus);
const progressAdapter = new PracticeProgressAdapter(progress);

const repository = new DrizzlePracticeRepository();

const recommendations = new RecommendationServiceImpl(
  {
    getProfile: async () => ({
      appAccess: 'APP_READY',
      learnerProfile: {
        currentLevel: 'BEGINNER',
        targetLevel: 'JLPT_N5',
        weakSkillFocuses: [],
        knownSkillClaims: [],
      },
    }),
  },
  new RecommendationCatalogAdapter(syllabus),
  new RecommendationProgressAdapter(new LearningContextServiceImpl(progressRepository)),
);

let generationCalls = 0;
let gradingCalls = 0;

const ai: PracticeAiPort = {
  generate: async (input) => {
    generationCalls += 1;

    return {
      questions: Array.from({ length: input.questionCount }, () => ({
        skillCode: input.context.catalog[0].skillCode,
        questionType: 'SHORT_FREE_RESPONSE' as const,
        gradingStrategy: 'DETERMINISTIC' as const,
        difficultyBand: input.difficultyBand,
        promptPayload: {
          schemaVersion: 1 as const,
          promptLanguage: 'JA' as const,
          answerLanguage: 'JA' as const,
          slotCount: 1 as const,
          sentenceTemplate: 'わたし___がくせいです。',
          blankInputMode: 'ROMAJI_TO_KANA' as const,
          inputMethod: { acceptsRomaji: true as const, transformsTo: 'KANA' as const },
        },
        expectedAnswer: { acceptedTextAnswers: ['は'] },
      })),
    };
  },

  grade: async () => {
    gradingCalls += 1;

    return {
      isCorrect: true,
      numericScore: 95,
      feedbackText: 'The translation preserves the sentence meaning.',
    };
  },
};

const service = new PracticeServiceImpl(repository, catalog, progressAdapter, recommendations, ai);
const correctAnswer = { rawInputRomaji: 'wa', normalizedKana: 'は' };

function withProgress(adapter: PracticeProgressPort, storage: PracticeRepository = repository) {
  return new PracticeServiceImpl(storage, catalog, adapter, recommendations, ai);
}

async function main() {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });

  assert.equal(
    (await db.select().from(users)).length,
    0,
    'Provision an empty isolated test database.',
  );

  const seed = await new PrepareSyllabusSeedServiceImpl(
    new SeedSyllabusCatalogRepository(),
  ).prepare();
  await new DrizzleSyllabusImporter().import(seed);

  await db.insert(users).values([
    { id: userId, email: `${userId}@example.test`, displayName: 'Practice learner' },
    { id: otherUserId, email: `${otherUserId}@example.test`, displayName: 'Other learner' },
  ]);

  try {
    const session = await service.generateSession(userId);

    assert.equal(session.questions.length, 5);
    assert.equal(session.status, 'GENERATED');

    await assert.rejects(() =>
      service.submitAnswer(otherUserId, session.id, {
        questionId: session.questions[0].id,
        userAnswer: correctAnswer,
      }),
    );

    await assert.rejects(() =>
      service.submitAnswer(userId, session.id, {
        questionId: session.questions[1].id,
        userAnswer: correctAnswer,
      }),
    );

    const firstRequest = {
      questionId: session.questions[0].id,
      userAnswer: correctAnswer,
      responseTimeMs: 1234,
    };

    const concurrent = await Promise.all([
      service.submitAnswer(userId, session.id, firstRequest),
      service.submitAnswer(userId, session.id, firstRequest),
    ]);

    assert.equal(concurrent[0].answerId, concurrent[1].answerId);
    assert.equal((await progressRepository.readState(userId)).events.length, 1);

    await assert.rejects(() =>
      service.submitAnswer(userId, session.id, {
        ...firstRequest,
        userAnswer: { rawInputRomaji: 'ga', normalizedKana: 'が' },
      }),
    );

    for (const question of session.questions.slice(1)) {
      const result = await service.submitAnswer(userId, session.id, {
        questionId: question.id,
        userAnswer: correctAnswer,
      });

      assert(result.progressImpact);
    }

    const completed = await repository.withSessionLock(
      userId,
      session.id,
      async (tx) => tx.session,
    );

    assert.equal(completed.status, 'COMPLETED');
    assert.equal(completed.answeredQuestionsCount, 5);

    let failOnce = true;
    const recovering = withProgress({
      getUnderstanding: (owner, lesson) => progressAdapter.getUnderstanding(owner, lesson),
      recordEvent: async (request) => {
        const recorded = await progressAdapter.recordEvent(request);

        if (failOnce) {
          failOnce = false;
          throw new Error('Injected response loss after progress commit.');
        }

        return recorded;
      },
    });

    const recoverySession = await service.generateSession(userId, 1);
    const recoveryRequest = {
      questionId: recoverySession.questions[0].id,
      userAnswer: correctAnswer,
    };

    await assert.rejects(
      () => recovering.submitAnswer(userId, recoverySession.id, recoveryRequest),
      /Injected response loss/,
    );

    const beforeRecovery = (await progressRepository.readState(userId)).events.length;
    const recovered = await recovering.submitAnswer(userId, recoverySession.id, recoveryRequest);

    assert(recovered.progressImpact);
    assert.equal((await progressRepository.readState(userId)).events.length, beforeRecovery);

    const attributions = await new ProgressCatalogAdapter(syllabus).getPublishedAttributions();
    const lessonSlug = attributions[0].lessonSlug;
    const lessonId = attributions[0].lessonId;

    const countsBefore = {
      sessions: (await db.select().from(practiceSchema.practiceSessions)).length,
      questions: (await db.select().from(practiceSchema.practiceQuestions)).length,
      answers: (await db.select().from(practiceSchema.practiceAnswers)).length,
    };

    const next = await service.nextLessonQuestion(userId, lessonSlug);
    assert.equal(next.targetDifficultyLevel, 1);

    const canonical = await catalog.getQuestion(lessonSlug, 1);
    assert(canonical);

    const answer = {
      rawInputRomaji: 'fixture',
      normalizedKana: (canonical.expectedAnswer.acceptedTextAnswers as string[])[0],
    };

    const wrongRequest = {
      lessonSlug,
      questionId: next.question.id,
      userAnswer: { rawInputRomaji: 'wrong', normalizedKana: 'まちがい' },
      idempotencyKey: randomUUID(),
    };
    const wrong = await service.submitLessonAnswer(userId, wrongRequest);

    assert.equal(wrong.understandingProgress.currentUnderstandingLevelAfter, 0);
    assert.deepEqual(await service.submitLessonAnswer(userId, wrongRequest), wrong);

    const lessonRequest = {
      lessonSlug,
      questionId: next.question.id,
      userAnswer: answer,
      idempotencyKey: randomUUID(),
    };

    const results = await Promise.all([
      service.submitLessonAnswer(userId, lessonRequest),
      service.submitLessonAnswer(userId, lessonRequest),
    ]);

    assert.deepEqual(results[0], results[1]);
    assert.equal(results[0].understandingProgress.currentUnderstandingLevelAfter, 1);
    assert.equal((await progress.getLessonUnderstanding(userId, lessonId))?.totalAttemptCount, 2);
    assert.deepEqual(await service.submitLessonAnswer(userId, lessonRequest), results[0]);

    await assert.rejects(() =>
      service.submitLessonAnswer(userId, { ...lessonRequest, responseTimeMs: 10 }),
    );

    await assert.rejects(() =>
      service.submitLessonAnswer(userId, { ...lessonRequest, idempotencyKey: randomUUID() }),
    );

    let receiptFailure = true;
    const receiptRepository: PracticeRepository = {
      createSession: (value) => repository.createSession(value),
      withSessionLock: (owner, id, work) => repository.withSessionLock(owner, id, work),
      saveProgressResult: (id, result) => repository.saveProgressResult(id, result),
      findLessonReceipt: (owner, key) => repository.findLessonReceipt(owner, key),
      createLessonReceipt: (receipt) => repository.createLessonReceipt(receipt),
      saveLessonResult: async (id, result) => {
        if (receiptFailure) {
          receiptFailure = false;
          throw new Error('Injected receipt response loss.');
        }

        return repository.saveLessonResult(id, result);
      },
    };

    const receiptRecovery = withProgress(progressAdapter, receiptRepository);

    const second = await service.nextLessonQuestion(userId, lessonSlug);
    const secondCanonical = await catalog.getQuestion(lessonSlug, 2);
    assert(secondCanonical);

    const secondRequest = {
      lessonSlug,
      questionId: second.question.id,
      userAnswer: {
        rawInputRomaji: 'fixture',
        normalizedKana: (secondCanonical.expectedAnswer.acceptedTextAnswers as string[])[0],
      },
      idempotencyKey: randomUUID(),
    };

    await assert.rejects(
      () => receiptRecovery.submitLessonAnswer(userId, secondRequest),
      /Injected receipt/,
    );

    const thirdQuestion = await catalog.getQuestion(lessonSlug, 3);
    assert(thirdQuestion);

    await service.submitLessonAnswer(userId, {
      lessonSlug,
      questionId: thirdQuestion.id,
      idempotencyKey: randomUUID(),
      userAnswer: {
        rawInputRomaji: 'fixture',
        normalizedKana: (thirdQuestion.expectedAnswer.acceptedTextAnswers as string[])[0],
      },
    });

    assert.equal(
      (await receiptRecovery.submitLessonAnswer(userId, secondRequest)).understandingProgress
        .currentUnderstandingLevelAfter,
      2,
    );
    assert.equal(
      (await progress.getLessonUnderstanding(userId, lessonId))?.currentUnderstandingLevel,
      3,
    );

    for (let difficulty = 4; difficulty <= 9; difficulty += 1) {
      const question = await catalog.getQuestion(lessonSlug, difficulty);
      assert(question);

      const result = await service.submitLessonAnswer(userId, {
        lessonSlug,
        questionId: question.id,
        idempotencyKey: randomUUID(),
        userAnswer: {
          rawInputRomaji: 'fixture',
          normalizedKana: (question.expectedAnswer.acceptedTextAnswers as string[])[0],
        },
      });

      assert.equal(result.understandingProgress.currentUnderstandingLevelAfter, difficulty);
    }

    assert.equal((await service.nextLessonQuestion(userId, lessonSlug)).targetDifficultyLevel, 10);

    const cappedQuestion = await catalog.getQuestion(lessonSlug, 10);
    assert(cappedQuestion);

    const cappedRequest = {
      lessonSlug,
      questionId: cappedQuestion.id,
      idempotencyKey: randomUUID(),
      userAnswer: {
        rawInputRomaji: 'fixture',
        normalizedKana: (cappedQuestion.expectedAnswer.acceptedTextAnswers as string[])[0],
      },
    };

    const capTime = new Date(Date.now() + 1000);
    const capService = new PracticeServiceImpl(
      repository,
      catalog,
      progressAdapter,
      recommendations,
      ai,
      undefined,
      () => capTime,
    );

    const capResults = await Promise.all([
      capService.submitLessonAnswer(userId, cappedRequest),
      capService.submitLessonAnswer(userId, { ...cappedRequest, idempotencyKey: randomUUID() }),
    ]);

    assert.deepEqual(
      capResults
        .map((result) => result.understandingProgress.currentUnderstandingLevelBefore)
        .sort((a, b) => a - b),
      [9, 10],
    );

    const capped = capResults[0];
    assert.equal(capped.understandingProgress.currentUnderstandingLevelAfter, 10);
    assert.deepEqual(await service.submitLessonAnswer(userId, cappedRequest), capped);

    assert.deepEqual(
      {
        sessions: (await db.select().from(practiceSchema.practiceSessions)).length,
        questions: (await db.select().from(practiceSchema.practiceQuestions)).length,
        answers: (await db.select().from(practiceSchema.practiceAnswers)).length,
      },
      countsBefore,
      'Direct quizzes must not create practice sessions, questions or answers.',
    );

    assert.equal(generationCalls, 2);
    assert.equal(gradingCalls, 0, 'Canonical and objective grading must not call AI.');

    const latest = await recommendations.getRecommendation(userId);
    assert.equal(
      latest.context.lessonUnderstanding.find((item) => item.lessonSlug === lessonSlug)?.level,
      10,
    );

    assert.equal((await progress.getOverview(otherUserId)).trackedSkillsCount, 0);

    console.log(
      'Practice MySQL smoke passed: migrations, default generation, owner/order guards, concurrent answers, stable replay, progress/receipt recovery, canonical direct quiz, level0->1/cap10, no quiz sessions and fresh recommendation. AI uses a test double.',
    );
  } finally {
    const sessionIds = (
      await db
        .select()
        .from(practiceSchema.practiceSessions)
        .where(eq(practiceSchema.practiceSessions.userId, userId))
    ).map((row) => row.id);

    await db
      .delete(practiceSchema.practicePostStudyReceipts)
      .where(inArray(practiceSchema.practicePostStudyReceipts.userId, [userId, otherUserId]));

    if (sessionIds.length) {
      await db
        .delete(practiceSchema.practiceAnswers)
        .where(inArray(practiceSchema.practiceAnswers.sessionId, sessionIds));

      await db
        .delete(practiceSchema.practiceQuestions)
        .where(inArray(practiceSchema.practiceQuestions.sessionId, sessionIds));

      await db
        .delete(practiceSchema.practiceSessions)
        .where(inArray(practiceSchema.practiceSessions.id, sessionIds));
    }

    for (const owner of [userId, otherUserId]) {
      await db
        .delete(progressSchema.lessonUnderstandingSnapshots)
        .where(eq(progressSchema.lessonUnderstandingSnapshots.userId, owner));

      await db
        .delete(progressSchema.skillMasterySnapshots)
        .where(eq(progressSchema.skillMasterySnapshots.userId, owner));

      await db
        .delete(progressSchema.progressEvents)
        .where(eq(progressSchema.progressEvents.userId, owner));

      await db.delete(users).where(eq(users.id, owner));
    }
  }
}

try {
  await main();
} finally {
  await closeDatabase();
}
