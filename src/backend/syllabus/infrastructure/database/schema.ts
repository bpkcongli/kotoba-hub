import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  index,
  foreignKey,
  int,
  json,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

export const tracks = mysqlTable(
  'tracks',
  {
    id: char('id', { length: 36 }).primaryKey(),
    slug: varchar('slug', { length: 100 }).notNull(),
    curriculumLevel: varchar('curriculum_level', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    sortOrder: int('sort_order').notNull(),
    revisionPayload: json('revision_payload'),
    contentRevision: int('content_revision').notNull().default(1),
    seedSchemaVersion: varchar('seed_schema_version', { length: 10 }).notNull().default('1.0.0'),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    check('tracks_content_revision_ck', sql`${table.contentRevision} > 0`),
    uniqueIndex('tracks_slug_uk').on(table.slug),
    index('tracks_curriculum_level_sort_idx').on(table.curriculumLevel, table.sortOrder),
  ],
);

export const units = mysqlTable(
  'units',
  {
    id: char('id', { length: 36 }).primaryKey(),
    trackId: char('track_id', { length: 36 })
      .notNull()
      .references(() => tracks.id),
    slug: varchar('slug', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    sortOrder: int('sort_order').notNull(),
    isFoundationUnit: boolean('is_foundation_unit').notNull().default(false),
    revisionPayload: json('revision_payload'),
    contentRevision: int('content_revision').notNull().default(1),
    seedSchemaVersion: varchar('seed_schema_version', { length: 10 }).notNull().default('1.0.0'),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    check('units_content_revision_ck', sql`${table.contentRevision} > 0`),
    uniqueIndex('units_slug_uk').on(table.slug),
    uniqueIndex('units_track_sort_uk').on(table.trackId, table.sortOrder),
    index('units_track_id_idx').on(table.trackId),
  ],
);

export const lessons = mysqlTable(
  'lessons',
  {
    id: char('id', { length: 36 }).primaryKey(),
    unitId: char('unit_id', { length: 36 })
      .notNull()
      .references(() => units.id),
    slug: varchar('slug', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    learningObjective: text('learning_objective'),
    sortOrder: int('sort_order').notNull(),
    estimatedMinutes: int('estimated_minutes'),
    revisionPayload: json('revision_payload'),
    contentRevision: int('content_revision').notNull().default(1),
    seedSchemaVersion: varchar('seed_schema_version', { length: 10 }).notNull().default('1.0.0'),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    check('lessons_content_revision_ck', sql`${table.contentRevision} > 0`),
    uniqueIndex('lessons_slug_uk').on(table.slug),
    uniqueIndex('lessons_unit_sort_uk').on(table.unitId, table.sortOrder),
    index('lessons_unit_id_idx').on(table.unitId),
  ],
);

export const lessonContentBlocks = mysqlTable(
  'lesson_content_blocks',
  {
    id: char('id', { length: 36 }).primaryKey(),
    lessonId: char('lesson_id', { length: 36 })
      .notNull()
      .references(() => lessons.id),
    blockType: varchar('block_type', { length: 50 }).notNull(),
    content: json('content').notNull(),
    sortOrder: int('sort_order').notNull(),
    revisionPayload: json('revision_payload'),
    contentRevision: int('content_revision').notNull().default(1),
    seedSchemaVersion: varchar('seed_schema_version', { length: 10 }).notNull().default('1.0.0'),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    check('lesson_content_blocks_content_revision_ck', sql`${table.contentRevision} > 0`),
    uniqueIndex('lesson_content_blocks_lesson_sort_uk').on(table.lessonId, table.sortOrder),
    index('lesson_content_blocks_lesson_id_idx').on(table.lessonId),
    check(
      'lesson_content_blocks_block_type_ck',
      sql`${table.blockType} in ('PARAGRAPH', 'EXAMPLE_SENTENCE', 'GRAMMAR_STRUCTURE')`,
    ),
  ],
);

export const skills = mysqlTable(
  'skills',
  {
    id: char('id', { length: 36 }).primaryKey(),
    lessonId: char('lesson_id', { length: 36 }).references(() => lessons.id),
    ownerType: varchar('owner_type', { length: 50 }).notNull().default('LESSON'),
    groupTrackId: char('group_track_id', { length: 36 }).references(() => tracks.id),
    code: varchar('code', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    curriculumLevel: varchar('curriculum_level', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    skillType: varchar('skill_type', { length: 50 }).notNull(),
    content: json('content'),
    supportsFlashcards: boolean('supports_flashcards').notNull().default(false),
    supportsPracticeObjective: boolean('supports_practice_objective').notNull().default(false),
    supportsPracticeFreeResponse: boolean('supports_practice_free_response')
      .notNull()
      .default(false),
    prerequisiteSkillCodes: json('prerequisite_skill_codes'),
    sortOrder: int('sort_order').notNull(),
    revisionPayload: json('revision_payload'),
    contentRevision: int('content_revision').notNull().default(1),
    seedSchemaVersion: varchar('seed_schema_version', { length: 10 }).notNull().default('1.0.0'),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    check(
      'skills_owner_ck',
      sql`(${table.ownerType} = 'LESSON' and ${table.lessonId} is not null and ${table.groupTrackId} is null) or (${table.ownerType} = 'FLASHCARD_VOCABULARY_GROUP' and ${table.lessonId} is null and ${table.groupTrackId} is not null and ${table.skillType} = 'VOCABULARY' and ${table.supportsFlashcards} = true and ${table.supportsPracticeObjective} = false and ${table.supportsPracticeFreeResponse} = false)`,
    ),
    check('skills_content_revision_ck', sql`${table.contentRevision} > 0`),
    uniqueIndex('skills_code_uk').on(table.code),
    uniqueIndex('skills_slug_uk').on(table.slug),
    uniqueIndex('skills_lesson_sort_uk').on(table.lessonId, table.sortOrder),
    index('skills_lesson_id_idx').on(table.lessonId),
    index('skills_curriculum_level_type_idx').on(table.curriculumLevel, table.skillType),
  ],
);

export const lessonPostStudyQuestions = mysqlTable(
  'lesson_post_study_questions',
  {
    id: char('id', { length: 36 }).primaryKey(),
    lessonId: char('lesson_id', { length: 36 })
      .notNull()
      .references(() => lessons.id),
    skillId: char('skill_id', { length: 36 })
      .notNull()
      .references(() => skills.id),
    difficultyLevel: int('difficulty_level').notNull(),
    questionType: varchar('question_type', { length: 50 }).notNull(),
    promptPayload: json('prompt_payload').notNull(),
    revisionPayload: json('revision_payload'),
    contentRevision: int('content_revision').notNull().default(1),
    seedSchemaVersion: varchar('seed_schema_version', { length: 10 }).notNull().default('1.0.0'),
    isPublished: boolean('is_published').notNull().default(true),
    expectedAnswerPayload: json('expected_answer_payload').notNull(),
    explanationText: text('explanation_text'),
    sourceProvider: varchar('source_provider', { length: 50 }).notNull(),
    sourceRefPayload: json('source_ref_payload'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    check('lesson_post_study_questions_content_revision_ck', sql`${table.contentRevision} > 0`),
    uniqueIndex('lesson_post_study_questions_lesson_difficulty_uk').on(
      table.lessonId,
      table.difficultyLevel,
    ),
    index('lesson_post_study_questions_lesson_id_idx').on(table.lessonId),
    index('lesson_post_study_questions_skill_id_idx').on(table.skillId),
    check(
      'lesson_post_study_questions_difficulty_level_ck',
      sql`${table.difficultyLevel} between 1 and 10`,
    ),
    check(
      'lesson_post_study_questions_question_type_ck',
      sql`${table.questionType} = 'SHORT_FREE_RESPONSE'`,
    ),
  ],
);

export const unitSkillMappings = mysqlTable(
  'unit_skill_mappings',
  {
    id: char('id', { length: 36 }).primaryKey(),
    unitId: char('unit_id', { length: 36 })
      .notNull()
      .references(() => units.id),
    skillId: char('skill_id', { length: 36 })
      .notNull()
      .references(() => skills.id),
    lessonId: char('lesson_id', { length: 36 })
      .notNull()
      .references(() => lessons.id),
    isPrimary: boolean('is_primary').notNull().default(true),
    sortOrder: int('sort_order').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex('unit_skill_mappings_unit_skill_uk').on(table.unitId, table.skillId),
    index('unit_skill_mappings_skill_id_idx').on(table.skillId),
    index('unit_skill_mappings_lesson_id_idx').on(table.lessonId),
  ],
);

const translationAudit = () => ({
  sourceRevision: int('source_revision').notNull(),
  translationRevision: int('translation_revision').notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  sourceRefPayload: json('source_ref_payload').notNull(),
  revisionPayload: json('revision_payload').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const trackTranslations = mysqlTable(
  'track_translations',
  {
    trackId: char('track_id', { length: 36 })
      .notNull()
      .references(() => tracks.id, { onDelete: 'restrict' }),
    locale: varchar('locale', { length: 2 }).$type<'en' | 'id'>().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    ...translationAudit(),
  },
  (t) => [
    primaryKey({ columns: [t.trackId, t.locale] }),
    index('track_translations_locale_idx').on(t.locale, t.isPublished),
    check('track_translations_locale_ck', sql`${t.locale} in ('en', 'id')`),
    check(
      'track_translations_revision_ck',
      sql`${t.sourceRevision} > 0 and ${t.translationRevision} > 0`,
    ),
  ],
);

export const unitTranslations = mysqlTable(
  'unit_translations',
  {
    unitId: char('unit_id', { length: 36 })
      .notNull()
      .references(() => units.id, { onDelete: 'restrict' }),
    locale: varchar('locale', { length: 2 }).$type<'en' | 'id'>().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    ...translationAudit(),
  },
  (t) => [
    primaryKey({ columns: [t.unitId, t.locale] }),
    index('unit_translations_locale_idx').on(t.locale, t.isPublished),
    check('unit_translations_locale_ck', sql`${t.locale} in ('en', 'id')`),
    check(
      'unit_translations_revision_ck',
      sql`${t.sourceRevision} > 0 and ${t.translationRevision} > 0`,
    ),
  ],
);

export const lessonTranslations = mysqlTable(
  'lesson_translations',
  {
    lessonId: char('lesson_id', { length: 36 })
      .notNull()
      .references(() => lessons.id, { onDelete: 'restrict' }),
    locale: varchar('locale', { length: 2 }).$type<'en' | 'id'>().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    learningObjective: text('learning_objective').notNull(),
    ...translationAudit(),
  },
  (t) => [
    primaryKey({ columns: [t.lessonId, t.locale] }),
    index('lesson_translations_locale_idx').on(t.locale, t.isPublished),
    check('lesson_translations_locale_ck', sql`${t.locale} in ('en', 'id')`),
    check(
      'lesson_translations_revision_ck',
      sql`${t.sourceRevision} > 0 and ${t.translationRevision} > 0`,
    ),
  ],
);

export const skillTranslations = mysqlTable(
  'skill_translations',
  {
    skillId: char('skill_id', { length: 36 })
      .notNull()
      .references(() => skills.id, { onDelete: 'restrict' }),
    locale: varchar('locale', { length: 2 }).$type<'en' | 'id'>().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    content: json('content').notNull(),
    ...translationAudit(),
  },
  (t) => [
    primaryKey({ columns: [t.skillId, t.locale] }),
    index('skill_translations_locale_idx').on(t.locale, t.isPublished),
    check('skill_translations_locale_ck', sql`${t.locale} in ('en', 'id')`),
    check(
      'skill_translations_revision_ck',
      sql`${t.sourceRevision} > 0 and ${t.translationRevision} > 0`,
    ),
  ],
);

export const lessonContentBlockTranslations = mysqlTable(
  'lesson_content_block_translations',
  {
    contentBlockId: char('content_block_id', { length: 36 }).notNull(),
    locale: varchar('locale', { length: 2 }).$type<'en' | 'id'>().notNull(),
    content: json('content').notNull(),
    ...translationAudit(),
  },
  (t) => [
    primaryKey({ columns: [t.contentBlockId, t.locale] }),
    foreignKey({
      name: 'block_translation_owner_fk',
      columns: [t.contentBlockId],
      foreignColumns: [lessonContentBlocks.id],
    }).onDelete('restrict'),
    index('lesson_content_block_translations_locale_idx').on(t.locale, t.isPublished),
    check('lesson_content_block_translations_locale_ck', sql`${t.locale} in ('en', 'id')`),
    check(
      'lesson_content_block_translations_revision_ck',
      sql`${t.sourceRevision} > 0 and ${t.translationRevision} > 0`,
    ),
  ],
);

export const lessonPostStudyQuestionTranslations = mysqlTable(
  'lesson_post_study_question_translations',
  {
    questionId: char('question_id', { length: 36 }).notNull(),
    locale: varchar('locale', { length: 2 }).$type<'en' | 'id'>().notNull(),
    content: json('content').notNull(),
    ...translationAudit(),
  },
  (t) => [
    primaryKey({ columns: [t.questionId, t.locale] }),
    foreignKey({
      name: 'question_translation_owner_fk',
      columns: [t.questionId],
      foreignColumns: [lessonPostStudyQuestions.id],
    }).onDelete('restrict'),
    index('lesson_post_study_question_translations_locale_idx').on(t.locale, t.isPublished),
    check('lesson_post_study_question_translations_locale_ck', sql`${t.locale} in ('en', 'id')`),
    check(
      'lesson_post_study_question_translations_revision_ck',
      sql`${t.sourceRevision} > 0 and ${t.translationRevision} > 0`,
    ),
  ],
);
