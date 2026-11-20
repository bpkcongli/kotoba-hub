import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { eq, sql } from 'drizzle-orm';
import { flashcardArtifactSchema } from '@/backend/flashcards/application/helpers/flashcard-artifact-schema';

function databaseName(value: string | undefined): string {
  assert(value, 'Set DATABASE_URL and VOCABULARY_TEST_DATABASE_URL explicitly.');

  const url = new URL(value);
  const name = decodeURIComponent(url.pathname.slice(1)).toLowerCase();

  assert.equal(url.protocol, 'mysql:');
  assert(name && !name.includes('/'));

  return name;
}

const testUrl = process.env.VOCABULARY_TEST_DATABASE_URL;

assert(databaseName(testUrl).endsWith('_test'), 'Vocabulary smoke database must end in _test.');
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
const { users } = await import('@/backend/users/infrastructure/database/schema');
const {
  flashcardDeckItems,
  flashcardItemStates,
  flashcardSessions,
  flashcardSessionAnswers,
  flashcardItems,
} = await import('@/backend/flashcards/infrastructure/database/schema');

const db = getDatabase();
const userId = randomUUID();
const activeSource = new FileCanonicalFlashcardSource();
const baselineDirectory = 'content/flashcards/drafts/voc-03-batch-02/baseline';
const reviewedSnapshot = JSON.parse(
  gunzipSync(await readFile('content/flashcards/drafts/voc-03-batch-03/baseline.json.gz')).toString(
    'utf8',
  ),
) as Record<string, string>;
let phase: 2 | 3 | 4 = 2;

const source = {
  readArtifacts: async () => {
    const artifacts = await activeSource.readArtifacts();

    if (phase === 4) return artifacts;

    const vocabulary = flashcardArtifactSchema.parse(
      JSON.parse(
        phase === 2
          ? await readFile(`${baselineDirectory}/vocabulary-foundation.json`, 'utf8')
          : reviewedSnapshot['vocabulary-foundation.json'],
      ),
    );

    return artifacts.map((artifact) =>
      artifact.contentType === 'VOCABULARY' ? vocabulary : artifact,
    );
  },
  readLocalizationOverlay: async () =>
    phase === 4
      ? activeSource.readLocalizationOverlay()
      : (JSON.parse(
          phase === 2
            ? await readFile(`${baselineDirectory}/localizations.v2.json`, 'utf8')
            : reviewedSnapshot['localizations.v2.json'],
        ) as Awaited<ReturnType<typeof activeSource.readLocalizationOverlay>>),
  readKanjiSkills: () => activeSource.readKanjiSkills(),
};

const syllabus = new SyllabusCatalogServiceImpl(new DrizzleSyllabusCatalogRepository());
const seedCatalog = new FlashcardSeedCatalogAdapter(syllabus);
const seedService = new PrepareFlashcardSeedServiceImpl(seedCatalog, source);
const importer = new DrizzleFlashcardImporter(seedCatalog);

const progressRepository = new DrizzleProgressRepository();
const progress = new ProgressServiceImpl(progressRepository, new ProgressCatalogAdapter(syllabus));

