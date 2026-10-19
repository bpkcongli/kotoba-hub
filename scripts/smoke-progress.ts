import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { RecordLearningEventRequest } from '@/backend/progress/application/services/requests/record-learning-event.request';
import type { ProgressRepository } from '@/backend/progress/domain/repositories/progress.repository';

function databaseName(value: string | undefined): string {
  assert(value, 'Set DATABASE_URL and PROGRESS_TEST_DATABASE_URL explicitly.');

  const url = new URL(value);
  assert.equal(url.protocol, 'mysql:');

  const name = decodeURIComponent(url.pathname.slice(1)).toLowerCase();
  assert(name && !name.includes('/'));

  return name;
}

const testUrl = process.env.PROGRESS_TEST_DATABASE_URL;
const testName = databaseName(testUrl);

assert(testName.endsWith('_test'), 'Progress smoke database must end in _test.');
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
  { eq },
  { getDatabase, closeDatabase },
  { PrepareSyllabusSeedServiceImpl },
  { SeedSyllabusCatalogRepository },
  { DrizzleSyllabusImporter },
  { DrizzleSyllabusCatalogRepository },
  { SyllabusCatalogServiceImpl },
  { ProgressCatalogAdapter },
  { DrizzleProgressRepository },
  { ProgressServiceImpl },
  { users },
  schema,
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
  import('@/backend/users/infrastructure/database/schema'),
  import('@/backend/progress/infrastructure/database/schema'),
]);

const db = getDatabase();

const userId = randomUUID();
const otherUserId = randomUUID();
const raceUserId = randomUUID();

const repository = new DrizzleProgressRepository();
const catalog = new ProgressCatalogAdapter(
  new SyllabusCatalogServiceImpl(new DrizzleSyllabusCatalogRepository()),
);
const service = new ProgressServiceImpl(repository, catalog);

