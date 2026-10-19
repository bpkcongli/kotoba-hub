import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  decimal,
  foreignKey,
  index,
  int,
  json,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import {
  lessonPostStudyQuestions,
  lessons,
  skills,
  tracks,
  units,
} from '@/backend/syllabus/infrastructure/database/schema';
import { users } from '@/backend/users/infrastructure/database/schema';

export const progressEvents = mysqlTable(
  'progress_events',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    skillId: char('skill_id', { length: 36 })
      .notNull()
      .references(() => skills.id),
    sourceType: varchar('source_type', { length: 50 }).notNull(),
    sourceSessionId: char('source_session_id', { length: 36 }),
    sourceEntityId: char('source_entity_id', { length: 36 }).notNull(),
    questionType: varchar('question_type', { length: 50 }).notNull(),
    isCorrect: boolean('is_correct').notNull(),
    numericScore: decimal('numeric_score', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    confidenceWeight: decimal('confidence_weight', { precision: 5, scale: 2, mode: 'number' }),
    responseTimeMs: int('response_time_ms'),
    lessonId: char('lesson_id', { length: 36 })
      .notNull()
      .references(() => lessons.id),
    unitId: char('unit_id', { length: 36 })
      .notNull()
      .references(() => units.id),
    trackId: char('track_id', { length: 36 })
      .notNull()
      .references(() => tracks.id),
    gradingMetadata: json('grading_metadata').$type<Record<string, unknown>>(),
    answeredAt: timestamp('answered_at', { fsp: 3 }).notNull(),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index('progress_events_user_skill_answered_idx').on(
      table.userId,
      table.skillId,
      table.answeredAt,
    ),
    index('progress_events_source_idx').on(
      table.sourceType,
      table.sourceSessionId,
      table.sourceEntityId,
    ),
    index('progress_events_unit_idx').on(table.userId, table.unitId, table.answeredAt),
    check('progress_events_score_ck', sql`${table.numericScore} between 0 and 100`),
    check(
      'progress_events_confidence_ck',
      sql`${table.confidenceWeight} is null or ${table.confidenceWeight} between 0 and 1`,
    ),
  ],
);

export const skillMasterySnapshots = mysqlTable(
  'skill_mastery_snapshots',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    skillId: char('skill_id', { length: 36 })
      .notNull()
      .references(() => skills.id),
    lastProgressEventId: char('last_progress_event_id', { length: 36 }),
    masteryScore: decimal('mastery_score', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    accuracyScore: decimal('accuracy_score', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    recencyScore: decimal('recency_score', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    confidenceScore: decimal('confidence_score', {
      precision: 5,
      scale: 2,
      mode: 'number',
    }).notNull(),
    attemptsWindowSize: int('attempts_window_size').notNull(),
    correctAttemptsCount: int('correct_attempts_count').notNull(),
    masteryState: varchar('mastery_state', { length: 50 }).notNull(),
    recommendedDifficultyBand: varchar('recommended_difficulty_band', { length: 50 }).notNull(),
    lastActivityAt: timestamp('last_activity_at', { fsp: 3 }),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex('skill_mastery_snapshots_user_skill_uk').on(table.userId, table.skillId),
    foreignKey({
      name: 'skill_mastery_last_event_fk',
      columns: [table.lastProgressEventId],
      foreignColumns: [progressEvents.id],
    }),
    index('skill_mastery_snapshots_user_state_idx').on(table.userId, table.masteryState),
    index('skill_mastery_snapshots_difficulty_idx').on(
      table.userId,
      table.recommendedDifficultyBand,
    ),
    check('skill_mastery_snapshots_score_ck', sql`${table.masteryScore} between 0 and 100`),
    check(
      'skill_mastery_snapshots_window_ck',
      sql`${table.attemptsWindowSize} between 0 and 20 and ${table.correctAttemptsCount} between 0 and ${table.attemptsWindowSize}`,
    ),
  ],
);

export const lessonUnderstandingSnapshots = mysqlTable(
  'lesson_understanding_snapshots',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    lessonId: char('lesson_id', { length: 36 })
      .notNull()
      .references(() => lessons.id),
    lastProgressEventId: char('last_progress_event_id', { length: 36 }),
    lastQuestionId: char('last_question_id', { length: 36 }),
    currentUnderstandingLevel: int('current_understanding_level').notNull().default(0),
    lastAttemptedDifficultyLevel: int('last_attempted_difficulty_level'),
    lastCorrectDifficultyLevel: int('last_correct_difficulty_level'),
    totalCorrectCount: int('total_correct_count').notNull().default(0),
    totalAttemptCount: int('total_attempt_count').notNull().default(0),
    lastAttemptedAt: timestamp('last_attempted_at', { fsp: 3 }),
    lastCorrectAt: timestamp('last_correct_at', { fsp: 3 }),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex('lesson_understanding_snapshots_user_lesson_uk').on(table.userId, table.lessonId),
    foreignKey({
      name: 'lesson_understanding_last_event_fk',
      columns: [table.lastProgressEventId],
      foreignColumns: [progressEvents.id],
    }),
    foreignKey({
      name: 'lesson_understanding_last_question_fk',
      columns: [table.lastQuestionId],
      foreignColumns: [lessonPostStudyQuestions.id],
    }),
    index('lesson_understanding_snapshots_user_level_idx').on(
      table.userId,
      table.currentUnderstandingLevel,
    ),
    index('lesson_understanding_snapshots_lesson_idx').on(table.lessonId),
    check(
      'lesson_understanding_snapshots_level_ck',
      sql`${table.currentUnderstandingLevel} between 0 and 10`,
    ),
    check(
      'lesson_understanding_snapshots_last_attempted_difficulty_ck',
      sql`${table.lastAttemptedDifficultyLevel} is null or ${table.lastAttemptedDifficultyLevel} between 1 and 10`,
    ),
    check(
      'lesson_understanding_snapshots_last_correct_difficulty_ck',
      sql`${table.lastCorrectDifficultyLevel} is null or ${table.lastCorrectDifficultyLevel} between 1 and 10`,
    ),
  ],
);
