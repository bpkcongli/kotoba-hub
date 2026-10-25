import { randomUUID } from 'node:crypto';
import { and, count, eq, inArray, or, sql } from 'drizzle-orm';
import { FlashcardError } from '@/backend/flashcards/domain/exceptions/flashcard-error';
import type {
  AnswerResult,
  Bucket,
  BucketUpdate,
  ContentType,
  DeckFilter,
  FlashcardDeck,
  FlashcardItem,
  FlashcardRepository,
  FlashcardWriteTransaction,
  ItemState,
  ItemType,
  ScriptMode,
  SessionSnapshot,
  StoredAnswer,
  TurnSnapshot,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';
import {
  flashcardDeckItems,
  flashcardDecks,
  flashcardItems,
  flashcardItemStates,
  flashcardSessionAnswers,
  flashcardSessions,
} from '@/backend/flashcards/infrastructure/database/schema';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';

type Database = ReturnType<typeof getDatabase>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function accessible(userId: string) {
  return or(
    and(eq(flashcardDecks.deckSource, 'SYSTEM'), eq(flashcardDecks.isPublished, true)),
    and(eq(flashcardDecks.deckSource, 'CUSTOM'), eq(flashcardDecks.ownerUserId, userId)),
  );
}

function deck(row: typeof flashcardDecks.$inferSelect, itemCount: number): FlashcardDeck {
  return {
    ...row,
    deckSource: row.deckSource as 'SYSTEM' | 'CUSTOM',
    contentType: row.contentType as ContentType,
    itemCount,
  };
}

function item(row: typeof flashcardItems.$inferSelect): FlashcardItem {
  return { ...row, itemType: row.itemType as ItemType };
}

function state(row: typeof flashcardItemStates.$inferSelect): ItemState {
  return {
    currentBucket: row.currentBucket as Bucket,
    consecutiveCorrectCount: row.consecutiveCorrectCount,
    nextDueAt: row.nextDueAt?.toISOString() ?? null,
  };
}

function session(row: typeof flashcardSessions.$inferSelect): SessionSnapshot {
  return {
    id: row.id,
    userId: row.userId,
    deck: row.deckSnapshot,
    status: row.status as SessionSnapshot['status'],
    questionScriptMode: row.questionScriptMode as ScriptMode,
    answerScriptMode: row.answerScriptMode as ScriptMode,
    turns: row.turnsPayload,
    totalAnswered: row.totalAnswered,
    correctCount: row.correctCount,
    incorrectCount: row.incorrectCount,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

class DrizzleFlashcardWriteTransaction implements FlashcardWriteTransaction {
  constructor(
    private readonly transaction: Transaction,
    public readonly session: SessionSnapshot,
  ) {}

  async findAnswer(itemId: string): Promise<StoredAnswer | null> {
    const [row] = await this.transaction
      .select()
      .from(flashcardSessionAnswers)
      .where(
        and(
          eq(flashcardSessionAnswers.sessionId, this.session.id),
          eq(flashcardSessionAnswers.itemId, itemId),
        ),
      )
      .limit(1);

    return row ? { ...row.answerPayload, progressRecorded: row.progressRecorded } : null;
  }

  async lockItemState(itemId: string): Promise<ItemState> {
    await this.transaction
      .insert(flashcardItemStates)
      .values({ id: randomUUID(), userId: this.session.userId, itemId })
      .onDuplicateKeyUpdate({ set: { id: sql`${flashcardItemStates.id}` } });

    const [row] = await this.transaction
      .select()
      .from(flashcardItemStates)
      .where(
        and(
          eq(flashcardItemStates.userId, this.session.userId),
          eq(flashcardItemStates.itemId, itemId),
        ),
      )
      .limit(1)
      .for('update');

    if (!row) throw new Error('Flashcard item state lock failed.');

    return state(row);
  }

  async saveAnswer(answer: StoredAnswer, turn: TurnSnapshot, bucket: BucketUpdate): Promise<void> {
    await this.transaction.insert(flashcardSessionAnswers).values({
      id: answer.id,
      sessionId: answer.sessionId,
      itemId: answer.itemId,
      turnNumber: this.session.totalAnswered,
      promptScriptMode: turn.prompt.scriptMode,
      answerScriptMode: this.session.answerScriptMode,
      promptTextSnapshot: turn.prompt.value,
      optionsPayload: turn.answerOptions,
      selectedOptionId: answer.selectedOptionId,
      correctOptionId: turn.correctOptionId,
      isCorrect: answer.result.isCorrect,
      bucketBefore: bucket.previousBucket,
      bucketAfter: bucket.currentBucket,
      responseTimeMs: answer.responseTimeMs,
      answeredAt: new Date(answer.answeredAt),
      progressRecorded: answer.progressRecorded,
      answerPayload: answer,
    });

    await this.transaction
      .update(flashcardItemStates)
      .set({
        lastSessionId: this.session.id,
        currentBucket: bucket.currentBucket,
        consecutiveCorrectCount: bucket.consecutiveCorrectCount,
        lastAnsweredAt: new Date(answer.answeredAt),
        nextDueAt: new Date(bucket.nextDueAt),
      })
      .where(
        and(
          eq(flashcardItemStates.userId, this.session.userId),
          eq(flashcardItemStates.itemId, answer.itemId),
        ),
      );

    await this.transaction
      .update(flashcardSessions)
      .set({
        status: this.session.status,
        currentItemId: this.session.turns[this.session.totalAnswered]?.id ?? null,
        totalAnswered: this.session.totalAnswered,
        correctCount: this.session.correctCount,
        incorrectCount: this.session.incorrectCount,
        completedAt: this.session.completedAt ? new Date(this.session.completedAt) : null,
      })
      .where(eq(flashcardSessions.id, this.session.id));
  }
}

export class DrizzleFlashcardRepository implements FlashcardRepository {
  async listDecks(userId: string, filter: DeckFilter) {
    const condition = and(
      accessible(userId),
      filter.deckSource === 'ALL' ? undefined : eq(flashcardDecks.deckSource, filter.deckSource),
      filter.contentType === 'ALL' ? undefined : eq(flashcardDecks.contentType, filter.contentType),
      filter.deckTypes?.length ? inArray(flashcardDecks.deckType, filter.deckTypes) : undefined,
      filter.unitId ? eq(flashcardDecks.unitId, filter.unitId) : undefined,
    );

    const database = getDatabase();
    const rows = await database
      .select()
      .from(flashcardDecks)
      .where(condition)
      .orderBy(flashcardDecks.sortOrder, flashcardDecks.id)
      .limit(filter.limit)
      .offset(filter.offset);

    const [total] = await database.select({ value: count() }).from(flashcardDecks).where(condition);

    return {
      items: await Promise.all(rows.map(async (row) => deck(row, await this.itemCount(row.id)))),
      totalRecords: total?.value ?? 0,
    };
  }

  async findDeck(userId: string, deckId: string) {
    const [row] = await getDatabase()
      .select()
      .from(flashcardDecks)
      .where(and(eq(flashcardDecks.id, deckId), accessible(userId)))
      .limit(1);

    return row ? deck(row, await this.itemCount(row.id)) : null;
  }

  private async itemCount(deckId: string): Promise<number> {
    const [row] = await getDatabase()
      .select({ value: count() })
      .from(flashcardDeckItems)
      .where(eq(flashcardDeckItems.deckId, deckId));

    return row?.value ?? 0;
  }

  async findItems(itemIds: string[]) {
    if (!itemIds.length) return [];

    return (
      await getDatabase().select().from(flashcardItems).where(inArray(flashcardItems.id, itemIds))
    ).map(item);
  }

  async getDeckItems(deckId: string) {
    return (
      await getDatabase()
        .select({ item: flashcardItems })
        .from(flashcardDeckItems)
        .innerJoin(flashcardItems, eq(flashcardDeckItems.itemId, flashcardItems.id))
        .where(eq(flashcardDeckItems.deckId, deckId))
        .orderBy(flashcardDeckItems.sortOrder, flashcardItems.id)
    ).map((row) => item(row.item));
  }

  async getItemStates(userId: string, itemIds: string[]): Promise<Record<string, ItemState>> {
    if (!itemIds.length) return {};

    const rows = await getDatabase()
      .select()
      .from(flashcardItemStates)
      .where(
        and(eq(flashcardItemStates.userId, userId), inArray(flashcardItemStates.itemId, itemIds)),
      );

    return Object.fromEntries(rows.map((row) => [row.itemId, state(row)]));
  }

  async createDeck(value: FlashcardDeck, itemIds: string[]) {
    await getDatabase().transaction(async (transaction) => {
      await transaction.insert(flashcardDecks).values(value);
      if (itemIds.length)
        await transaction
          .insert(flashcardDeckItems)
          .values(itemIds.map((itemId, sortOrder) => ({ deckId: value.id, itemId, sortOrder })));
    });
  }

  async createSession(value: SessionSnapshot) {
    await getDatabase()
      .insert(flashcardSessions)
      .values({
        id: value.id,
        userId: value.userId,
        deckId: value.deck.id,
        status: value.status,
        questionScriptMode: value.questionScriptMode,
        answerScriptMode: value.answerScriptMode,
        currentItemId: value.turns[0]?.id ?? null,
        totalItems: value.turns.length,
        totalAnswered: 0,
        correctCount: 0,
        incorrectCount: 0,
        startedAt: new Date(value.startedAt),
        deckSnapshot: value.deck,
        turnsPayload: value.turns,
      });
  }

  async withSessionLock<T>(
    userId: string,
    sessionId: string,
    work: (tx: FlashcardWriteTransaction) => Promise<T>,
  ): Promise<T> {
    return getDatabase().transaction(async (transaction) => {
      const [row] = await transaction
        .select()
        .from(flashcardSessions)
        .where(and(eq(flashcardSessions.id, sessionId), eq(flashcardSessions.userId, userId)))
        .limit(1)
        .for('update');
      if (!row) throw new FlashcardError(140405002, 'Flashcard session not found.', 'sessionId');

      return work(new DrizzleFlashcardWriteTransaction(transaction, session(row)));
    });
  }

  async saveProgressResult(answerId: string, result: AnswerResult): Promise<AnswerResult> {
    return getDatabase().transaction(async (transaction) => {
      const [row] = await transaction
        .select()
        .from(flashcardSessionAnswers)
        .where(eq(flashcardSessionAnswers.id, answerId))
        .limit(1)
        .for('update');
      if (!row) throw new Error('Persisted flashcard answer disappeared.');
      if (row.progressRecorded) return row.answerPayload.result;

      await transaction
        .update(flashcardSessionAnswers)
        .set({
          progressRecorded: true,
          answerPayload: { ...row.answerPayload, result, progressRecorded: true },
        })
        .where(eq(flashcardSessionAnswers.id, answerId));

      return result;
    });
  }
}

export const flashcardRepository: FlashcardRepository = new DrizzleFlashcardRepository();
