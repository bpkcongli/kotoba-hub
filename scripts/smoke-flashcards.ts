import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { FlashcardProgressPort } from '@/backend/flashcards/application/ports/flashcard-progress.port';
import type {
  AnswerResult,
  FlashcardRepository,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';

function databaseName(value: string | undefined): string {
  assert(value, 'Set DATABASE_URL and FLASHCARDS_TEST_DATABASE_URL explicitly.');

  const url = new URL(value);

  assert.equal(url.protocol, 'mysql:');

  const name = decodeURIComponent(url.pathname.slice(1)).toLowerCase();

  assert(name && !name.includes('/'));

  return name;
}

const testUrl = process.env.FLASHCARDS_TEST_DATABASE_URL;
assert(databaseName(testUrl).endsWith('_test'), 'Flashcard smoke database must end in _test.');
assert.notEqual(databaseName(testUrl), databaseName(process.env.DATABASE_URL));
assert(
  process.argv.includes('--allow-test-db-write'),
  'Pass --allow-test-db-write for isolated writes.',
);
assert.notEqual(process.env.NEXT_PUBLIC_API_MOCKING, 'true');
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
  { FlashcardCatalogAdapter },
  { FlashcardSeedCatalogAdapter },
  { PrepareFlashcardSeedServiceImpl },
  { FileCanonicalFlashcardSource },
  { DrizzleFlashcardImporter },
  { DrizzleFlashcardRepository },
  { FlashcardServiceImpl },
  { FlashcardProgressAdapter },
  { users },
  syllabusSchema,
  flashcardSchema,
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
  import('@/backend/flashcards/interface/secondary/syllabus/flashcard-catalog.adapter'),
  import('@/backend/flashcards/interface/secondary/syllabus/flashcard-seed-catalog.adapter'),
  import('@/backend/flashcards/application/services/impl/prepare-flashcard-seed.service.impl'),
  import('@/backend/flashcards/interface/secondary/seed/canonical-flashcard-source'),
  import('@/backend/flashcards/interface/secondary/seed/drizzle-flashcard-importer'),
  import('@/backend/flashcards/interface/secondary/persistence/drizzle-flashcard.repository'),
  import('@/backend/flashcards/application/services/impl/flashcard.service.impl'),
  import('@/backend/flashcards/interface/secondary/progress/flashcard-progress.adapter'),
  import('@/backend/users/infrastructure/database/schema'),
  import('@/backend/syllabus/infrastructure/database/schema'),
  import('@/backend/flashcards/infrastructure/database/schema'),
  import('@/backend/progress/infrastructure/database/schema'),
]);

const db = getDatabase();
const userId = randomUUID();
const otherUserId = randomUUID();
const skillId = randomUUID();
const mappedItemId = randomUUID();
const pendingItemId = randomUUID();

const repository = new DrizzleFlashcardRepository();
const syllabus = new SyllabusCatalogServiceImpl(new DrizzleSyllabusCatalogRepository());
const catalog = new FlashcardCatalogAdapter(syllabus);

const progressRepository = new DrizzleProgressRepository();
const progress = new ProgressServiceImpl(progressRepository, new ProgressCatalogAdapter(syllabus));

const handoff = new FlashcardProgressAdapter(progress);
const service = new FlashcardServiceImpl(repository, catalog, handoff);

