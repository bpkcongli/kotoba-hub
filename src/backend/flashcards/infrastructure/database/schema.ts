import {
  boolean,
  char,
  index,
  int,
  json,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import type {
  AnswerOptionPayload,
  SessionSnapshot,
  StoredAnswer,
  TurnSnapshot,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';
import { skills, units } from '@/backend/syllabus/infrastructure/database/schema';
import { users } from '@/backend/users/infrastructure/database/schema';

const audit = () => ({
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const flashcardDecks = mysqlTable(
  'flashcard_decks',
  {
    id: char('id', { length: 36 }).primaryKey(),
    ownerUserId: char('owner_user_id', { length: 36 }).references(() => users.id),
    slug: varchar('slug', { length: 100 }),
    unitId: char('unit_id', { length: 36 }).references(() => units.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    deckSource: varchar('deck_source', { length: 50 }).notNull(),
    deckType: varchar('deck_type', { length: 50 }).notNull(),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    sortOrder: int('sort_order').notNull(),
    isPublished: boolean('is_published').notNull().default(false),
    ...audit(),
  },
  (t) => [
    uniqueIndex('flashcard_decks_slug_uk').on(t.slug),
    index('flashcard_decks_owner_idx').on(t.ownerUserId),
    index('flashcard_decks_source_idx').on(t.deckSource),
  ],
);

export const flashcardItems = mysqlTable(
  'flashcard_items',
  {
    id: char('id', { length: 36 }).primaryKey(),
    skillId: char('skill_id', { length: 36 }).references(() => skills.id),
    itemType: varchar('item_type', { length: 50 }).notNull(),
    surfaceFormText: varchar('surface_form_text', { length: 255 }).notNull(),
    kanaDisplayText: text('kana_display_text'),
    romajiText: varchar('romaji_text', { length: 255 }),
    englishMeaning: text('english_meaning'),
    onyomiReadings: json('onyomi_readings').$type<string[]>(),
    kunyomiReadings: json('kunyomi_readings').$type<string[]>(),
    exampleWords: json('example_words').$type<{ word: string; kana: string; meaning: string }[]>(),
    answerOptionPayload: json('answer_option_payload').$type<AnswerOptionPayload>().notNull(),
    explanationText: text('explanation_text'),
    isActive: boolean('is_active').notNull().default(true),
    ...audit(),
  },
  (t) => [index('flashcard_items_skill_id_idx').on(t.skillId)],
);

export const flashcardDeckItems = mysqlTable(
  'flashcard_deck_items',
  {
    deckId: char('deck_id', { length: 36 })
      .notNull()
      .references(() => flashcardDecks.id),
    itemId: char('item_id', { length: 36 })
      .notNull()
      .references(() => flashcardItems.id),
    sortOrder: int('sort_order').notNull(),
    ...audit(),
  },
  (t) => [
    primaryKey({ columns: [t.deckId, t.itemId] }),
    uniqueIndex('flashcard_deck_items_sort_uk').on(t.deckId, t.sortOrder),
    index('flashcard_deck_items_item_idx').on(t.itemId),
  ],
);

export const flashcardSessions = mysqlTable(
  'flashcard_sessions',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    deckId: char('deck_id', { length: 36 })
      .notNull()
      .references(() => flashcardDecks.id),
    status: varchar('status', { length: 50 }).notNull(),
    questionScriptMode: varchar('question_script_mode', { length: 50 }).notNull(),
    answerScriptMode: varchar('answer_script_mode', { length: 50 }).notNull(),
    currentItemId: char('current_item_id', { length: 36 }).references(() => flashcardItems.id),
    totalItems: int('total_items').notNull(),
    totalAnswered: int('total_answered').notNull().default(0),
    correctCount: int('correct_count').notNull().default(0),
    incorrectCount: int('incorrect_count').notNull().default(0),
    startedAt: timestamp('started_at', { fsp: 3 }).notNull(),
    completedAt: timestamp('completed_at', { fsp: 3 }),
    deckSnapshot: json('deck_snapshot').$type<SessionSnapshot['deck']>().notNull(),
    turnsPayload: json('turns_payload').$type<TurnSnapshot[]>().notNull(),
    ...audit(),
  },
  (t) => [
    index('flashcard_sessions_user_status_idx').on(t.userId, t.status),
    index('flashcard_sessions_deck_id_idx').on(t.deckId),
  ],
);

export const flashcardSessionAnswers = mysqlTable(
  'flashcard_session_answers',
  {
    id: char('id', { length: 36 }).primaryKey(),
    sessionId: char('session_id', { length: 36 })
      .notNull()
      .references(() => flashcardSessions.id),
    itemId: char('item_id', { length: 36 })
      .notNull()
      .references(() => flashcardItems.id),
    turnNumber: int('turn_number').notNull(),
    promptScriptMode: varchar('prompt_script_mode', { length: 50 }).notNull(),
    answerScriptMode: varchar('answer_script_mode', { length: 50 }).notNull(),
    promptTextSnapshot: text('prompt_text_snapshot').notNull(),
    optionsPayload: json('options_payload').$type<TurnSnapshot['answerOptions']>().notNull(),
    selectedOptionId: varchar('selected_option_id', { length: 100 }).notNull(),
    correctOptionId: varchar('correct_option_id', { length: 100 }).notNull(),
    isCorrect: boolean('is_correct').notNull(),
    bucketBefore: varchar('bucket_before', { length: 50 }).notNull(),
    bucketAfter: varchar('bucket_after', { length: 50 }).notNull(),
    responseTimeMs: int('response_time_ms'),
    answeredAt: timestamp('answered_at', { fsp: 3 }).notNull(),
    progressRecorded: boolean('progress_recorded').notNull().default(false),
    answerPayload: json('answer_payload').$type<StoredAnswer>().notNull(),
    ...audit(),
  },
  (t) => [
    uniqueIndex('flashcard_answers_turn_uk').on(t.sessionId, t.turnNumber),
    uniqueIndex('flashcard_answers_item_uk').on(t.sessionId, t.itemId),
    index('flashcard_answers_item_idx').on(t.itemId),
    index('flashcard_answers_answered_at_idx').on(t.answeredAt),
  ],
);

export const flashcardItemStates = mysqlTable(
  'flashcard_item_states',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    itemId: char('item_id', { length: 36 })
      .notNull()
      .references(() => flashcardItems.id),
    lastSessionId: char('last_session_id', { length: 36 }).references(() => flashcardSessions.id),
    currentBucket: varchar('current_bucket', { length: 50 }).notNull().default('NEW'),
    consecutiveCorrectCount: int('consecutive_correct_count').notNull().default(0),
    lastAnsweredAt: timestamp('last_answered_at', { fsp: 3 }),
    nextDueAt: timestamp('next_due_at', { fsp: 3 }),
    ...audit(),
  },
  (t) => [
    uniqueIndex('flashcard_item_states_user_item_uk').on(t.userId, t.itemId),
    index('flashcard_item_states_user_due_idx').on(t.userId, t.nextDueAt),
  ],
);