async function main() {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });

  assert.equal(
    (await db.select().from(users)).length,
    0,
    'Provision an empty isolated test database.',
  );

  const canonical = await new PrepareSyllabusSeedServiceImpl(
    new SeedSyllabusCatalogRepository(),
  ).prepare();
  await new DrizzleSyllabusImporter().import(canonical);

  await db.insert(users).values([
    { id: userId, email: `${userId}@example.test`, displayName: 'Progress learner' },
    { id: otherUserId, email: `${otherUserId}@example.test`, displayName: 'Other learner' },
    { id: raceUserId, email: `${raceUserId}@example.test`, displayName: 'Concurrent learner' },
  ]);

  const attributions = await catalog.getPublishedAttributions();
  const attribution = attributions.find((item) =>
    item.postStudyQuestions.some((question) => question.difficultyLevel === 1),
  )!;
  assert(attribution);

  let sequence = 0;
  const sessionId = randomUUID();

  function request(
    overrides: Partial<RecordLearningEventRequest> = {},
  ): RecordLearningEventRequest {
    sequence += 1;

    return {
      eventId: randomUUID(),
      userId,
      skillId: attribution.skillId,
      sourceType: 'PRACTICE',
      sourceSessionId: sessionId,
      sourceEntityId: randomUUID(),
      questionType: 'SHORT_FREE_RESPONSE',
      isCorrect: true,
      numericScore: 100,
      confidenceWeight: 1,
      responseTimeMs: 1000,
      answeredAt: new Date(Date.UTC(2026, 9, 19, 0, 0, sequence)).toISOString(),
      producerSession: {
        status: 'COMPLETED',
        title: 'Fixture practice',
        startedAt: '2026-10-19T00:00:00.000Z',
        completedAt: '2026-10-19T00:10:00.000Z',
      },
      ...overrides,
    };
  }

  function postStudy(difficulty: number, isCorrect = true) {
    const owner = attributions.find(
      (item) =>
        item.lessonId === attribution.lessonId &&
        item.postStudyQuestions.some(
          (question) =>
            question.difficultyLevel === difficulty && question.skillCode === item.skillCode,
        ),
    );
    assert(owner);

    const question = owner.postStudyQuestions.find((item) => item.difficultyLevel === difficulty)!;

    return request({
      skillId: owner.skillId,
      sourceType: 'LESSON_POST_STUDY',
      sourceSessionId: null,
      sourceEntityId: question.id,
      questionType: question.questionType,
      isCorrect,
      numericScore: isCorrect ? 100 : 0,
      postStudy: { questionId: question.id, difficultyLevel: difficulty },
      producerSession: undefined,
    });
  }

  try {
    const siblingSkills = attributions
      .filter((item) => item.lessonId === attribution.lessonId)
      .slice(0, 2);
    assert.equal(siblingSkills.length, 2, 'Concurrency fixture requires two skills in one lesson.');

    await Promise.all(
      siblingSkills.map((item) =>
        repository.withSkillLock(raceUserId, item.skillId, async (tx) => {
          const previous = await tx.lockLesson(raceUserId, item.lessonId);

          await tx.saveLesson({
            ...previous,
            currentUnderstandingLevel: previous.currentUnderstandingLevel + 1,
            totalAttemptCount: previous.totalAttemptCount + 1,
            totalCorrectCount: previous.totalCorrectCount + 1,
          });
        }),
      ),
    );

    assert.equal(
      (await repository.findLesson(raceUserId, attribution.lessonId))?.currentUnderstandingLevel,
      2,
      'Separate skill locks must still serialize updates to their shared lesson.',
    );

    const practice = await service.recordLearningEvent(request());
    assert.equal(practice.lessonCompleted, false);
    assert.equal(await service.getLessonUnderstanding(userId, attribution.lessonId), null);

    const wrong = await service.recordLearningEvent(postStudy(1, false));
    assert.equal(wrong.lessonUnderstanding?.currentUnderstandingLevel, 0);
    assert.equal(wrong.lessonCompleted, false);

    const oldAuditTimestamp = new Date('2000-01-01T00:00:00.000Z');
    await db
      .update(schema.lessonUnderstandingSnapshots)
      .set({ updatedAt: oldAuditTimestamp })
      .where(eq(schema.lessonUnderstandingSnapshots.userId, userId));

    const correctRequest = postStudy(1);
    const correct = await service.recordLearningEvent(correctRequest);
    assert.equal(correct.lessonUnderstanding?.currentUnderstandingLevel, 1);
    assert.equal(correct.lessonCompleted, true);

    const [savedLesson] = await db
      .select()
      .from(schema.lessonUnderstandingSnapshots)
      .where(eq(schema.lessonUnderstandingSnapshots.userId, userId));
    assert(
      savedLesson.updatedAt > oldAuditTimestamp,
      'A new lesson attempt must update its persistence audit timestamp.',
    );

    const beforeReplay = await repository.readState(userId);
    assert.equal((await service.recordLearningEvent(correctRequest)).replayed, true);
    assert.deepEqual(await repository.readState(userId), beforeReplay);

    await assert.rejects(() =>
      service.recordLearningEvent({ ...correctRequest, userId: otherUserId }),
    );
    await assert.rejects(() => service.recordLearningEvent(postStudy(1)));
    await assert.rejects(() =>
      service.recordLearningEvent({
        ...postStudy(2),
        sourceEntityId: randomUUID(),
      }),
    );

    assert.deepEqual(
      await repository.readState(userId),
      beforeReplay,
      'Rejected answers must not leave events or snapshot updates.',
    );

    const failingRepository: ProgressRepository = {
      readState: (owner) => repository.readState(owner),
      findEvent: (owner, eventId) => repository.findEvent(owner, eventId),
      findLesson: (owner, lesson) => repository.findLesson(owner, lesson),
      withSkillLock: (owner, skill, work) =>
        repository.withSkillLock(owner, skill, (tx) =>
          work({
            ...tx,
            findEvent: (id) => tx.findEvent(id),
            getSkillHistory: (ownerId, skillId) => tx.getSkillHistory(ownerId, skillId),
            getMastery: () => tx.getMastery(),
            lockLesson: (ownerId, lessonId) => tx.lockLesson(ownerId, lessonId),
            insertEvent: (value) => tx.insertEvent(value),
            saveLesson: (value) => tx.saveLesson(value),
            saveMastery: async () => {
              throw new Error('Injected snapshot write failure');
            },
          }),
        ),
    };

    await assert.rejects(
      () => new ProgressServiceImpl(failingRepository, catalog).recordLearningEvent(request()),
      /Injected snapshot write failure/,
    );

    assert.deepEqual(
      await repository.readState(userId),
      beforeReplay,
      'A failure after insert must roll back the event too.',
    );

    await Promise.all(Array.from({ length: 24 }, () => service.recordLearningEvent(request())));

    const persisted = await repository.readState(userId);
    assert.equal(persisted.events.length, 27);
    assert.equal(
      persisted.skills.find((item) => item.skillId === attribution.skillId)?.attemptsWindowSize,
      20,
    );
    assert.equal(
      persisted.skills.find((item) => item.skillId === attribution.skillId)?.correctAttemptsCount,
      20,
    );

    for (let difficulty = 2; difficulty <= 10; difficulty += 1)
      await service.recordLearningEvent(postStudy(difficulty));

    const capped = await service.recordLearningEvent(postStudy(10));
    assert.equal(capped.lessonUnderstanding?.currentUnderstandingLevel, 10);
    assert.equal(capped.lessonUnderstanding?.totalAttemptCount, 12);
    assert.equal(capped.lessonUnderstanding?.totalCorrectCount, 11);

    await service.recordLearningEvent(
      request({ userId: otherUserId, numericScore: 0, isCorrect: false }),
    );

    const other = await service.getOverview(otherUserId);
    assert.equal(other.trackedSkillsCount, 1);
    assert.equal(other.lessonUnderstandingSummary.completedLessonsCount, 0);

    const overview = await service.getOverview(userId, { trackSlug: attribution.trackSlug });
    assert.equal(overview.lessonUnderstandingSummary.completedLessonsCount, 1);
    assert.equal(overview.lessonUnderstandingSummary.averageUnderstandingLevel, 10);
    assert.equal(
      (await service.getOverview(userId, { trackSlug: 'unknown-track' })).trackedSkillsCount,
      0,
    );

    const timeline = await service.getTimeline(userId, {
      offset: 1,
      limit: 2,
      sourceTypes: ['PRACTICE'],
      skillCodes: [attribution.skillCode],
    });
    assert.equal(timeline.totalRecords, 25);
    assert.equal(timeline.items.length, 2);
    assert(
      timeline.items.every(
        (item) => item.sourceType === 'PRACTICE' && item.skillCode === attribution.skillCode,
      ),
    );
    assert(timeline.items[0].answeredAt >= timeline.items[1].answeredAt);

    const sessions = await service.getSessions(userId, {
      offset: 0,
      limit: 10,
      sourceTypes: ['PRACTICE'],
    });
    assert.equal(sessions.totalRecords, 1);
    assert.equal(sessions.items[0].totalInteractions, 25);
    assert.equal(sessions.items[0].correctCount, 25);
    assert.equal(sessions.items[0].sourceSessionId, sessionId);
    assert.equal(sessions.items[0].sessionTitle, 'Fixture practice');

    const unpublishedCatalogService = new ProgressServiceImpl(repository, {
      getPublishedAttributions: async () => [],
    });
    assert.deepEqual(
      await unpublishedCatalogService.getOverview(userId, { trackSlug: attribution.trackSlug }),
      overview,
      'Unpublishing the catalog must retain persisted learner progress.',
    );
    assert.deepEqual(
      await unpublishedCatalogService.getTimeline(userId, {
        offset: 1,
        limit: 2,
        sourceTypes: ['PRACTICE'],
        skillCodes: [attribution.skillCode],
      }),
      timeline,
      'Timeline must retain attribution recorded when the learner answered.',
    );

    const unpublishedReplay = await unpublishedCatalogService.recordLearningEvent(correctRequest);
    assert.equal(unpublishedReplay.replayed, true);
    assert.equal(unpublishedReplay.lessonUnderstanding?.currentUnderstandingLevel, 10);

    const movedLessonId = attributions.find(
      (item) => item.lessonId !== attribution.lessonId,
    )!.lessonId;
    const movedCatalogService = new ProgressServiceImpl(repository, {
      getPublishedAttributions: async () =>
        attributions.map((item) => ({
          ...item,
          ...(item.skillId === correctRequest.skillId ? { lessonId: movedLessonId } : {}),
        })),
    });

    const movedReplay = await movedCatalogService.recordLearningEvent(correctRequest);
    assert.equal(movedReplay.replayed, true);
    assert.equal(movedReplay.lessonUnderstanding?.lessonId, attribution.lessonId);
    assert.equal(movedReplay.lessonUnderstanding?.currentUnderstandingLevel, 10);

    console.log(
      'Progress MySQL smoke passed: write-through, replay, owner isolation, canonical attribution, rollback, concurrent writes, window20, lesson 0->1/cap10, filtered reads and session aggregation.',
    );
  } finally {
    for (const owner of [userId, otherUserId, raceUserId]) {
      await db
        .delete(schema.lessonUnderstandingSnapshots)
        .where(eq(schema.lessonUnderstandingSnapshots.userId, owner));

      await db
        .delete(schema.skillMasterySnapshots)
        .where(eq(schema.skillMasterySnapshots.userId, owner));

      await db.delete(schema.progressEvents).where(eq(schema.progressEvents.userId, owner));
      await db.delete(users).where(eq(users.id, owner));
    }
  }
}

try {
  await main();
} finally {
  await closeDatabase();
}