const service = new FlashcardServiceImpl(
  new DrizzleFlashcardRepository(),
  new FlashcardCatalogAdapter(syllabus),
  new FlashcardProgressAdapter(progress),
);

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

  const baseline = new SeedSyllabusCatalogRepository();

  await new DrizzleSyllabusImporter().import(
    await new PrepareSyllabusSeedServiceImpl(baseline).prepare(),
  );
  await new DrizzleBilingualImporter().import(
    await new PrepareBilingualSeedServiceImpl(baseline).prepare(
      'content/syllabus/v2/manifest.json',
    ),
    await baseline.getTracks(),
  );

  const inventory = (await source.readArtifacts()).flatMap((artifact) => artifact.items);
  const manifest = new StandaloneVocabularySeed(
    JSON.parse(reviewedSnapshot['manifest.v2.json']),
    inventory,
  ).manifest;
  const baselineManifest = new StandaloneVocabularySeed(
    JSON.parse(await readFile(`${baselineDirectory}/manifest.v2.json`, 'utf8')),
    inventory,
  ).manifest;
  const originalGroup = baselineManifest.groups.find(
    (entry) => entry.id === 'f4bce066-e07c-58b0-8b7e-1097b7515f08',
  );

  assert(originalGroup, 'Expected the reviewed VOC-03 batch-01 group.');
  assert.equal(originalGroup.items.length, 5);

  const existingIds = new Set(
    baselineManifest.groups.flatMap((group) => group.items.map((item) => item.itemId)),
  );
  const promotedIds = manifest.groups
    .flatMap((group) => group.items.map((item) => item.itemId))
    .filter((id) => !existingIds.has(id));

  assert(promotedIds.length > 0, 'Expected reviewed batch-02 promotions.');

  const penId = '506c5576-24cf-5e3f-ae16-77826bf0c8d1';

  assert(
    promotedIds.includes(penId),
    'The bounded option pool must release the batch-01 pen hold.',
  );

  const itemIds = [...new Set([penId, ...promotedIds])].slice(0, 5);
  const sourceHeld = JSON.parse(
    await readFile('content/flashcards/drafts/voc-03-batch-02/coverage.json', 'utf8'),
  ) as { heldItems: { itemId: string }[] };
  const heldId = sourceHeld.heldItems[0]?.itemId;

  assert(heldId, 'Expected a documented source identity hold.');
  assert(!promotedIds.includes(heldId));

  const groupImporter = new DrizzleVocabularyGroupImporter();

  // Recreate the pending inventory before the historical batch-01 promotion.
  await importer.import(await seedService.prepare([]));
  await groupImporter.import(baselineManifest, inventory);

  const original = await seedService.prepare(
    baselineManifest.groups.flatMap((group) =>
      group.items.map((item) => ({ ...item, targetSkillId: group.id })),
    ),
  );

  assert(itemIds.every((id) => original.items.some((item) => item.id === id && !item.skillId)));

  await importer.import(original);
  await db.insert(users).values({
    id: userId,
    email: `voc03-${userId}@example.test`,
    displayName: 'VOC03 fixture',
  });

  const custom = await service.createDeck(userId, {
    title: 'VOC03 preservation fixture',
    contentType: 'VOCABULARY',
    deckType: 'FOUNDATION',
    items: itemIds,
  });
  const request = {
    deckId: custom.id,
    questionScriptMode: 'JAPANESE' as const,
    answerScriptMode: 'MEANING' as const,
    contentFormat: 'localized' as const,
    contentLocale: 'id' as const,
  };
  const old = await service.createSession(userId, request);
  const existingDeck = await service.createDeck(userId, {
    title: 'VOC03 existing group fixture',
    contentType: 'VOCABULARY',
    deckType: 'FOUNDATION',
    items: originalGroup.items.map((item) => item.itemId),
  });
  const oldMapped = await service.createSession(userId, { ...request, deckId: existingDeck.id });

  assert(oldMapped.turns.every((turn) => turn.item.skillId === originalGroup.id));

  const firstPayload = { itemId: old.turns[0].id, selectedOptionId: old.turns[0].correctOptionId };
  const firstResult = await service.submitAnswer(userId, old.id, firstPayload);

  assert(old.turns.every((turn) => turn.item.skillId === null && turn.skillCode === null));
  assert.equal(firstResult.progressImpact, null);
  assert.equal(firstResult.localization?.resolvedLocale, 'en');
  assert.equal(firstResult.localization?.contentRevision, 2);

  const preservedRows = async () => ({
    states: await db
      .select()
      .from(flashcardItemStates)
      .where(eq(flashcardItemStates.userId, userId))
      .orderBy(flashcardItemStates.itemId),
    membership: await db
      .select()
      .from(flashcardDeckItems)
      .where(eq(flashcardDeckItems.deckId, custom.id))
      .orderBy(flashcardDeckItems.itemId),
    session: await db.select().from(flashcardSessions).where(eq(flashcardSessions.id, old.id)),
    mappedSession: await db
      .select()
      .from(flashcardSessions)
      .where(eq(flashcardSessions.id, oldMapped.id)),
    answers: await db
      .select()
      .from(flashcardSessionAnswers)
      .where(eq(flashcardSessionAnswers.sessionId, old.id)),
  });
  const before = await preservedRows();

  phase = 3;

  await groupImporter.import(manifest, inventory);
  await groupImporter.import(manifest, inventory);

  const promotions = manifest.groups.flatMap((entry) =>
    entry.items.map((item) => ({ ...item, targetSkillId: entry.id })),
  );
  const plan = await seedService.prepare(promotions);

  assert.equal(plan.counts.items, original.counts.items);
  assert.equal(plan.counts.mappedItems, original.counts.mappedItems + promotedIds.length);
  assert.equal(plan.counts.pendingItems, original.counts.pendingItems - promotedIds.length);

  await importer.import(plan);
  await importer.import(plan);

  const importedItems = await db
    .select({ id: flashcardItems.id, skillId: flashcardItems.skillId })
    .from(flashcardItems);

  assert.deepEqual(
    new Set(importedItems.map((item) => item.id)),
    new Set(original.items.map((item) => item.id)),
  );

  for (const group of manifest.groups) {
    for (const member of group.items) {
      assert.equal(importedItems.find((item) => item.id === member.itemId)?.skillId, group.id);
    }
  }

  assert.deepEqual(await preservedRows(), before);
  assert.deepEqual(await service.submitAnswer(userId, old.id, firstPayload), firstResult);

  const secondResult = await service.submitAnswer(userId, old.id, {
    itemId: old.turns[1].id,
    selectedOptionId: old.turns[1].correctOptionId,
  });

  assert.equal(secondResult.progressImpact, null);
  assert.equal((await progressRepository.readState(userId)).events.length, 0);

  const pairs = [
    ['JAPANESE', 'MEANING'],
    ['MEANING', 'JAPANESE'],
    ['MEANING', 'KANA'],
  ] as const;

  for (const contentLocale of ['en', 'id'] as const) {
    for (const [questionScriptMode, answerScriptMode] of pairs) {
      const fresh = await service.createSession(userId, {
        ...request,
        contentLocale,
        questionScriptMode,
        answerScriptMode,
      });

      assert.equal(fresh.turns.length, 5);
      assert.deepEqual(new Set(fresh.turns.map((turn) => turn.id)), new Set(itemIds));

      for (const turn of fresh.turns) {
        const group = manifest.groups.find((entry) =>
          entry.items.some((item) => item.itemId === turn.id),
        );

        assert(group);
        assert.equal(turn.item.skillId, group.id);
        assert.equal(turn.skillCode, group.code);
        assert.deepEqual(turn.localization, {
          requestedLocale: contentLocale,
          resolvedLocale: contentLocale,
          isFallback: false,
          contentRevision: 3,
          translationRevision: 3,
        });
        assert(turn.answerOptions.length >= 2);
      }

      if (contentLocale !== 'id' || questionScriptMode !== 'JAPANESE') continue;

      for (const turn of fresh.turns) {
        const group = manifest.groups.find((entry) =>
          entry.items.some((item) => item.itemId === turn.id),
        );

        assert(group);

        const payload = { itemId: turn.id, selectedOptionId: turn.correctOptionId };
        const result = await service.submitAnswer(userId, fresh.id, payload);

        assert.equal(result.isCorrect, true);
        assert.equal(result.progressImpact?.skillCode, group.code);
        assert.equal(result.localization?.resolvedLocale, 'id');
        assert.equal(result.feedback.vocabularyDetails?.meaning, turn.localizedContent?.meaning);
        assert.deepEqual(await service.submitAnswer(userId, fresh.id, payload), result);

        if (turn === fresh.turns.at(-1)) assert.equal(result.sessionProgress.isCompleted, true);
      }
    }
  }

  const state = await progressRepository.readState(userId);

  assert.equal(state.events.length, 5);
  assert.equal(
    state.skills.length,
    new Set(
      itemIds.map(
        (id) => manifest.groups.find((group) => group.items.some((item) => item.itemId === id))!.id,
      ),
    ).size,
  );
  assert.equal(state.lessons.length, 0);
  assert.deepEqual(
    new Set(state.events.map((event) => event.gradingMetadata?.flashcardItemId)),
    new Set(itemIds),
  );
  assert(
    state.events.every(
      (event) => manifest.groups.some((group) => group.id === event.skillId) && event.trackId,
    ),
  );
  assert(state.events.every((event) => event.lessonId === null && event.unitId === null));

  const timeline = await progress.getTimeline(userId, { limit: 10, offset: 0 });

  assert.equal(timeline.items.length, 5);
  assert(timeline.items.every((item) => item.lessonSlug === null && item.unitSlug === null));
  assert.equal(
    (await progress.getOverview(userId)).lessonUnderstandingSummary.completedLessonsCount,
    0,
  );

  const [heldItem] = await db.select().from(flashcardItems).where(eq(flashcardItems.id, heldId));

  assert(heldItem, 'Expected the source-held item to retain its existing item ID.');
  assert.equal(heldItem.skillId, null);
  assert.equal(heldItem.localizations?.id, undefined);

  const heldDeck = await service.createDeck(userId, {
    title: 'VOC03 held fallback fixture',
    contentType: 'VOCABULARY',
    deckType: 'FOUNDATION',
    items: sourceHeld.heldItems.map((item) => item.itemId),
  });
  const heldSession = await service.createSession(userId, { ...request, deckId: heldDeck.id });

  assert.equal(heldSession.turns[0].item.skillId, null);
  assert.equal(heldSession.turns[0].localization?.requestedLocale, 'id');
  assert.equal(heldSession.turns[0].localization?.resolvedLocale, 'en');
  assert.equal(heldSession.turns[0].localization?.isFallback, true);

  const heldResult = await service.submitAnswer(userId, heldSession.id, {
    itemId: heldId,
    selectedOptionId: heldSession.turns[0].correctOptionId,
  });

  assert.equal(heldResult.progressImpact, null);
  assert.equal(heldResult.localization?.resolvedLocale, 'en');
  assert.deepEqual(await service.submitAnswer(userId, old.id, firstPayload), firstResult);
  assert.equal((await progressRepository.readState(userId)).events.length, 5);

  const mappedPayload = {
    itemId: oldMapped.turns[0].id,
    selectedOptionId: oldMapped.turns[0].correctOptionId,
  };
  const mappedResult = await service.submitAnswer(userId, oldMapped.id, mappedPayload);

  assert.equal(mappedResult.progressImpact?.skillCode, originalGroup.code);
  assert.equal(mappedResult.localization?.contentRevision, 2);
  assert.deepEqual(await service.submitAnswer(userId, oldMapped.id, mappedPayload), mappedResult);
  assert.equal((await progressRepository.readState(userId)).events.length, 6);

  const resolution = JSON.parse(
    await readFile('content/flashcards/drafts/voc-03-batch-03/curation.json', 'utf8'),
  ) as {
    resolutions: { oldItemId: string; targetItemId: string; disposition: string }[];
  };
  const replacements = resolution.resolutions.filter(
    (entry) => entry.disposition === 'RETIRED_REPLACED',
  );

  assert.equal(replacements.length, 4);

  const oldIds = new Set(resolution.resolutions.map((entry) => entry.oldItemId));
  const newIds = new Set(replacements.map((entry) => entry.targetItemId));
  const preservedHeldRows = async () => ({
    earlier: await preservedRows(),
    heldMembership: await db
      .select()
      .from(flashcardDeckItems)
      .where(eq(flashcardDeckItems.deckId, heldDeck.id))
      .orderBy(flashcardDeckItems.itemId),
    heldSession: await db
      .select()
      .from(flashcardSessions)
      .where(eq(flashcardSessions.id, heldSession.id)),
    heldAnswers: await db
      .select()
      .from(flashcardSessionAnswers)
      .where(eq(flashcardSessionAnswers.sessionId, heldSession.id)),
    progress: await progressRepository.readState(userId),
  });
  const beforeResolution = await preservedHeldRows();
  const oldRecords = await db.select().from(flashcardItems);

  phase = 4;

  const correctedInventory = (await source.readArtifacts()).flatMap((artifact) => artifact.items);
  const correctedManifest = new StandaloneVocabularySeed(
    JSON.parse(await readFile('content/flashcards/vocabulary-groups/manifest.v2.json', 'utf8')),
    correctedInventory,
  ).manifest;
  const finalPromotions = correctedManifest.groups.flatMap((group) =>
    group.items.map((item) => ({ ...item, targetSkillId: group.id })),
  );

  await groupImporter.import(correctedManifest, correctedInventory);

  const corrected = await seedService.prepare(finalPromotions);

  assert.deepEqual(
    {
      items: corrected.counts.items,
      mapped: corrected.counts.mappedItems,
      pending: corrected.counts.pendingItems,
    },
    { items: 636, mapped: 636, pending: 0 },
  );
  await assert.rejects(importer.import(corrected), /Promotion requires existing pending item/);
  assert.deepEqual(await preservedHeldRows(), beforeResolution);
  assert.deepEqual(await db.select().from(flashcardItems), oldRecords);

  const bootstrap = await seedService.prepare(promotions);

  assert.equal(bootstrap.counts.pendingItems, 4);

  for (const id of newIds)
    assert.equal(bootstrap.items.find((item) => item.id === id)?.skillId, null);

  await importer.import(bootstrap);
  await importer.import(corrected);
  await importer.import(corrected);

  await assert.rejects(importer.import(bootstrap), /Flashcard item identity conflict/);
  assert.deepEqual(await preservedHeldRows(), beforeResolution);

  const resolvedRecords = await db.select().from(flashcardItems);

  for (const id of oldIds) {
    const previous = oldRecords.find((item) => item.id === id);

    assert(previous);

    const retired = resolvedRecords.find((item) => item.id === id);

    assert(retired);

    const { updatedAt: previousUpdatedAt, ...previousContent } = previous;
    const { updatedAt: retiredUpdatedAt, ...retiredContent } = retired;

    assert(retiredUpdatedAt >= previousUpdatedAt);
    assert.deepEqual(retiredContent, { ...previousContent, isActive: false });
    assert(!corrected.items.some((item) => item.id === id));
  }

  const currentStates = await db
    .select()
    .from(flashcardItemStates)
    .where(eq(flashcardItemStates.userId, userId));

  assert(
    currentStates.every((entry) => !newIds.has(entry.itemId)),
    'Replacement identities must not inherit Leitner state.',
  );

  const heldPayload = { itemId: heldId, selectedOptionId: heldSession.turns[0].correctOptionId };

  assert.deepEqual(await service.submitAnswer(userId, heldSession.id, heldPayload), heldResult);

  const nextFrozenTurn = heldSession.turns[1];

  assert(nextFrozenTurn && oldIds.has(nextFrozenTurn.id));

  const frozenPayload = {
    itemId: nextFrozenTurn.id,
    selectedOptionId: nextFrozenTurn.correctOptionId,
  };
  const frozenResult = await service.submitAnswer(userId, heldSession.id, frozenPayload);

  assert.equal(frozenResult.progressImpact, null);
  assert.equal(frozenResult.localization?.contentRevision, 3);
  assert.deepEqual(await service.submitAnswer(userId, heldSession.id, frozenPayload), frozenResult);
  assert.deepEqual(
    (await progressRepository.readState(userId)).events,
    beforeResolution.progress.events,
  );
  await assert.rejects(service.createSession(userId, { ...request, deckId: heldDeck.id }));

  const correctedDeck = await service.createDeck(userId, {
    title: 'VOC03 corrected identities fixture',
    contentType: 'VOCABULARY',
    deckType: 'FOUNDATION',
    items: resolution.resolutions.map((entry) => entry.targetItemId),
  });

  for (const contentLocale of ['en', 'id'] as const) {
    for (const [questionScriptMode, answerScriptMode] of pairs) {
      const fresh = await service.createSession(userId, {
        ...request,
        deckId: correctedDeck.id,
        contentLocale,
        questionScriptMode,
        answerScriptMode,
      });

      assert.equal(fresh.turns.length, 7);
      assert(fresh.turns.every((turn) => !oldIds.has(turn.id)));

      for (const turn of fresh.turns) {
        assert.deepEqual(turn.localization, {
          requestedLocale: contentLocale,
          resolvedLocale: contentLocale,
          isFallback: false,
          contentRevision: 4,
          translationRevision: 4,
        });
        assert.equal(turn.answerOptions.length, 4);
        assert.equal(new Set(turn.answerOptions.map((option) => option.value)).size, 4);

        if (newIds.has(turn.id)) {
          const owner = correctedManifest.groups.find((group) =>
            group.items.some((entry) => entry.itemId === turn.id),
          );

          assert(owner);
          assert.equal(turn.item.skillId, owner.id);
        } else {
          const existing = oldRecords.find((item) => item.id === turn.id);

          assert(existing?.skillId);
          assert.equal(turn.item.skillId, existing.skillId);
        }
      }
    }
  }

  const beforeNewAnswers = await db
    .select()
    .from(flashcardItemStates)
    .where(eq(flashcardItemStates.userId, userId))
    .orderBy(flashcardItemStates.itemId);
  const replacementDeck = await service.createDeck(userId, {
    title: 'VOC03 new identity progress fixture',
    contentType: 'VOCABULARY',
    deckType: 'FOUNDATION',
    items: [...newIds],
  });
  const newSession = await service.createSession(userId, {
    ...request,
    deckId: replacementDeck.id,
  });

  for (const turn of newSession.turns) {
    const payload = { itemId: turn.id, selectedOptionId: turn.correctOptionId };
    const result = await service.submitAnswer(userId, newSession.id, payload);

    assert.equal(result.isCorrect, true);
    assert.equal(result.bucketUpdate.previousBucket, 'NEW');
    assert.equal(result.bucketUpdate.currentBucket, 'LEARNING');
    assert.equal(result.bucketUpdate.consecutiveCorrectCount, 1);
    assert(result.progressImpact);
    assert.equal(result.localization?.resolvedLocale, 'id');
    assert.deepEqual(await service.submitAnswer(userId, newSession.id, payload), result);
  }

  const afterNewAnswers = await db
    .select()
    .from(flashcardItemStates)
    .where(eq(flashcardItemStates.userId, userId))
    .orderBy(flashcardItemStates.itemId);

  assert.deepEqual(
    afterNewAnswers.filter((entry) => !newIds.has(entry.itemId)),
    beforeNewAnswers,
  );

  const afterResolutionProgress = await progressRepository.readState(userId);

  assert.equal(afterResolutionProgress.events.length, beforeResolution.progress.events.length + 4);

  const newEvents = afterResolutionProgress.events.filter((event) =>
    newIds.has(String(event.gradingMetadata?.flashcardItemId)),
  );

  assert.equal(newEvents.length, 4);
  assert(newEvents.every((event) => event.unitId === null && event.lessonId === null));
  assert.deepEqual(await service.submitAnswer(userId, old.id, firstPayload), firstResult);
  assert.deepEqual(await service.submitAnswer(userId, oldMapped.id, mappedPayload), mappedResult);

  process.stdout.write(
    `VOC-03 MySQL real-content smoke passed: ${promotedIds.length} batch-02 promotions, repeatable upgrade from revision 2, preserved Leitner/custom deck/old snapshots and answer replay, six localized pairs including the released pen, idempotent group progress without lesson understanding, source-held English fallback, then revision 4 identity retirement/bootstrap/promotion with seven frozen identities and all 42 corrected localized pairs.\n`,
  );
} finally {
  await closeDatabase();
}
