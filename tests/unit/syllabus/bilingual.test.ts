import {
  validateBilingualPlan,
  validatePrerequisites,
} from '@/backend/syllabus/application/helpers/bilingual-seed-validation';
import {
  localizeSyllabus,
  localizedCutoverBlockers,
} from '@/backend/syllabus/application/helpers/localize-syllabus';
import { PrepareBilingualSeedServiceImpl } from '@/backend/syllabus/application/services/impl/prepare-bilingual-seed.service.impl';
import { SyllabusCatalogServiceImpl } from '@/backend/syllabus/application/services/impl/syllabus-catalog.service.impl';
import type {
  BilingualSeedOwner,
  BilingualSeedPlan,
} from '@/backend/syllabus/application/services/prepare-bilingual-seed.service';
import type { SyllabusTrackSnapshot } from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';
import {
  BilingualContent,
  translationText,
} from '@/backend/syllabus/domain/value-objects/bilingual-content';
import { PostStudyQuestionBank } from '@/backend/syllabus/domain/value-objects/post-study-question-bank';
import { getLessonRequestSchema } from '@/backend/syllabus/interface/primary/rest/dto/syllabus.request.dto';
import { toLessonDto } from '@/backend/syllabus/interface/primary/rest/dto/syllabus.response.dto';
import {
  assertRevision,
  canonicalRevisionPayload,
} from '@/backend/syllabus/interface/secondary/persistence/drizzle-bilingual-importer';
import { SeedSyllabusCatalogRepository } from '@/backend/syllabus/interface/secondary/seed/seed-syllabus-catalog.repository';

let plan: BilingualSeedPlan;

beforeAll(async () => {
  plan = await new PrepareBilingualSeedServiceImpl(new SeedSyllabusCatalogRepository()).prepare(
    'content/syllabus/v2/manifest.json',
  );
});

function materialize(owner: BilingualSeedOwner): unknown {
  const row: Record<string, unknown> = {
    ...owner,
    ...translationText(owner.localizations.en!),
    seedSchemaVersion: '2.0.0',
  };

  for (const key of ['units', 'lessons', 'skills', 'contentBlocks', 'postStudyQuestions']) {
    if (Array.isArray(row[key])) row[key] = (row[key] as BilingualSeedOwner[]).map(materialize);
  }

  if (owner.blockType) {
    row.content = { ...(owner.content as object), ...translationText(owner.localizations.en!) };
  }

  if (owner.promptPayload)
    row.promptPayload = {
      ...(owner.promptPayload as object),
      placeholder: owner.localizations.en!.placeholder,
      hintTexts: owner.localizations.en!.hintTexts,
    };

  return row;
}

test('accepts the full reviewed batch and preserves 16 lessons and 160 canonical questions', () => {
  expect(plan.lessonIds).toHaveLength(16);
  expect(
    plan.tracks.flatMap((t) =>
      t.units.flatMap((u) => u.lessons.flatMap((l) => l.postStudyQuestions)),
    ),
  ).toHaveLength(160);
  expect(() => validateBilingualPlan(plan)).not.toThrow();
});

test('resolves a whole package and preserves intentionally null or empty fields', () => {
  const owner = structuredClone(plan.tracks[0].units[0].lessons[0].postStudyQuestions[0]);
  owner.localizations.id!.placeholder = null;
  owner.localizations.id!.hintTexts = [];

  expect(BilingualContent.resolve(owner, 'id').text.hintTexts).toEqual([]);
  expect(BilingualContent.resolve(owner, 'id').localization.resolvedLocale).toBe('id');

  owner.localizations.id!.sourceRevision = owner.contentRevision - 1;

  expect(BilingualContent.resolve(owner, 'id').localization).toMatchObject({
    requestedLocale: 'id',
    resolvedLocale: 'en',
    isFallback: true,
  });

  owner.localizations.en!.isPublished = false;

  expect(() => BilingualContent.resolve(owner, 'id')).toThrow('English');
});

test('localized catalog gates ancestors, English revisions and bank completeness, while legacy remains accessible', async () => {
  const tracks = plan.tracks.map(materialize) as SyllabusTrackSnapshot[];
  const lesson = tracks[0].units[0].lessons[0];
  const catalog = new SyllabusCatalogServiceImpl({ getTracks: async () => tracks });

  expect(
    (await catalog.getPublishedLesson(lesson.slug, 'id'))?.lesson.localization?.resolvedLocale,
  ).toBe('id');

  lesson.localizations!.en!.isPublished = false;

  expect(await catalog.getPublishedLesson(lesson.slug, 'id')).toBeNull();
  expect(await catalog.getPublishedLesson(lesson.slug)).not.toBeNull();
  expect(localizedCutoverBlockers(tracks)).toContain(lesson.slug);

  lesson.localizations!.en!.isPublished = true;
  lesson.postStudyQuestions!.pop();

  expect(await catalog.getPublishedLesson(lesson.slug, 'id')).toBeNull();
});

