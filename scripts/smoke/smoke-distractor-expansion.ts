import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { eq, sql } from 'drizzle-orm';
import { flashcardArtifactSchema } from '@/backend/flashcards/application/helpers/flashcard-artifact-schema';

function databaseName(value: string | undefined): string {
  assert(value, 'Set DATABASE_URL and TD006_TEST_DATABASE_URL explicitly.');

  const url = new URL(value);
  const name = decodeURIComponent(url.pathname.slice(1)).toLowerCase();

  assert.equal(url.protocol, 'mysql:');
  assert(name && !name.includes('/'));

  return name;
}

const testUrl = process.env.TD006_TEST_DATABASE_URL;

assert(databaseName(testUrl).endsWith('_test'), 'TD-006 smoke database must end in _test.');
assert.notEqual(databaseName(testUrl), databaseName(process.env.DATABASE_URL));
assert(
  process.argv.includes('--allow-test-db-write'),
  'Use an empty disposable database and --allow-test-db-write.',
);
assert.notEqual(process.env.NEXT_PUBLIC_API_MOCKING, 'true');

process.env.DATABASE_URL = testUrl;

const { migrate } = await import('drizzle-orm/mysql2/migrator');

const { getDatabase, closeDatabase } =
  await import('@/backend/shared/infrastructure/database/connection');

const { PrepareSyllabusSeedServiceImpl } =
  await import('@/backend/syllabus/application/services/impl/prepare-syllabus-seed.service.impl');
const { SeedSyllabusCatalogRepository } =
  await import('@/backend/syllabus/interface/secondary/seed/seed-syllabus-catalog.repository');
const { DrizzleSyllabusImporter } =
  await import('@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-importer');
const { PrepareBilingualSeedServiceImpl } =
  await import('@/backend/syllabus/application/services/impl/prepare-bilingual-seed.service.impl');
const { DrizzleBilingualImporter } =
  await import('@/backend/syllabus/interface/secondary/persistence/drizzle-bilingual-importer');

const { DrizzleVocabularyGroupImporter } =
  await import('@/backend/syllabus/interface/secondary/persistence/drizzle-vocabulary-group-importer');
const { StandaloneVocabularySeed } =
  await import('@/backend/syllabus/domain/value-objects/standalone-vocabulary-seed');
const { SyllabusCatalogServiceImpl } =
  await import('@/backend/syllabus/application/services/impl/syllabus-catalog.service.impl');
const { DrizzleSyllabusCatalogRepository } =
  await import('@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-catalog.repository');

const { PrepareFlashcardSeedServiceImpl } =
  await import('@/backend/flashcards/application/services/impl/prepare-flashcard-seed.service.impl');
const { FileCanonicalFlashcardSource } =
  await import('@/backend/flashcards/interface/secondary/seed/canonical-flashcard-source');
const { DrizzleFlashcardImporter } =
  await import('@/backend/flashcards/interface/secondary/seed/drizzle-flashcard-importer');
const { FlashcardSeedCatalogAdapter } =
  await import('@/backend/flashcards/interface/secondary/syllabus/flashcard-seed-catalog.adapter');
const { FlashcardCatalogAdapter } =
  await import('@/backend/flashcards/interface/secondary/syllabus/flashcard-catalog.adapter');
const { FlashcardServiceImpl } =
  await import('@/backend/flashcards/application/services/impl/flashcard.service.impl');
const { DrizzleFlashcardRepository } =
  await import('@/backend/flashcards/interface/secondary/persistence/drizzle-flashcard.repository');
const { FlashcardProgressAdapter } =
  await import('@/backend/flashcards/interface/secondary/progress/flashcard-progress.adapter');

const { ProgressServiceImpl } =
  await import('@/backend/progress/application/services/impl/progress.service.impl');
const { DrizzleProgressRepository } =
  await import('@/backend/progress/interface/secondary/persistence/drizzle-progress.repository');
const { ProgressCatalogAdapter } =
  await import('@/backend/progress/interface/secondary/syllabus/progress-catalog.adapter');

const { OptionSnapshotBuilder } =
  await import('@/backend/flashcards/domain/services/option-snapshot-builder');

