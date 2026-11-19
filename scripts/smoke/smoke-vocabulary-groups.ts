import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq, sql } from 'drizzle-orm';

const testUrl = process.env.VOCABULARY_TEST_DATABASE_URL;
assert(testUrl, 'Set VOCABULARY_TEST_DATABASE_URL explicitly.');

const parsed = new URL(testUrl);
assert(parsed.protocol === 'mysql:' && parsed.pathname.endsWith('_test'));
assert(!process.env.DATABASE_URL || parsed.pathname !== new URL(process.env.DATABASE_URL).pathname);
assert(
  process.argv.includes('--allow-test-db-write'),
  'Use a disposable database and --allow-test-db-write.',
);

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
const { DrizzleVocabularyGroupImporter } =
  await import('@/backend/syllabus/interface/secondary/persistence/drizzle-vocabulary-group-importer');
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
const { skills } = await import('@/backend/syllabus/infrastructure/database/schema');
const { flashcardDeckItems, flashcardItemStates, flashcardSessions, flashcardItems } =
  await import('@/backend/flashcards/infrastructure/database/schema');

const db = getDatabase();
const userId = randomUUID();
const groupId = randomUUID();

const source = new FileCanonicalFlashcardSource();
const syllabus = new SyllabusCatalogServiceImpl(new DrizzleSyllabusCatalogRepository());
const seedCatalog = new FlashcardSeedCatalogAdapter(syllabus);
const seedService = new PrepareFlashcardSeedServiceImpl(seedCatalog, source);
const importer = new DrizzleFlashcardImporter(seedCatalog);
const groupImporter = new DrizzleVocabularyGroupImporter();

const progressRepository = new DrizzleProgressRepository();
const progress = new ProgressServiceImpl(progressRepository, new ProgressCatalogAdapter(syllabus));
const handoff = new FlashcardProgressAdapter(progress);

let loseProgressResponse = false;

const service = new FlashcardServiceImpl(
  new DrizzleFlashcardRepository(),
  new FlashcardCatalogAdapter(syllabus),
  {
    recordAnswer: async (...args) => {
      const result = await handoff.recordAnswer(...args);

      if (loseProgressResponse) {
        loseProgressResponse = false;
        throw new Error('Injected lost progress response');
      }

      return result;
    },
  },
);

const migrationRoot = await mkdtemp(join(tmpdir(), 'kotoba-voc02-migrations-'));