test('localized lesson DTO exposes neutral translation and per-owner metadata without internal packages or keys', () => {
  const tracks = localizeSyllabus(plan.tracks.map(materialize) as SyllabusTrackSnapshot[], 'id');
  const track = tracks[0],
    unit = track.units[0],
    lesson = unit.lessons[0];

  const dto = toLessonDto(
    { track, unit, lesson },
    new SyllabusCatalogServiceImpl({ getTracks: async () => tracks }),
    true,
    true,
  );
  const serialized = JSON.stringify(dto);

  expect(dto.localization?.resolvedLocale).toBe('id');
  expect(serialized).not.toMatch(
    /localizations|sourceRefs|acceptedTextAnswers|expectedAnswer|englishTranslation/,
  );

  const example = dto.contentBlocks.find((b) => b.blockType === 'EXAMPLE_SENTENCE');
  if (example) expect(example.content).toHaveProperty('translation');
});

test.each(['ja', 'id-ID', 'in', '', ['en', 'id']])(
  'rejects unsupported or repeated locale %p',
  (contentLocale) => {
    expect(
      getLessonRequestSchema.safeParse({
        lessonSlug: 'lesson',
        contentFormat: 'localized',
        contentLocale,
      }).success,
    ).toBe(false);
  },
);

test('rejects locale without explicit localized format', () => {
  expect(
    getLessonRequestSchema.safeParse({ lessonSlug: 'lesson', contentLocale: 'id' }).success,
  ).toBe(false);
  expect(getLessonRequestSchema.safeParse({ lessonSlug: 'lesson' }).success).toBe(true);
});

test.each(['duplicate', 'future', 'grammar', 'html', 'plain', 'bank'])(
  'rejects invalid batch atomically: %s',
  (kind) => {
    const invalid = structuredClone(plan),
      lesson = invalid.tracks[0].units[0].lessons[0];

    if (kind === 'duplicate') lesson.skills[1].id = lesson.skills[0].id;
    if (kind === 'future') lesson.localizations.id!.sourceRevision = lesson.contentRevision + 1;
    if (kind === 'grammar') {
      lesson.contentBlocks[0].blockType = 'GRAMMAR_STRUCTURE';
      lesson.contentBlocks[0].content = { skillCode: lesson.skills[0].code };
    }
    if (kind === 'html')
      lesson.contentBlocks[0].localizations.id!.body = '<p onclick="alert(1)">Unsafe</p>';
    if (kind === 'plain')
      (lesson.postStudyQuestions[0].promptPayload as Record<string, unknown>).sentenceTemplate =
        'changed ___';
    if (kind === 'bank') lesson.postStudyQuestions.pop();

    expect(() => validateBilingualPlan(invalid)).toThrow();
  },
);

test('validates external prerequisite chains and rejects cycles', () => {
  const skill = structuredClone(plan.tracks[0].units[0].lessons[0].skills[0]);
  skill.prerequisiteSkillCodes = ['external'];

  expect(() => validatePrerequisites([skill], [])).toThrow('Unavailable');
  expect(() =>
    validatePrerequisites(
      [skill],
      [{ code: 'external', isPublished: true, prerequisiteSkillCodes: [skill.code] }],
    ),
  ).toThrow('cycle');
});

test('requires a new canonical revision for changed content but allows publication and ordering changes', () => {
  const owner = structuredClone(plan.tracks[0]);
  const previous = {
    contentRevision: owner.contentRevision,
    revisionPayload: canonicalRevisionPayload(owner),
  };

  owner.sortOrder++;
  owner.isPublished = !owner.isPublished;

  expect(() => assertRevision(previous, owner)).not.toThrow();

  owner.curriculumLevel = 'N4';

  expect(() => assertRevision(previous, owner)).toThrow('without revision');

  owner.contentRevision++;

  expect(() => assertRevision(previous, owner)).not.toThrow();
});

test('v2 accepts reviewed kanji alternatives without changing legacy validation', () => {
  const lesson = (plan.tracks.map(materialize) as SyllabusTrackSnapshot[])
    .flatMap((t) => t.units.flatMap((u) => u.lessons))
    .find((l) =>
      l.postStudyQuestions!.some((q) =>
        (q.expectedAnswer.acceptedTextAnswers as string[]).includes('誰'),
      ),
    )!;

  expect(
    () =>
      new PostStudyQuestionBank(
        lesson.slug,
        lesson.postStudyQuestions!,
        lesson.skills.filter((s) => s.isPublished).map((s) => s.code),
        '2.0.0',
      ),
  ).not.toThrow();
  expect(
    () =>
      new PostStudyQuestionBank(
        lesson.slug,
        lesson.postStudyQuestions!,
        lesson.skills.filter((s) => s.isPublished).map((s) => s.code),
      ),
  ).toThrow();
});
