import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  index,
  int,
  json,
  mysqlTable,
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
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
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
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
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
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
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
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
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
    lessonId: char('lesson_id', { length: 36 })
      .notNull()
      .references(() => lessons.id),
    code: varchar('code', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    curriculumLevel: varchar('curriculum_level', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    skillType: varchar('skill_type', { length: 50 }).notNull(),
    supportsFlashcards: boolean('supports_flashcards').notNull().default(false),
    supportsPracticeObjective: boolean('supports_practice_objective').notNull().default(false),
    supportsPracticeFreeResponse: boolean('supports_practice_free_response')
      .notNull()
      .default(false),
    prerequisiteSkillCodes: json('prerequisite_skill_codes'),
    sortOrder: int('sort_order').notNull(),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
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
    expectedAnswerPayload: json('expected_answer_payload').notNull(),
    explanationText: text('explanation_text'),
    sourceProvider: varchar('source_provider', { length: 50 }).notNull(),
    sourceRefPayload: json('source_ref_payload'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
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
