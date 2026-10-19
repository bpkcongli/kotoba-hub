import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { SyllabusSeedPlan } from '@/backend/syllabus/application/services/prepare-syllabus-seed.service';
import type { SyllabusTrackSnapshot } from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';

function databaseName(value: string | undefined): string {
  assert(value, 'Set DATABASE_URL and SYLLABUS_TEST_DATABASE_URL explicitly.');

  const url = new URL(value);
  assert.equal(url.protocol, 'mysql:', 'Smoke verification requires MySQL.');
  assert(url.hostname && url.username && url.password, 'Database URL is incomplete.');

  const name = decodeURIComponent(url.pathname.slice(1)).toLowerCase();
  assert(name && !name.includes('/'), 'Database URL must name one database.');

  return name;
}

const testUrl = process.env.SYLLABUS_TEST_DATABASE_URL;
const testName = databaseName(testUrl);

assert(testName.endsWith('_test'), 'SYLLABUS_TEST_DATABASE_URL database must end in _test.');
assert.notEqual(
  testName,
  databaseName(process.env.DATABASE_URL),
  'Test database name must differ from DATABASE_URL, even on a different server.',
);
assert(
  process.argv.includes('--allow-test-db-write'),
  'Pass --allow-test-db-write to authorize migrations and fixture writes in the isolated test DB.',
);

process.env.DATABASE_URL = testUrl;

const [
  { migrate },
  { getDatabase, closeDatabase },
  { PrepareSyllabusSeedServiceImpl },
  { SeedSyllabusCatalogRepository },
  { DrizzleSyllabusImporter },
  { DrizzleSyllabusCatalogRepository },
  { SyllabusCatalogServiceImpl },
  { toLessonDto, toUnitDto },
  schema,
] = await Promise.all([
  import('drizzle-orm/mysql2/migrator'),
  import('@/backend/shared/infrastructure/database/connection'),
  import('@/backend/syllabus/application/services/impl/prepare-syllabus-seed.service.impl'),
  import('@/backend/syllabus/interface/secondary/seed/seed-syllabus-catalog.repository'),
  import('@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-importer'),
  import('@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-catalog.repository'),
  import('@/backend/syllabus/application/services/impl/syllabus-catalog.service.impl'),
  import('@/backend/syllabus/interface/primary/rest/dto/syllabus.response.dto'),
  import('@/backend/syllabus/infrastructure/database/schema'),
]);

const db = getDatabase();
const importer = new DrizzleSyllabusImporter();
const catalog = new SyllabusCatalogServiceImpl(new DrizzleSyllabusCatalogRepository());