try {
  await mkdir(join(migrationRoot, 'meta'));

  const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8')) as {
    entries: { tag: string }[];
  };
  const baseline = {
    ...journal,
    entries: journal.entries.filter((entry) => !entry.tag.startsWith('0008')),
  };

  await writeFile(join(migrationRoot, 'meta/_journal.json'), JSON.stringify(baseline));

  for (const entry of baseline.entries)
    await copyFile(`drizzle/${entry.tag}.sql`, join(migrationRoot, `${entry.tag}.sql`));

  await migrate(db, { migrationsFolder: migrationRoot });

  assert.equal((await db.select().from(users)).length, 0, 'Use an empty disposable database.');

  const legacyTrack = randomUUID(),
    legacyUnit = randomUUID(),
    legacyLesson = randomUUID(),
    legacySkill = randomUUID();

  await db.execute(
    sql`insert into tracks (id,slug,curriculum_level,title,sort_order) values (${legacyTrack},'voc02-legacy-track','N5','Legacy',100)`,
  );
  await db.execute(
    sql`insert into units (id,track_id,slug,title,sort_order) values (${legacyUnit},${legacyTrack},'voc02-legacy-unit','Legacy',1)`,
  );
  await db.execute(
    sql`insert into lessons (id,unit_id,slug,title,sort_order) values (${legacyLesson},${legacyUnit},'voc02-legacy-lesson','Legacy',1)`,
  );
  await db.execute(
    sql`insert into skills (id,lesson_id,code,slug,curriculum_level,title,skill_type,sort_order) values (${legacySkill},${legacyLesson},'voc02_legacy','voc02-legacy','N5','Legacy','VOCABULARY',1)`,
  );

  await migrate(db, { migrationsFolder: 'drizzle' });

  const legacy = (await db.select().from(skills).where(eq(skills.id, legacySkill)))[0];

  assert.equal(legacy.lessonId, legacyLesson);
  assert.equal(legacy.ownerType, 'LESSON');

  const initial = await new PrepareSyllabusSeedServiceImpl(
    new SeedSyllabusCatalogRepository(),
  ).prepare();
  await new DrizzleSyllabusImporter().import(initial);

  await db
    .insert(users)
    .values({ id: userId, email: `voc02-${userId}@example.test`, displayName: 'VOC02 fixture' });

  const original = await seedService.prepare();
  await importer.import(original);

  const inventory = (await source.readArtifacts()).flatMap((artifact) => artifact.items);
  const pending = inventory
    .filter(
      (item) => item.itemType === 'VOCABULARY' && item.mappingStatus === 'PENDING_LESSON_MAPPING',
    )
    .slice(0, 2);
  assert.equal(pending.length, 2);

  const custom = await service.createDeck(userId, {
    title: 'VOC02 preservation fixture',
    contentType: 'VOCABULARY',
    deckType: 'FOUNDATION',
    items: pending.map((item) => item.id),
  });

  const old = await service.createSession(userId, {
    deckId: custom.id,
    questionScriptMode: 'JAPANESE',
    answerScriptMode: 'ENGLISH',
  });

  const firstPayload = { itemId: old.turns[0].id, selectedOptionId: old.turns[0].correctOptionId };

  const firstResult = await service.submitAnswer(userId, old.id, firstPayload);

  assert.equal(firstResult.progressImpact, null);

  const beforeStates = await db
    .select()
    .from(flashcardItemStates)
    .where(eq(flashcardItemStates.userId, userId));
  const beforeMembers = await db
    .select()
    .from(flashcardDeckItems)
    .where(eq(flashcardDeckItems.deckId, custom.id));
  const [beforeSession] = await db
    .select()
    .from(flashcardSessions)
    .where(eq(flashcardSessions.id, old.id));

  const text = {
    title: 'Test vocabulary group',
    description: null,
    sourceRevision: 1,
    translationRevision: 1,
    isPublished: true,
    sourceRefs: ['VOC-02 test fixture; not editorial content'],
  };

  const group = {
    id: groupId,
    code: `voc02_test_${groupId.replaceAll('-', '')}`,
    slug: `voc02-test-${groupId}`,
    trackSlug: pending[0].trackSlug,
    curriculumLevel: 'N5',
    sortOrder: 1,
    contentRevision: 1,
    isPublished: true,
    sourceRefs: ['VOC-02 isolated smoke'],
    items: pending.map((item) => ({ itemId: item.id, pendingSkillCode: item.skillCode })),
    localizations: { en: text, id: text },
  };

  const manifest = {
    schemaVersion: '2.0.0',
    kind: 'STANDALONE_VOCABULARY_GROUPS',
    groups: [group],
  };

  await groupImporter.import(manifest, inventory);
  await groupImporter.import(manifest, inventory);

  const promotions = group.items.map((item) => ({ ...item, targetSkillId: groupId }));
  const plan = await seedService.prepare(promotions);

  await importer.import(plan);
  await importer.import(plan);

  assert.deepEqual(
    await db.select().from(flashcardItemStates).where(eq(flashcardItemStates.userId, userId)),
    beforeStates,
  );

  assert.deepEqual(
    await db.select().from(flashcardDeckItems).where(eq(flashcardDeckItems.deckId, custom.id)),
    beforeMembers,
  );

  assert.deepEqual(
    (await db.select().from(flashcardSessions).where(eq(flashcardSessions.id, old.id)))[0],
    beforeSession,
  );

  assert.deepEqual(await service.submitAnswer(userId, old.id, firstPayload), firstResult);

  const secondResult = await service.submitAnswer(userId, old.id, {
    itemId: old.turns[1].id,
    selectedOptionId: old.turns[1].correctOptionId,
  });

  assert.equal(secondResult.progressImpact, null);
  assert.equal((await progressRepository.readState(userId)).events.length, 0);

  await assert.rejects(() => importer.import(original), /identity conflict/);

  await assert.rejects(
    () =>
      importer.import({
        ...plan,
        vocabularyPromotions: [{ ...promotions[0], pendingSkillCode: 'wrong' }],
      }),
    /Invalid promotion/,
  );

  await assert.rejects(
    () =>
      groupImporter.import(
        { ...manifest, groups: [{ ...group, items: [group.items[0]] }] },
        inventory,
      ),
    /membership is immutable/,
  );

  await assert.rejects(() =>
    db.update(skills).set({ supportsPracticeObjective: true }).where(eq(skills.id, groupId)),
  );

  const fresh = await service.createSession(userId, {
    deckId: custom.id,
    questionScriptMode: 'JAPANESE',
    answerScriptMode: 'ENGLISH',
  });

  assert(fresh.turns.every((turn) => turn.item.skillId === groupId));

  loseProgressResponse = true;
  const payload = { itemId: fresh.turns[0].id, selectedOptionId: fresh.turns[0].correctOptionId };

  await assert.rejects(() => service.submitAnswer(userId, fresh.id, payload), /Injected lost/);

  await groupImporter.import(
    { ...manifest, groups: [{ ...group, isPublished: false }] },
    inventory,
  );

  const recovered = await service.submitAnswer(userId, fresh.id, payload);

  assert(recovered.progressImpact && recovered.progressImpact.masteryScore < 80);

  const state = await progressRepository.readState(userId);

  assert.equal(state.events.length, 1);
  assert.equal(state.lessons.length, 0);
  assert.equal(state.events[0].lessonId, null);
  assert.equal(state.events[0].unitId, null);
  assert.equal(state.events[0].skillId, groupId);
  assert.deepEqual(await service.submitAnswer(userId, fresh.id, payload), recovered);

  await groupImporter.import(manifest, inventory);

  const last = await service.submitAnswer(userId, fresh.id, {
    itemId: fresh.turns[1].id,
    selectedOptionId: fresh.turns[1].correctOptionId,
  });

  assert(last.progressImpact && last.progressImpact.masteryScore >= 90);

  const timeline = await progress.getTimeline(userId, { limit: 10, offset: 0 });

  assert(timeline.items.every((item) => item.lessonSlug === null && item.unitSlug === null));
  assert.equal(
    (await progress.getOverview(userId)).lessonUnderstandingSummary.completedLessonsCount,
    0,
  );

  for (const item of pending)
    assert.equal(
      (await db.select().from(flashcardItems).where(eq(flashcardItems.id, item.id)))[0].skillId,
      groupId,
    );

  const { PrepareBilingualSeedServiceImpl } =
    await import('@/backend/syllabus/application/services/impl/prepare-bilingual-seed.service.impl');
  const { DrizzleBilingualImporter } =
    await import('@/backend/syllabus/interface/secondary/persistence/drizzle-bilingual-importer');

  const rawSyllabus = new SeedSyllabusCatalogRepository();
  const bilingualPlan = await new PrepareBilingualSeedServiceImpl(rawSyllabus).prepare(
    'content/syllabus/v2/manifest.json',
  );

  const groupBeforeMerge = (await db.select().from(skills).where(eq(skills.id, groupId)))[0];

  await new DrizzleBilingualImporter().import(bilingualPlan, await rawSyllabus.getTracks());

  assert.deepEqual(
    (await db.select().from(skills).where(eq(skills.id, groupId)))[0],
    groupBeforeMerge,
  );
  assert.equal((await progressRepository.readState(userId)).events.length, 2);

  process.stdout.write(
    'VOC-02 MySQL migration, promotion, preservation, coverage and retry smoke passed.\n',
  );
} finally {
  await closeDatabase();
  await rm(migrationRoot, { recursive: true, force: true });
}
