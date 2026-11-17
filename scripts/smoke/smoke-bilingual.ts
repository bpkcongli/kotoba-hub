import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';

const testUrl = process.env.BILINGUAL_TEST_DATABASE_URL;
assert(testUrl, 'Set BILINGUAL_TEST_DATABASE_URL explicitly.');

const parsed = new URL(testUrl);
assert(
  parsed.protocol === 'mysql:' && parsed.pathname.endsWith('_test'),
  'Use an isolated MySQL database ending in _test.',
);
assert(
  !process.env.DATABASE_URL || parsed.pathname !== new URL(process.env.DATABASE_URL).pathname,
  'Test database must differ from DATABASE_URL.',
);
assert(
  process.argv.includes('--allow-test-db-write'),
  'Pass --allow-test-db-write for this disposable database.',
);

process.env.DATABASE_URL = testUrl;

const { migrate } = await import('drizzle-orm/mysql2/migrator');
const { getDatabase, closeDatabase } =
  await import('@/backend/shared/infrastructure/database/connection');
const s = await import('@/backend/syllabus/infrastructure/database/schema');
const u = await import('@/backend/users/infrastructure/database/schema');
const p = await import('@/backend/practice/infrastructure/database/schema');
const { progressEvents, lessonUnderstandingSnapshots } =
  await import('@/backend/progress/infrastructure/database/schema');
const { PrepareBilingualSeedServiceImpl } =
  await import('@/backend/syllabus/application/services/impl/prepare-bilingual-seed.service.impl');
const { SeedSyllabusCatalogRepository } =
  await import('@/backend/syllabus/interface/secondary/seed/seed-syllabus-catalog.repository');
const { PrepareSyllabusSeedServiceImpl } =
  await import('@/backend/syllabus/application/services/impl/prepare-syllabus-seed.service.impl');
const { DrizzleBilingualImporter } =
  await import('@/backend/syllabus/interface/secondary/persistence/drizzle-bilingual-importer');
const { DrizzleSyllabusImporter } =
  await import('@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-importer');
const { DrizzleSyllabusCatalogRepository } =
  await import('@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-catalog.repository');
const { localizedCutoverBlockers } =
  await import('@/backend/syllabus/application/helpers/localize-syllabus');
const { syllabusCatalogService } = await import('@/backend/syllabus/infrastructure/di');
const { PracticeServiceImpl } =
  await import('@/backend/practice/application/services/impl/practice.service.impl');
const { DrizzlePracticeRepository } =
  await import('@/backend/practice/interface/secondary/persistence/drizzle-practice.repository');
const { DrizzlePostStudyDeliveryRepository } =
  await import('@/backend/practice/interface/secondary/persistence/drizzle-post-study-delivery.repository');
const { PracticeCatalogAdapter } =
  await import('@/backend/practice/interface/secondary/syllabus/practice-catalog.adapter');
const { PracticeProgressAdapter } =
  await import('@/backend/practice/interface/secondary/progress/practice-progress.adapter');
const { progressService } = await import('@/backend/progress/infrastructure/di');

const unused = async (): Promise<never> => {
  throw new Error('AI/random practice must not run in the bilingual smoke.');
};

const progress = new PracticeProgressAdapter(progressService);
let failProgressOnce = false;
let now = new Date();

const practiceService = new PracticeServiceImpl(
  new DrizzlePracticeRepository(),
  new PracticeCatalogAdapter(syllabusCatalogService),
  {
    getUnderstanding: (...args) => progress.getUnderstanding(...args),
    recordEvent: (...args) => {
      if (failProgressOnce) {
        failProgressOnce = false;
        throw new Error('Injected progress outage after delivery consumption.');
      }
      return progress.recordEvent(...args);
    },
  },
  { getRecommendation: unused },
  { generate: unused, grade: unused },
  undefined,
  () => now,
  new DrizzlePostStudyDeliveryRepository(),
);

const { userPreferencesService } = await import('@/backend/users/infrastructure/di');
const { toLessonNextDto, toLessonAnswerDto } =
  await import('@/backend/practice/interface/primary/rest/dto/practice.response.dto');

const db = getDatabase();