async function snapshot() {
  const rows = await Promise.all([
    db.select().from(schema.tracks),
    db.select().from(schema.units),
    db.select().from(schema.lessons),
    db.select().from(schema.skills),
    db.select().from(schema.lessonContentBlocks),
    db.select().from(schema.lessonPostStudyQuestions),
    db.select().from(schema.unitSkillMappings),
  ]);

  return rows.map((tableRows) =>
    tableRows
      .map(({ createdAt, updatedAt, ...row }) => {
        void createdAt;
        void updatedAt;

        return row;
      })
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}

function planFromTracks(tracks: SyllabusTrackSnapshot[]) {
  return new PrepareSyllabusSeedServiceImpl({ getTracks: async () => tracks }).prepare();
}

function allLessons(plan: SyllabusSeedPlan) {
  return plan.tracks.flatMap((track) => track.units.flatMap((unit) => unit.lessons));
}

function assertOrder(values: { sortOrder: number }[], label: string) {
  assert.deepEqual(
    values.map((value) => value.sortOrder),
    values.map((value) => value.sortOrder).sort((a, b) => a - b),
    label,
  );
}

async function main() {
  console.log(
    'Applying migrations and mutating fixtures in the explicitly isolated test database.',
  );
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });

  assert(
    (await snapshot()).every((rows) => rows.length === 0),
    'Provision an empty isolated database before running this smoke verification.',
  );

  const canonical = await new PrepareSyllabusSeedServiceImpl(
    new SeedSyllabusCatalogRepository(),
  ).prepare();

  try {
    await importer.import(canonical);
    const first = await snapshot();

    assert.deepEqual(
      first.map((rows) => rows.length),
      [
        canonical.counts.tracks,
        canonical.counts.units,
        canonical.counts.lessons,
        canonical.counts.skills,
        canonical.counts.contentBlocks,
        canonical.counts.questions,
        canonical.counts.mappings,
      ],
    );

    const expectedIds = [
      canonical.tracks.map((track) => track.id),
      canonical.tracks.flatMap((track) => track.units.map((unit) => unit.id)),
      allLessons(canonical).map((lesson) => lesson.id),
      allLessons(canonical).flatMap((lesson) => lesson.skills.map((skill) => skill.id)),
      allLessons(canonical).flatMap((lesson) => lesson.contentBlocks.map((block) => block.id)),
      allLessons(canonical).flatMap((lesson) =>
        lesson.postStudyQuestions!.map((question) => question.id),
      ),
    ];

    for (const [index, ids] of expectedIds.entries()) {
      assert.deepEqual(
        first[index].map((row) => row.id),
        ids.sort(),
      );
    }

    await importer.import(canonical);

    assert.deepEqual(await snapshot(), first, 'Reseeding must preserve IDs, metadata and counts.');

    for (const rejected of canonical.rejectedLessons) {
      assert.equal(await catalog.getPublishedLesson(rejected.slug), null);
    }

    for (const lesson of allLessons(canonical)) {
      const result = await catalog.getPublishedLesson(lesson.slug);

      assert(result);
      assert.equal(toLessonDto(result, catalog, true, true).postStudyQuiz.bankQuestionCount, 10);

      for (let difficulty = 1; difficulty <= 10; difficulty += 1) {
        const question = await catalog.getCanonicalPostStudyQuestion(lesson.slug, difficulty);

        assert.equal(
          question?.question.id,
          lesson.postStudyQuestions!.find((entry) => entry.difficultyLevel === difficulty)?.id,
        );
      }
    }

    const reorderedTracks = structuredClone(canonical.tracks);
    for (const track of reorderedTracks) {
      const unitOrders = track.units.map((unit) => unit.sortOrder).reverse();
      for (const [unitIndex, unit] of track.units.entries()) {
        unit.sortOrder = unitOrders[unitIndex];

        const lessonOrders = unit.lessons.map((lesson) => lesson.sortOrder).reverse();
        for (const [lessonIndex, lesson] of unit.lessons.entries()) {
          lesson.sortOrder = lessonOrders[lessonIndex];

          const skillOrders = lesson.skills.map((skill) => skill.sortOrder).reverse();
          for (const [index, skill] of lesson.skills.entries())
            skill.sortOrder = skillOrders[index];

          const blockOrders = lesson.contentBlocks.map((block) => block.sortOrder).reverse();
          for (const [index, block] of lesson.contentBlocks.entries())
            block.sortOrder = blockOrders[index];
        }
      }
    }

    const reordered = await planFromTracks(reorderedTracks);
    await importer.import(reordered);

    for (const track of reordered.tracks) {
      for (const unit of track.units) {
        const result = await catalog.getPublishedUnit(unit.slug);
        assert(result);

        const dto = toUnitDto(result, catalog, true, true);

        assert.deepEqual(
          dto.lessons.map((lesson) => lesson.id),
          unit.lessons.map((lesson) => lesson.id),
        );
        assertOrder(dto.unitSkills, 'Unit skills must follow persisted mapping order.');

        for (const lesson of unit.lessons) {
          const detail = await catalog.getPublishedLesson(lesson.slug);
          assert(detail);

          const lessonDto = toLessonDto(detail, catalog, true, true);

          assert.deepEqual(
            lessonDto.skills.map((skill) => skill.id),
            lesson.skills.map((skill) => skill.id),
          );
          assert.deepEqual(
            lessonDto.contentBlocks.map((block) => block.id),
            lesson.contentBlocks.map((block) => block.id),
          );
        }
      }
    }

    // Every canonical skill currently has quiz references, so add one unused fixture skill before moving it.
    const moveTracks = structuredClone(canonical.tracks);
    const [sourceUnit, targetUnit] = moveTracks[0].units;
    assert(sourceUnit && targetUnit, 'Move verification requires two published units.');

    const sourceLesson = sourceUnit.lessons[0];
    const targetLesson = targetUnit.lessons[0];
    const unusedSkill = {
      ...structuredClone(sourceLesson.skills[0]),
      id: randomUUID(),
      code: 'smoke_unused_skill',
      slug: 'smoke-unused-skill',
      sortOrder: Math.max(...sourceLesson.skills.map((skill) => skill.sortOrder)) + 1,
      prerequisiteSkillCodes: [],
    };
    sourceLesson.skills.push(unusedSkill);

    await importer.import(await planFromTracks(moveTracks));

    sourceLesson.skills = sourceLesson.skills.filter((skill) => skill.id !== unusedSkill.id);
    unusedSkill.sortOrder = Math.max(...targetLesson.skills.map((skill) => skill.sortOrder)) + 1;
    targetLesson.skills.push(unusedSkill);

    await importer.import(await planFromTracks(moveTracks));

    const mappings = (await db.select().from(schema.unitSkillMappings)).filter(
      (mapping) => mapping.skillId === unusedSkill.id,
    );

    assert.equal(mappings.length, 1, 'Moved skill must have exactly one current unit mapping.');
    assert.equal(mappings[0].unitId, targetUnit.id);
    assert.equal(mappings[0].lessonId, targetLesson.id);

    for (const unit of [sourceUnit, targetUnit]) {
      const result = await catalog.getPublishedUnit(unit.slug);
      assert(result);

      const dto = toUnitDto(result, catalog, true, true);

      assertOrder(dto.unitSkills, 'Moved skill mapping must respect unit display order.');
      assert.equal(
        dto.unitSkills.filter((mapping) => mapping.skillCode === unusedSkill.code).length,
        unit.id === targetUnit.id ? 1 : 0,
      );
    }

    const expansionTracks = structuredClone(canonical.tracks);
    const expansionUnit = expansionTracks[0].units[0];
    const curated = structuredClone(expansionUnit.lessons[0]);
    curated.id = randomUUID();
    curated.slug = 'smoke-newly-curated-lesson';
    curated.sortOrder = Math.max(...expansionUnit.lessons.map((lesson) => lesson.sortOrder)) + 1;

    const codeMap = new Map(
      curated.skills.map((skill, index) => [skill.code, `smoke_curated_${index}`]),
    );
    curated.skills = curated.skills.map((skill, index) => ({
      ...skill,
      id: randomUUID(),
      code: codeMap.get(skill.code)!,
      slug: `smoke-curated-${index}`,
      prerequisiteSkillCodes: [],
    }));

    curated.contentBlocks = curated.contentBlocks.map((block) => ({
      ...block,
      id: randomUUID(),
      content:
        block.blockType === 'GRAMMAR_STRUCTURE'
          ? { ...block.content, skillCode: codeMap.get(block.content!.skillCode as string) }
          : block.content,
    }));

    curated.postStudyQuestions = curated.postStudyQuestions!.map((question) => ({
      ...question,
      id: randomUUID(),
      skillCode: codeMap.get(question.skillCode)!,
    }));
    expansionUnit.lessons.push(curated);
    const expanded = await planFromTracks(expansionTracks);

    assert.equal(expanded.counts.lessons, canonical.counts.lessons + 1);

    await importer.import(expanded);

    assert.equal((await catalog.getPublishedLesson(curated.slug))?.lesson.id, curated.id);
    assert.equal(
      (await catalog.getCanonicalPostStudyQuestion(curated.slug, 10))?.question.difficultyLevel,
      10,
    );

    const hiddenTracks = structuredClone(expansionTracks);
    const hiddenUnit = hiddenTracks[0].units[0];
    const hiddenSlugs = hiddenUnit.lessons.map((lesson) => lesson.slug);
    for (const lesson of hiddenUnit.lessons) lesson.isPublished = false;

    await importer.import(await planFromTracks(hiddenTracks));

    assert.equal(await catalog.getPublishedUnit(hiddenUnit.slug), null);
    for (const slug of hiddenSlugs) assert.equal(await catalog.getPublishedLesson(slug), null);
    assert(
      !(await catalog.getPublishedOnboardingTracks()).some((track) =>
        track.units.some((unit) => unit.slug === hiddenUnit.slug),
      ),
      'Onboarding must hide stale units with no ready lessons.',
    );

    const retained = await db.select().from(schema.lessons);

    assert(
      retained.some((lesson) => lesson.id === curated.id && !lesson.isPublished),
      'Removed lessons must retain their IDs for progress references.',
    );

    const beforeRejection = await snapshot();
    const changedId = structuredClone(canonical);
    changedId.tracks[0].units[0].lessons[0].skills[0].id = randomUUID();

    await assert.rejects(() => importer.import(changedId), /Stable syllabus ID mismatch/);

    assert.deepEqual(
      await snapshot(),
      beforeRejection,
      'Rejected ID must preserve the previous catalog.',
    );

    const badCount = structuredClone(canonical);
    badCount.counts.tracks += 1;

    await assert.rejects(() => importer.import(badCount), /count mismatch/);

    assert.deepEqual(
      await snapshot(),
      beforeRejection,
      'Failure after writes must roll back the whole import.',
    );

    const empty = await planFromTracks(
      canonical.tracks.map((track) => ({ ...track, isPublished: false })),
    );

    await importer.import(empty);

    assert.deepEqual(
      await catalog.getPublishedTracks(),
      [],
      'Unpublishing the last ready lesson must empty the catalog.',
    );
    assert.deepEqual(
      await db.select().from(schema.unitSkillMappings),
      [],
      'Empty catalog must have no current skill mappings.',
    );
  } finally {
    await importer.import(canonical);
  }

  assert.equal(await catalog.getPublishedLesson('smoke-newly-curated-lesson'), null);
  assert.deepEqual(
    (await catalog.getPublishedOnboardingTracks()).flatMap((track) =>
      track.units.flatMap((unit) => unit.lessons.map((lesson) => lesson.slug)),
    ),
    allLessons(canonical).map((lesson) => lesson.slug),
  );

  console.log(
    `Syllabus MySQL smoke passed: ${canonical.counts.lessons} ready lessons, stable reseed, ordering, moved skill, expansion, unpublish, empty catalog and rollback.`,
  );
}

try {
  await main();
} finally {
  await closeDatabase();
}
