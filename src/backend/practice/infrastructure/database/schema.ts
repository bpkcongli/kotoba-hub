import {
  boolean,
  char,
  decimal,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import type {
  AnswerResult,
  LessonReceipt,
  PracticeQuestion,
  Recommendation,
  StoredAnswer,
} from '@/backend/practice/domain/repositories/practice.repository';
import { skills } from '@/backend/syllabus/infrastructure/database/schema';
import { users } from '@/backend/users/infrastructure/database/schema';

const audit = () => ({
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const practiceSessions = mysqlTable(
  'practice_sessions',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    status: varchar('status', { length: 50 }).notNull(),
    difficultyBand: varchar('difficulty_band', { length: 50 }).notNull(),
    questionMix: json('question_mix').$type<Recommendation['questionMix']>().notNull(),
    recommendationSpec: json('recommendation_spec').$type<Recommendation>().notNull(),
    totalQuestions: int('total_questions').notNull(),
    answeredQuestionsCount: int('answered_questions_count').notNull().default(0),
    startedAt: timestamp('started_at', { fsp: 3 }).notNull(),
    completedAt: timestamp('completed_at', { fsp: 3 }),
    ...audit(),
  },
  (t) => [index('practice_sessions_user_status_idx').on(t.userId, t.status)],
);

export const practiceQuestions = mysqlTable(
  'practice_questions',
  {
    id: char('id', { length: 36 }).primaryKey(),
    sessionId: char('session_id', { length: 36 })
      .notNull()
      .references(() => practiceSessions.id),
    skillId: char('skill_id', { length: 36 })
      .notNull()
      .references(() => skills.id),
    questionType: varchar('question_type', { length: 50 }).notNull(),
    gradingStrategy: varchar('grading_strategy', { length: 50 }).notNull(),
    difficultyBand: varchar('difficulty_band', { length: 50 }).notNull(),
    promptText: text('prompt_text').notNull(),
    promptPayload: json('prompt_payload').$type<Record<string, unknown>>().notNull(),
    expectedAnswerPayload: json('expected_answer_payload')
      .$type<Record<string, unknown>>()
      .notNull(),
    questionSnapshot: json('question_snapshot').$type<PracticeQuestion>().notNull(),
    sortOrder: int('sort_order').notNull(),
    ...audit(),
  },
  (t) => [
    uniqueIndex('practice_questions_session_sort_uk').on(t.sessionId, t.sortOrder),
    index('practice_questions_skill_idx').on(t.skillId),
  ],
);

export const practiceAnswers = mysqlTable(
  'practice_answers',
  {
    id: char('id', { length: 36 }).primaryKey(),
    sessionId: char('session_id', { length: 36 })
      .notNull()
      .references(() => practiceSessions.id),
    questionId: char('question_id', { length: 36 })
      .notNull()
      .references(() => practiceQuestions.id),
    attemptNumber: int('attempt_number').notNull().default(1),
    userAnswerPayload: json('user_answer_payload').$type<StoredAnswer['userAnswer']>().notNull(),
    isCorrect: boolean('is_correct').notNull(),
    numericScore: decimal('numeric_score', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    feedbackText: text('feedback_text'),
    gradingSource: varchar('grading_source', { length: 50 }).notNull(),
    gradingMetadata: json('grading_metadata').$type<Record<string, unknown>>().notNull(),
    responseTimeMs: int('response_time_ms'),
    answeredAt: timestamp('answered_at', { fsp: 3 }).notNull(),
    progressRecorded: boolean('progress_recorded').notNull().default(false),
    answerPayload: json('answer_payload').$type<StoredAnswer>().notNull(),
    resultPayload: json('result_payload').$type<AnswerResult>().notNull(),
    ...audit(),
  },
  (t) => [
    uniqueIndex('practice_answers_question_attempt_uk').on(t.questionId, t.attemptNumber),
    index('practice_answers_session_idx').on(t.sessionId),
  ],
);

export const practicePostStudyReceipts = mysqlTable(
  'practice_post_study_receipts',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    idempotencyKey: char('idempotency_key', { length: 36 }).notNull(),
    receiptPayload: json('receipt_payload').$type<LessonReceipt>().notNull(),
    ...audit(),
  },
  (t) => [uniqueIndex('practice_post_study_user_key_uk').on(t.userId, t.idempotencyKey)],
);