async function main() {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });

  assert.equal(
    (await db.select().from(users)).length,
    0,
    'Provision an empty isolated test database.',
  );

  const syllabusPlan = await new PrepareSyllabusSeedServiceImpl(
    new SeedSyllabusCatalogRepository(),
  ).prepare();

  await new DrizzleSyllabusImporter().import(syllabusPlan);

  const seedService = new PrepareFlashcardSeedServiceImpl(
    new FlashcardSeedCatalogAdapter(syllabus),
    new FileCanonicalFlashcardSource(),
  );
  const plan = await seedService.prepare();

  assert(plan.decks.length > 0);

  const importer = new DrizzleFlashcardImporter();

  await importer.import(plan);

  const initialDecks = await db
    .select({ id: flashcardSchema.flashcardDecks.id })
    .from(flashcardSchema.flashcardDecks);
  const initialItems = await db
    .select({ id: flashcardSchema.flashcardItems.id })
    .from(flashcardSchema.flashcardItems);

  await importer.import(await seedService.prepare());

  assert.deepEqual(
    await db.select({ id: flashcardSchema.flashcardDecks.id }).from(flashcardSchema.flashcardDecks),
    initialDecks,
  );
  assert.deepEqual(
    await db.select({ id: flashcardSchema.flashcardItems.id }).from(flashcardSchema.flashcardItems),
    initialItems,
  );
  assert.equal(initialDecks.length, plan.counts.decks);
  assert.equal(initialItems.length, plan.counts.items);
  assert(plan.items.filter((item) => item.skillId === null).length > 0);

  const publishedCatalog = await new FlashcardSeedCatalogAdapter(syllabus).getPublishedCatalog();

  assert(
    plan.items.every(
      (item) => !item.skillId || publishedCatalog.skills.some((skill) => skill.id === item.skillId),
    ),
  );

  await db.insert(users).values([
    { id: userId, email: `${userId}@example.test`, displayName: 'Flashcard learner' },
    { id: otherUserId, email: `${otherUserId}@example.test`, displayName: 'Other learner' },
  ]);

  const [lesson] = await db.select().from(syllabusSchema.lessons);

  assert(lesson);

  await db.insert(syllabusSchema.skills).values({
    id: skillId,
    lessonId: lesson.id,
    code: `smoke_${skillId}`,
    slug: `smoke-${skillId}`,
    curriculumLevel: 'N5',
    title: 'Smoke kanji recall',
    skillType: 'KANJI',
    supportsFlashcards: true,
    sortOrder: 1000,
    isPublished: true,
  });

  const itemValues = {
    itemType: 'KANJI_CHARACTER',
    surfaceFormText: '日',
    kanaDisplayText: 'にち',
    englishMeaning: 'day / sun',
    onyomiReadings: ['ニチ'],
    kunyomiReadings: ['ひ'],
    exampleWords: [],
    answerOptionPayload: {
      KANJI: { canonicalAnswer: '日', distractors: ['月', '火', '木'] },
      KANA: { canonicalAnswer: 'にち', distractors: ['つき', 'ひ', 'き'] },
      ENGLISH: { canonicalAnswer: 'day / sun', distractors: ['moon', 'fire', 'tree'] },
    },
    isActive: true,
  };

  await db.insert(flashcardSchema.flashcardItems).values([
    { ...itemValues, id: mappedItemId, skillId },
    { ...itemValues, id: pendingItemId, skillId: null },
  ]);

  try {
    const deck = await service.createDeck(userId, {
      title: 'Smoke kanji',
      deckType: 'FOUNDATION',
      contentType: 'KANJI',
      items: [mappedItemId, pendingItemId],
    });
    const request = {
      deckId: deck.id,
      questionScriptMode: 'KANJI' as const,
      answerScriptMode: 'ENGLISH' as const,
    };

    assert.equal(await repository.findDeck(otherUserId, deck.id), null);
    await assert.rejects(() => service.createSession(otherUserId, request));

    const session = await service.createSession(userId, request);
    const answerRequest = {
      itemId: mappedItemId,
      selectedOptionId: session.turns[0].correctOptionId,
      responseTimeMs: 900,
    };

    await assert.rejects(() => service.submitAnswer(otherUserId, session.id, answerRequest));

    let failProgress = true;
    const failingHandoff: FlashcardProgressPort = {
      recordAnswer: async (...arguments_) => {
        if (failProgress) {
          failProgress = false;

          throw new Error('Injected progress failure');
        }

        return handoff.recordAnswer(...arguments_);
      },
    };
    const retryService = new FlashcardServiceImpl(repository, catalog, failingHandoff);

    await assert.rejects(
      () => retryService.submitAnswer(userId, session.id, answerRequest),
      /Injected progress failure/,
    );
    assert.equal((await progressRepository.readState(userId)).events.length, 0);

    const [committed] = await db
      .select()
      .from(flashcardSchema.flashcardSessionAnswers)
      .where(eq(flashcardSchema.flashcardSessionAnswers.sessionId, session.id));

    assert(committed && !committed.progressRecorded);
    assert.equal(
      (await repository.getItemStates(userId, [mappedItemId]))[mappedItemId]
        .consecutiveCorrectCount,
      1,
    );

    const result = await retryService.submitAnswer(userId, session.id, answerRequest);

    assert.equal(result.progressImpact?.progressEventId, committed.answerPayload.eventId);
    assert.deepEqual(await service.submitAnswer(userId, session.id, answerRequest), result);
    assert.equal((await progressRepository.readState(userId)).events.length, 1);
    assert.equal((await progress.getOverview(userId)).trackedSkillsCount, 1);
    assert.equal((await progress.getOverview(otherUserId)).trackedSkillsCount, 0);

    const local = await service.submitAnswer(userId, session.id, {
      itemId: pendingItemId,
      selectedOptionId: session.turns[1].correctOptionId,
    });

    assert.equal(local.progressImpact, null);
    assert.equal(local.sessionProgress.isCompleted, true);
    assert.equal((await progressRepository.readState(userId)).events.length, 1);

    class FailingAcknowledgementRepository extends DrizzleFlashcardRepository {
      failed = false;

      override async saveProgressResult(answerId: string, value: AnswerResult) {
        if (!this.failed) {
          this.failed = true;

          throw new Error('Injected acknowledgement failure');
        }

        return super.saveProgressResult(answerId, value);
      }
    }

    const secondSession = await service.createSession(userId, request);
    const secondTurn = secondSession.turns.find((turn) => turn.id === mappedItemId)!;
    const secondRequest = { itemId: mappedItemId, selectedOptionId: secondTurn.correctOptionId };
    const ackService = new FlashcardServiceImpl(
      new FailingAcknowledgementRepository(),
      catalog,
      handoff,
    );

    await assert.rejects(
      () => ackService.submitAnswer(userId, secondSession.id, secondRequest),
      /Injected acknowledgement failure/,
    );
    assert.equal((await progressRepository.readState(userId)).events.length, 2);

    await db
      .update(syllabusSchema.skills)
      .set({ isPublished: false })
      .where(eq(syllabusSchema.skills.id, skillId));
    await ackService.submitAnswer(userId, secondSession.id, secondRequest);
    await db
      .update(syllabusSchema.skills)
      .set({ isPublished: true })
      .where(eq(syllabusSchema.skills.id, skillId));

    assert.equal((await progressRepository.readState(userId)).events.length, 2);
    assert.equal(
      (await repository.getItemStates(userId, [mappedItemId]))[mappedItemId]
        .consecutiveCorrectCount,
      2,
    );

    const rollbackRepository: FlashcardRepository = {
      listDecks: (...arguments_) => repository.listDecks(...arguments_),
      findDeck: (...arguments_) => repository.findDeck(...arguments_),
      findItems: (...arguments_) => repository.findItems(...arguments_),
      getDeckItems: (...arguments_) => repository.getDeckItems(...arguments_),
      getItemStates: (...arguments_) => repository.getItemStates(...arguments_),
      createDeck: (...arguments_) => repository.createDeck(...arguments_),
      createSession: (...arguments_) => repository.createSession(...arguments_),
      saveProgressResult: (...arguments_) => repository.saveProgressResult(...arguments_),
      withSessionLock: (owner, sessionId, work) =>
        repository.withSessionLock(owner, sessionId, (tx) =>
          work({
            session: tx.session,
            findAnswer: (id) => tx.findAnswer(id),
            lockItemState: (id) => tx.lockItemState(id),
            saveAnswer: async (...arguments_) => {
              await tx.saveAnswer(...arguments_);

              throw new Error('Injected transaction failure');
            },
          }),
        ),
    };

    const rollbackService = new FlashcardServiceImpl(rollbackRepository, catalog, handoff);
    const rollbackSession = await service.createSession(userId, request);
    const beforeState = await repository.getItemStates(userId, [mappedItemId]);
    const rollbackTurn = rollbackSession.turns[0];

    await assert.rejects(
      () =>
        rollbackService.submitAnswer(userId, rollbackSession.id, {
          itemId: rollbackTurn.id,
          selectedOptionId: rollbackTurn.correctOptionId,
        }),
      /Injected transaction failure/,
    );
    assert.deepEqual(await repository.getItemStates(userId, [mappedItemId]), beforeState);
    assert.equal(
      (
        await db
          .select()
          .from(flashcardSchema.flashcardSessionAnswers)
          .where(eq(flashcardSchema.flashcardSessionAnswers.sessionId, rollbackSession.id))
      ).length,
      0,
    );
    assert.equal((await progressRepository.readState(userId)).events.length, 2);

    const concurrentDeck = await service.createDeck(userId, {
      title: 'Concurrent kanji',
      deckType: 'FOUNDATION',
      contentType: 'KANJI',
      items: [mappedItemId],
    });
    const concurrentRequest = { ...request, deckId: concurrentDeck.id };
    const duplicateSession = await service.createSession(userId, concurrentRequest);
    const duplicateAnswer = {
      itemId: mappedItemId,
      selectedOptionId: duplicateSession.turns[0].correctOptionId,
    };

    const duplicates = await Promise.all([
      service.submitAnswer(userId, duplicateSession.id, duplicateAnswer),
      service.submitAnswer(userId, duplicateSession.id, duplicateAnswer),
    ]);

    assert.deepEqual(duplicates[0], duplicates[1]);
    assert.equal((await progressRepository.readState(userId)).events.length, 3);
    assert.equal(
      (await repository.getItemStates(userId, [mappedItemId]))[mappedItemId]
        .consecutiveCorrectCount,
      3,
    );

    const parallelSessions = await Promise.all([
      service.createSession(userId, concurrentRequest),
      service.createSession(userId, concurrentRequest),
    ]);

    await Promise.all(
      parallelSessions.map((value) =>
        service.submitAnswer(userId, value.id, {
          itemId: mappedItemId,
          selectedOptionId: value.turns[0].correctOptionId,
        }),
      ),
    );

    assert.equal((await progressRepository.readState(userId)).events.length, 5);
    assert.equal(
      (await repository.getItemStates(userId, [mappedItemId]))[mappedItemId]
        .consecutiveCorrectCount,
      5,
    );

    console.log(
      'Flashcards MySQL smoke passed: repeatable import, published attribution, private decks, snapshot grading, producer commit/retry, progress acknowledgement retry, unmapped local answers, owner isolation, concurrent duplicate/session writes and transactional rollback.',
    );
  } finally {
    const owners = [userId, otherUserId];

    await db
      .delete(progressSchema.skillMasterySnapshots)
      .where(inArray(progressSchema.skillMasterySnapshots.userId, owners));

    await db
      .delete(progressSchema.progressEvents)
      .where(inArray(progressSchema.progressEvents.userId, owners));

    await db
      .delete(flashcardSchema.flashcardItemStates)
      .where(inArray(flashcardSchema.flashcardItemStates.userId, owners));

    const sessionIds = (
      await db
        .select({ id: flashcardSchema.flashcardSessions.id })
        .from(flashcardSchema.flashcardSessions)
        .where(inArray(flashcardSchema.flashcardSessions.userId, owners))
    ).map((session) => session.id);

    if (sessionIds.length)
      await db
        .delete(flashcardSchema.flashcardSessionAnswers)
        .where(inArray(flashcardSchema.flashcardSessionAnswers.sessionId, sessionIds));

    await db
      .delete(flashcardSchema.flashcardSessions)
      .where(inArray(flashcardSchema.flashcardSessions.userId, owners));

    const decks = (
      await db
        .select({ id: flashcardSchema.flashcardDecks.id })
        .from(flashcardSchema.flashcardDecks)
        .where(inArray(flashcardSchema.flashcardDecks.ownerUserId, owners))
    ).map((deck) => deck.id);

    if (decks.length)
      await db
        .delete(flashcardSchema.flashcardDeckItems)
        .where(inArray(flashcardSchema.flashcardDeckItems.deckId, decks));

    await db
      .delete(flashcardSchema.flashcardDecks)
      .where(inArray(flashcardSchema.flashcardDecks.ownerUserId, owners));

    await db
      .delete(flashcardSchema.flashcardItems)
      .where(inArray(flashcardSchema.flashcardItems.id, [mappedItemId, pendingItemId]));
    await db.delete(syllabusSchema.skills).where(eq(syllabusSchema.skills.id, skillId));
    await db.delete(users).where(inArray(users.id, owners));
  }
}

try {
  await main();
} finally {
  await closeDatabase();
}