const { users } = await import('@/backend/users/infrastructure/database/schema');
const {
  flashcardDeckItems,
  flashcardItemStates,
  flashcardItems,
  flashcardSessionAnswers,
  flashcardSessions,
} = await import('@/backend/flashcards/infrastructure/database/schema');

const reviewedRoot = 'content/flashcards/drafts/distractor-expansion-01/reviewed';
const activeSource = new FileCanonicalFlashcardSource();

const baselineSnapshot = JSON.parse(
  gunzipSync(
    await readFile('content/flashcards/drafts/distractor-expansion-01/baseline.json.gz'),
  ).toString('utf8'),
) as Record<string, string>;
const baselineVocabulary = flashcardArtifactSchema.parse(
  JSON.parse(baselineSnapshot['vocabulary-foundation.json']!),
);
const baselineLocalization = JSON.parse(baselineSnapshot['localizations.v2.json']!) as Awaited<
  ReturnType<typeof activeSource.readLocalizationOverlay>
>;

const reviewedManifest = JSON.parse(await readFile(`${reviewedRoot}/manifest.json`, 'utf8')) as {
  taskId: string;
  reviewStatus: string;
  integrationStatus: string;
  targetContentRevision: number;
  targetTranslationRevision: number;
  itemCount: number;
};

let useReviewedSource = false;
const source = {
  readArtifacts: async () => {
    const artifacts = await activeSource.readArtifacts();

    return useReviewedSource
      ? artifacts
      : artifacts.map((artifact) =>
          artifact.contentType === 'VOCABULARY' ? baselineVocabulary : artifact,
        );
  },
  readLocalizationOverlay: async () =>
    useReviewedSource ? activeSource.readLocalizationOverlay() : baselineLocalization,
  readKanjiSkills: () => activeSource.readKanjiSkills(),
};

const db = getDatabase();
const syllabus = new SyllabusCatalogServiceImpl(new DrizzleSyllabusCatalogRepository());
const seedCatalog = new FlashcardSeedCatalogAdapter(syllabus);
const seedService = new PrepareFlashcardSeedServiceImpl(seedCatalog, source);
const importer = new DrizzleFlashcardImporter(seedCatalog);

const repository = new DrizzleFlashcardRepository();
const progressRepository = new DrizzleProgressRepository();
const progress = new ProgressServiceImpl(progressRepository, new ProgressCatalogAdapter(syllabus));
const catalog = new FlashcardCatalogAdapter(syllabus);
const progressAdapter = new FlashcardProgressAdapter(progress);

const stableService = new FlashcardServiceImpl(
  repository,
  catalog,
  progressAdapter,
  undefined,
  new OptionSnapshotBuilder(() => 0),
);
const alternateService = new FlashcardServiceImpl(
  repository,
  catalog,
  progressAdapter,
  undefined,
  new OptionSnapshotBuilder((maximum) => maximum - 1),
);
const userId = randomUUID();

const preservationSnapshot = async (deckId: string, sessionId: string) => ({
  membership: await db
    .select()
    .from(flashcardDeckItems)
    .where(eq(flashcardDeckItems.deckId, deckId))
    .orderBy(flashcardDeckItems.itemId),
  states: await db
    .select()
    .from(flashcardItemStates)
    .where(eq(flashcardItemStates.userId, userId))
    .orderBy(flashcardItemStates.itemId),
  session: await db.select().from(flashcardSessions).where(eq(flashcardSessions.id, sessionId)),
  answers: await db
    .select()
    .from(flashcardSessionAnswers)
    .where(eq(flashcardSessionAnswers.sessionId, sessionId))
    .orderBy(flashcardSessionAnswers.turnNumber),
  progress: await progressRepository.readState(userId),
});