try {
  await migrate(db, { migrationsFolder: 'drizzle' });

  const raw = new SeedSyllabusCatalogRepository();
  const v1 = await new PrepareSyllabusSeedServiceImpl(raw).prepare();

  const outside = structuredClone(v1.tracks[0].units[0]);
  outside.id = randomUUID();
  outside.slug = `bil03-outside-${outside.id}`;
  outside.sortOrder = 100;
  outside.lessons = [structuredClone(outside.lessons[0])];

  const extraLesson = outside.lessons[0];
  extraLesson.id = randomUUID();
  extraLesson.slug = `bil03-outside-${extraLesson.id}`;
  extraLesson.skills = [structuredClone(extraLesson.skills[0])];

  const extraSkill = extraLesson.skills[0];
  extraSkill.id = randomUUID();
  extraSkill.code = `bil03_${extraSkill.id}`;
  extraSkill.slug = `bil03-${extraSkill.id}`;
  extraSkill.prerequisiteSkillCodes = [];

  extraLesson.contentBlocks = [
    {
      id: randomUUID(),
      blockType: 'PARAGRAPH',
      content: { body: '<p>Outside batch.</p>' },
      sortOrder: 1,
      isPublished: true,
    },
  ];

  extraLesson.postStudyQuestions?.forEach((q) => {
    q.id = randomUUID();
    q.skillCode = extraSkill.code;
  });

  v1.tracks[0].units.push(outside);
  const expanded = await new PrepareSyllabusSeedServiceImpl({
    getTracks: async () => v1.tracks,
  }).prepare();

  await new DrizzleSyllabusImporter().import(expanded);

  const userId = randomUUID();
  await db
    .insert(u.users)
    .values({ id: userId, email: `${userId}@bil03.test`, displayName: 'Bilingual test' });

  assert.deepEqual(await userPreferencesService.get(userId), {
    contentLocale: 'en',
    uiLocale: 'en',
  });

  await userPreferencesService.patch(userId, { uiLocale: 'id' });
  assert.deepEqual(await userPreferencesService.patch(userId, { contentLocale: 'id' }), {
    contentLocale: 'id',
    uiLocale: 'id',
  });
  assert.equal(
    (await db.select().from(u.learnerProfiles).where(eq(u.learnerProfiles.userId, userId))).length,
    0,
  );

  const lesson = v1.tracks[0].units[0].lessons[0];
  const before = await practiceService.nextLessonQuestion(userId, lesson.slug);
  const original = lesson.postStudyQuestions!.find((q) => q.id === before.question.id)!;

  await practiceService.submitLessonAnswer(userId, {
    lessonSlug: lesson.slug,
    questionId: original.id,
    idempotencyKey: randomUUID(),
    userAnswer: {
      rawInputRomaji: '',
      normalizedKana: (original.expectedAnswer.acceptedTextAnswers as string[])[0],
    },
  });

  const progressBefore = await db
    .select()
    .from(progressEvents)
    .where(eq(progressEvents.userId, userId));
  const understandingBefore = await db
    .select()
    .from(lessonUnderstandingSnapshots)
    .where(eq(lessonUnderstandingSnapshots.userId, userId));
  const outsideBefore = await db.select().from(s.lessons).where(eq(s.lessons.id, extraLesson.id));

  const plan = await new PrepareBilingualSeedServiceImpl(raw).prepare(
    'content/syllabus/v2/manifest.json',
  );
  const baseline = await raw.getTracks();
  const importer = new DrizzleBilingualImporter();

  await assert.rejects(importer.import(plan), /Unavailable prerequisite/);

  const backfill = await importer.import(plan, baseline);
  assert.equal(backfill.prerequisiteSkillCodes.length, 21);
  assert.deepEqual((await importer.import(plan, baseline)).prerequisiteSkillCodes, []);

  const backfilledSkills = await db.select().from(s.skills);

  for (const code of backfill.prerequisiteSkillCodes) {
    const owner = baseline
      .flatMap((t) => t.units.flatMap((unit) => unit.lessons))
      .find((l) => l.skills.some((skill) => skill.code === code))!;
    const sourceSkill = owner.skills.find((skill) => skill.code === code)!;
    const saved = backfilledSkills.find((skill) => skill.code === code)!;

    assert.equal(saved.id, sourceSkill.id);
    assert.deepEqual(saved.content, sourceSkill.content);
    assert.equal(saved.seedSchemaVersion, '1.0.0');
    assert.equal(
      (await db.select().from(s.lessons).where(eq(s.lessons.id, owner.id)))[0].isPublished,
      false,
    );
  }

  assert.deepEqual(
    await db.select().from(s.lessons).where(eq(s.lessons.id, extraLesson.id)),
    outsideBefore,
  );
  assert.deepEqual(
    await db.select().from(progressEvents).where(eq(progressEvents.userId, userId)),
    progressBefore,
  );
  assert.deepEqual(
    await db
      .select()
      .from(lessonUnderstandingSnapshots)
      .where(eq(lessonUnderstandingSnapshots.userId, userId)),
    understandingBefore,
  );

  assert((await db.select().from(s.skills).where(eq(s.skills.id, extraSkill.id)))[0].isPublished);
  assert.deepEqual(
    localizedCutoverBlockers(await new DrizzleSyllabusCatalogRepository().getTracks()),
    [extraLesson.slug],
  );
  await assert.rejects(new DrizzleSyllabusImporter().import(v1), /v1 reseed is forbidden/);

  const current = await syllabusCatalogService.getPublishedLesson(lesson.slug, 'id');
  assert.equal(current?.lesson.localization?.resolvedLocale, 'id');
  assert.equal(
    (await syllabusCatalogService.getPublishedTracks('id')).flatMap((t) =>
      t.units.flatMap((unit) => unit.lessons),
    ).length,
    16,
  );

  const idText = (
    await db
      .select()
      .from(s.lessonTranslations)
      .where(
        and(eq(s.lessonTranslations.lessonId, lesson.id), eq(s.lessonTranslations.locale, 'id')),
      )
  )[0];

  await db
    .update(s.lessonTranslations)
    .set({ sourceRevision: 1 })
    .where(
      and(eq(s.lessonTranslations.lessonId, lesson.id), eq(s.lessonTranslations.locale, 'id')),
    );

  if (idText.sourceRevision > 1)
    assert.equal(
      (await syllabusCatalogService.getPublishedLesson(lesson.slug, 'id'))?.lesson.localization
        ?.resolvedLocale,
      'en',
    );

  await db
    .update(s.lessonTranslations)
    .set({ isPublished: false })
    .where(
      and(eq(s.lessonTranslations.lessonId, lesson.id), eq(s.lessonTranslations.locale, 'id')),
    );
  assert.equal(
    (await syllabusCatalogService.getPublishedLesson(lesson.slug, 'id'))?.lesson.localization
      ?.isFallback,
    true,
  );

  await importer.import(plan, baseline);

  const next = await practiceService.nextLessonQuestion(userId, lesson.slug, 'id');
  const stale = await practiceService.nextLessonQuestion(userId, lesson.slug, 'id');

  assert(next.deliveryId && next.expiresAt && next.question.localization);

  const serialized = JSON.stringify(toLessonNextDto(next));
  assert(
    !serialized.includes('acceptedTextAnswers') &&
      !serialized.includes('sourceRefs') &&
      !serialized.includes('explanation'),
  );

  const [delivery] = await db
    .select()
    .from(p.practicePostStudyDeliveries)
    .where(eq(p.practicePostStudyDeliveries.id, next.deliveryId));

  const answer = {
    lessonSlug: lesson.slug,
    questionId: next.question.id,
    contentFormat: 'localized' as const,
    deliveryId: next.deliveryId,
    idempotencyKey: randomUUID(),
    userAnswer: {
      rawInputRomaji: '',
      normalizedKana: (
        delivery.snapshotPayload.question.expectedAnswer.acceptedTextAnswers as string[]
      )[0],
    },
  };

  await userPreferencesService.patch(userId, { contentLocale: 'en' });

  const results = await Promise.allSettled([
    practiceService.submitLessonAnswer(userId, answer),
    practiceService.submitLessonAnswer(userId, { ...answer, idempotencyKey: randomUUID() }),
  ]);

  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const result = results.find((r) => r.status === 'fulfilled')!;
  assert(result.status === 'fulfilled');

  const [consumed] = await db
    .select()
    .from(p.practicePostStudyDeliveries)
    .where(eq(p.practicePostStudyDeliveries.id, next.deliveryId));
  const [receipt] = await db
    .select()
    .from(p.practicePostStudyReceipts)
    .where(eq(p.practicePostStudyReceipts.id, consumed.receiptId!));
  const replayRequest = { ...answer, idempotencyKey: receipt.idempotencyKey };

  assert.equal(result.value.localization?.resolvedLocale, 'id');
  await db
    .update(p.practicePostStudyDeliveries)
    .set({ expiresAt: new Date('2000-01-01T00:00:00Z') })
    .where(eq(p.practicePostStudyDeliveries.id, next.deliveryId));

  assert.deepEqual(await practiceService.submitLessonAnswer(userId, replayRequest), result.value);
  assert.equal(
    (await db.select().from(progressEvents).where(eq(progressEvents.userId, userId))).length,
    progressBefore.length + 1,
  );
  assert.equal(toLessonAnswerDto(result.value).deliveryId, next.deliveryId);

  await assert.rejects(
    practiceService.submitLessonAnswer(userId, {
      ...answer,
      questionId: stale.question.id,
      deliveryId: stale.deliveryId,
      idempotencyKey: randomUUID(),
    }),
    (error: unknown) => (error as { code: number }).code === 142206002,
  );

  await assert.rejects(
    practiceService.submitLessonAnswer(randomUUID(), { ...answer, idempotencyKey: randomUUID() }),
    (error: unknown) => (error as { code: number }).code === 140406002,
  );

  const invalid = structuredClone(plan);
  invalid.tracks[0].localizations.en!.title += ' changed';
  await assert.rejects(importer.import(invalid, baseline), /without.*revision/);

  const canonical = structuredClone(plan);
  canonical.tracks[0].units[0].lessons[0].estimatedMinutes = 99;
  await assert.rejects(importer.import(canonical, baseline), /without revision/);

  const recover = await practiceService.nextLessonQuestion(userId, lesson.slug, 'id');
  const [recoverDelivery] = await db
    .select()
    .from(p.practicePostStudyDeliveries)
    .where(eq(p.practicePostStudyDeliveries.id, recover.deliveryId!));

  const recoveryRequest = {
    ...answer,
    deliveryId: recover.deliveryId!,
    questionId: recover.question.id,
    idempotencyKey: randomUUID(),
    userAnswer: {
      rawInputRomaji: '',
      normalizedKana: (
        recoverDelivery.snapshotPayload.question.expectedAnswer.acceptedTextAnswers as string[]
      )[0],
    },
  };

  // Alter live grading content to prove that the delivered answer and feedback remain immutable.
  await db
    .update(s.lessonPostStudyQuestions)
    .set({
      expectedAnswerPayload: {
        acceptedTextAnswers: ['ばつ'],
        normalizationProfile: 'kana-strict-v1',
      },
    })
    .where(eq(s.lessonPostStudyQuestions.id, recover.question.id));

  failProgressOnce = true;

  await assert.rejects(
    practiceService.submitLessonAnswer(userId, recoveryRequest),
    /Injected progress outage/,
  );

  await importer.import(plan, baseline);
  now = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const recovered = await practiceService.submitLessonAnswer(userId, recoveryRequest);
  assert.equal(recovered.isCorrect, true);
  assert.equal(recovered.feedbackText, recoverDelivery.snapshotPayload.question.explanation);
  assert.deepEqual(await practiceService.submitLessonAnswer(userId, recoveryRequest), recovered);
  assert.equal(
    (await db.select().from(progressEvents).where(eq(progressEvents.userId, userId))).length,
    progressBefore.length + 2,
  );

  await assert.rejects(
    practiceService.submitLessonAnswer(userId, {
      ...answer,
      deliveryId: stale.deliveryId!,
      idempotencyKey: randomUUID(),
    }),
    (error: unknown) => (error as { code: number }).code === 142206002,
  );

  await db.update(s.lessons).set({ isPublished: false }).where(eq(s.lessons.id, extraLesson.id));
  await db.update(s.units).set({ isPublished: false }).where(eq(s.units.id, outside.id));
  assert.deepEqual(
    localizedCutoverBlockers(await new DrizzleSyllabusCatalogRepository().getTracks()),
    [],
  );

  process.stdout.write(
    'BIL-03 MySQL migration/backfill, merge/reseed, revision rollback, preferences, fallback, delivery ownership/concurrency/replay and progress preservation passed.\n',
  );
} finally {
  await closeDatabase();
}