try {
  const [tables] = await db.execute(
    sql`select table_name from information_schema.tables where table_schema = database()`,
  );

  assert.deepEqual(
    tables,
    [],
    'Provision an empty disposable database; no existing tables allowed.',
  );

  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) });

  const seedCatalogRepository = new SeedSyllabusCatalogRepository();

  await new DrizzleSyllabusImporter().import(
    await new PrepareSyllabusSeedServiceImpl(seedCatalogRepository).prepare(),
  );
  await new DrizzleBilingualImporter().import(
    await new PrepareBilingualSeedServiceImpl(seedCatalogRepository).prepare(
      'content/syllabus/v2/manifest.json',
    ),
    await seedCatalogRepository.getTracks(),
  );

  const baselineInventory = (await source.readArtifacts()).flatMap((artifact) => artifact.items);

  const groupSeed = new StandaloneVocabularySeed(
    JSON.parse(await readFile('content/flashcards/vocabulary-groups/manifest.v2.json', 'utf8')),
    baselineInventory,
  );
  const groupImporter = new DrizzleVocabularyGroupImporter();

  await importer.import(await seedService.prepare([]));
  await groupImporter.import(groupSeed.manifest, baselineInventory);

  const promotions = groupSeed.manifest.groups.flatMap((group) =>
    group.items.map((item) => ({ ...item, targetSkillId: group.id })),
  );
  const baselinePlan = await seedService.prepare(promotions);

  assert.equal(baselinePlan.items.filter((item) => item.itemType === 'VOCABULARY').length, 636);
  assert(
    baselinePlan.items
      .filter((item) => item.itemType === 'VOCABULARY')
      .every((item) => item.contentRevision === 4),
  );

  await importer.import(baselinePlan);
  await importer.import(baselinePlan);

  await db.insert(users).values({
    id: userId,
    email: `td006-${userId}@example.test`,
    displayName: 'TD-006 preservation fixture',
  });

  const fixtureIds = baselinePlan.items
    .filter((item) => item.itemType === 'VOCABULARY' && item.skillId)
    .slice(0, 5)
    .map((item) => item.id);

  assert.equal(fixtureIds.length, 5);

  const customDeck = await stableService.createDeck(userId, {
    title: 'TD-006 preservation fixture',
    contentType: 'VOCABULARY',
    deckType: 'FOUNDATION',
    items: fixtureIds,
  });

  const request = {
    deckId: customDeck.id,
    questionScriptMode: 'JAPANESE' as const,
    answerScriptMode: 'MEANING' as const,
    contentFormat: 'localized' as const,
    contentLocale: 'id' as const,
  };
  const frozenSession = await stableService.createSession(userId, request);

  assert.equal(frozenSession.turns.length, 5);
  assert(
    frozenSession.turns.every(
      (turn) =>
        turn.localization?.contentRevision === 4 &&
        turn.localization.translationRevision === 4 &&
        turn.answerOptions.length === 4,
    ),
  );

  const firstPayload = {
    itemId: frozenSession.turns[0]!.id,
    selectedOptionId: frozenSession.turns[0]!.correctOptionId,
  };
  const firstResult = await stableService.submitAnswer(userId, frozenSession.id, firstPayload);

  assert.equal(firstResult.isCorrect, true);
  assert(firstResult.progressImpact);
  assert.equal(firstResult.localization?.contentRevision, 4);

  const beforeReseed = await preservationSnapshot(customDeck.id, frozenSession.id);
  const baselineOwnership = new Map(
    (
      await db
        .select({ id: flashcardItems.id, skillId: flashcardItems.skillId })
        .from(flashcardItems)
    ).map((item) => [item.id, item.skillId]),
  );

  useReviewedSource = true;

  assert.deepEqual(
    {
      taskId: reviewedManifest.taskId,
      reviewStatus: reviewedManifest.reviewStatus,
      revisions: [
        reviewedManifest.targetContentRevision,
        reviewedManifest.targetTranslationRevision,
      ],
      reviewedItems: reviewedManifest.itemCount,
    },
    {
      taskId: 'TD-006',
      reviewStatus: 'READY_FOR_INTEGRATION',
      revisions: [5, 5],
      reviewedItems: 746,
    },
  );
  assert(
    ['AWAITING_DATABASE_VALIDATION', 'DATABASE_VALIDATED', 'CANONICAL_SEED_INTEGRATED'].includes(
      reviewedManifest.integrationStatus,
    ),
  );

  const reviewedInventory = (await source.readArtifacts()).flatMap((artifact) => artifact.items);
  await groupImporter.import(groupSeed.manifest, reviewedInventory);
  await groupImporter.import(groupSeed.manifest, reviewedInventory);

  const reviewedPlan = await seedService.prepare(promotions);
  const reviewedVocabularyItems = reviewedPlan.items.filter(
    (item) => item.itemType === 'VOCABULARY',
  );

  assert.deepEqual(
    {
      items: reviewedPlan.counts.items,
      mappedItems: reviewedPlan.counts.mappedItems,
      pendingItems: reviewedPlan.counts.pendingItems,
      vocabularyItems: reviewedVocabularyItems.length,
    },
    { items: 636, mappedItems: 636, pendingItems: 0, vocabularyItems: 636 },
  );
  assert(
    reviewedVocabularyItems.every(
      (item) =>
        item.contentRevision === 5 &&
        Object.values(item.answerOptionPayload).every(
          (bank) => !bank || new Set(bank.distractors).size >= 6,
        ) &&
        Object.values(item.localizations ?? {}).every(
          (content) =>
            !content ||
            [...Object.values(content.scriptOptions), content.meaningOptions].every(
              (bank) => !bank || new Set(bank.distractors).size >= 6,
            ),
        ),
    ),
  );

  await importer.import(reviewedPlan);
  await importer.import(reviewedPlan);

  assert.deepEqual(
    new Map(
      (
        await db
          .select({ id: flashcardItems.id, skillId: flashcardItems.skillId })
          .from(flashcardItems)
      ).map((item) => [item.id, item.skillId]),
    ),
    baselineOwnership,
  );
  assert.deepEqual(await preservationSnapshot(customDeck.id, frozenSession.id), beforeReseed);
  assert.deepEqual(
    await stableService.submitAnswer(userId, frozenSession.id, firstPayload),
    firstResult,
  );

  const nextFrozenTurn = frozenSession.turns[1]!;
  const frozenResult = await stableService.submitAnswer(userId, frozenSession.id, {
    itemId: nextFrozenTurn.id,
    selectedOptionId: nextFrozenTurn.correctOptionId,
  });

  assert.equal(frozenResult.isCorrect, true);
  assert.equal(frozenResult.localization?.contentRevision, 4);
  assert.equal(frozenResult.localization?.translationRevision, 4);
  assert.deepEqual(
    await stableService.submitAnswer(userId, frozenSession.id, {
      itemId: nextFrozenTurn.id,
      selectedOptionId: nextFrozenTurn.correctOptionId,
    }),
    frozenResult,
  );

  const freshA = await stableService.createSession(userId, request);
  const freshB = await alternateService.createSession(userId, request);

  for (const session of [freshA, freshB]) {
    assert(
      session.turns.every(
        (turn) =>
          turn.localization?.contentRevision === 5 &&
          turn.localization.translationRevision === 5 &&
          turn.answerOptions.length === 4 &&
          new Set(turn.answerOptions.map((option) => option.value)).size === 4,
      ),
    );
  }

  assert(
    freshA.turns.some((turn, index) => {
      const other = freshB.turns[index]!;
      const correct = turn.answerOptions.find(
        (option) => option.id === turn.correctOptionId,
      )!.value;
      const distractors = (value: typeof turn) =>
        value.answerOptions
          .filter((option) => option.value !== correct)
          .map((option) => option.value)
          .sort();

      return JSON.stringify(distractors(turn)) !== JSON.stringify(distractors(other));
    }),
    'Deterministic opposite selections must produce a different reviewed distractor triple.',
  );

  const conflict = structuredClone(reviewedPlan);
  const conflictItem = conflict.items.find((item) => item.itemType === 'VOCABULARY')!;

  conflictItem.surfaceFormText = `${conflictItem.surfaceFormText} conflict`;

  const beforeConflict = await db.select().from(flashcardItems).orderBy(flashcardItems.id);

  await assert.rejects(importer.import(conflict), /without a new revision/);
  assert.deepEqual(
    await db.select().from(flashcardItems).orderBy(flashcardItems.id),
    beforeConflict,
  );
  await assert.rejects(importer.import(baselinePlan), /revision|without a new revision/i);
  assert.deepEqual(
    await db.select().from(flashcardItems).orderBy(flashcardItems.id),
    beforeConflict,
  );

  process.stdout.write(
    'TD-006 MySQL smoke passed: 746 reviewed canonical items, 636 runtime-eligible revision-5 items, repeatable reseed, six-distractor banks, varied deterministic triples, preserved IDs/group ownership/custom membership/Leitner/progress/frozen sessions, old-answer replay, and transactional conflict/rollback guards.\n',
  );
} finally {
  await closeDatabase();
}
