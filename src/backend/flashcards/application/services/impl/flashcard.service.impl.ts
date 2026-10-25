import { randomUUID } from 'node:crypto';
import type { FlashcardCatalogPort } from '@/backend/flashcards/application/ports/flashcard-catalog.port';
import type { FlashcardProgressPort } from '@/backend/flashcards/application/ports/flashcard-progress.port';
import type {
  FlashcardService,
  CreateDeckRequest,
  CreateSessionRequest,
  SubmitAnswerRequest,
} from '@/backend/flashcards/application/services/flashcard.service';
import { FlashcardSession } from '@/backend/flashcards/domain/aggregates/flashcard-session';
import { FlashcardError } from '@/backend/flashcards/domain/exceptions/flashcard-error';
import type {
  AnswerResult,
  ContentType,
  DeckFilter,
  FlashcardDeck,
  FlashcardItem,
  FlashcardRepository,
  ItemPrompt,
  SessionSnapshot,
  StoredAnswer,
  TurnSnapshot,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';
import { LeitnerScheduler } from '@/backend/flashcards/domain/services/leitner-scheduler';
import { OptionSnapshotBuilder } from '@/backend/flashcards/domain/services/option-snapshot-builder';
import { ScriptPair } from '@/backend/flashcards/domain/value-objects/script-pair';

export class FlashcardServiceImpl implements FlashcardService {
  constructor(
    private readonly repository: FlashcardRepository,
    private readonly catalog: FlashcardCatalogPort,
    private readonly progress: FlashcardProgressPort,
    private readonly scheduler = new LeitnerScheduler(),
    private readonly builder = new OptionSnapshotBuilder(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listDecks(userId: string, filter: Omit<DeckFilter, 'unitId'> & { unitSlug?: string }) {
    const catalog = await this.catalog.getPublishedCatalog();
    const unit = filter.unitSlug
      ? catalog.units.find((unit) => unit.slug === filter.unitSlug)
      : undefined;
    if (filter.unitSlug && !unit) return { items: [], totalRecords: 0 };

    const result = await this.repository.listDecks(userId, {
      ...filter,
      ...(unit ? { unitId: unit.id } : {}),
    });

    return {
      ...result,
      items: result.items.map((deck) => ({
        ...deck,
        unitSlug: catalog.units.find((unit) => unit.id === deck.unitId)?.slug ?? null,
      })),
    };
  }

  async createDeck(userId: string, request: CreateDeckRequest) {
    const catalog = await this.catalog.getPublishedCatalog();
    const unit = request.unitSlug
      ? catalog.units.find((unit) => unit.slug === request.unitSlug)
      : null;
    if (request.unitSlug && !unit)
      throw new FlashcardError(
        142205001,
        'unitSlug must reference a published syllabus unit.',
        'unitSlug',
      );

    const ids = request.items ?? [];
    if (new Set(ids).size !== ids.length)
      throw new FlashcardError(142205002, 'Item references must be distinct.', 'items');

    const items = await this.repository.findItems(ids);
    if (
      items.length !== ids.length ||
      items.some(
        (item) =>
          !item.isActive ||
          (item.skillId && !catalog.skills.some((skill) => skill.id === item.skillId)),
      )
    )
      throw new FlashcardError(142205002, 'One or more item references are unavailable.', 'items');
    if (items.some((item) => family(item) !== request.contentType))
      throw new FlashcardError(142205003, 'Items must match the deck content type.', 'items');

    const deck: FlashcardDeck = {
      id: randomUUID(),
      ownerUserId: userId,
      slug: null,
      unitId: unit?.id ?? null,
      title: request.title,
      description: request.description ?? null,
      deckSource: 'CUSTOM',
      deckType: request.deckType,
      contentType: request.contentType,
      sortOrder: 0,
      isPublished: false,
      itemCount: ids.length,
    };

    await this.repository.createDeck(deck, ids);

    return { ...deck, unitSlug: unit?.slug ?? null };
  }

  async createSession(userId: string, request: CreateSessionRequest): Promise<SessionSnapshot> {
    const deck = await this.repository.findDeck(userId, request.deckId);
    if (!deck) throw new FlashcardError(140405001, 'Flashcard deck not found.', 'deckId');

    const pair = ScriptPair.create(
      deck.contentType,
      request.questionScriptMode,
      request.answerScriptMode,
    );

    const catalog = await this.catalog.getPublishedCatalog();
    if (deck.unitId && !catalog.units.some((unit) => unit.id === deck.unitId))
      throw new FlashcardError(140405001, 'Flashcard deck not found.', 'deckId');

    const items = (await this.repository.getDeckItems(deck.id)).filter(
      (item) =>
        item.isActive &&
        (!item.skillId || catalog.skills.some((skill) => skill.id === item.skillId)),
    );
    if (items.length === 0)
      throw new FlashcardError(142205001, 'Deck has no active eligible items.', 'deckId');
    if (items.some((item) => family(item) !== deck.contentType))
      throw new FlashcardError(142205003, 'Deck items must match its content type.', 'deckId');

    const now = this.now();
    const states = await this.repository.getItemStates(
      userId,
      items.map((item) => item.id),
    );
    const due = (item: FlashcardItem) =>
      !states[item.id]?.nextDueAt ||
      new Date(states[item.id]!.nextDueAt!).getTime() <= now.getTime();
    const ordered = [...items.filter(due), ...items.filter((item) => !due(item))];

    const turns = ordered.map((item) => ({
      ...this.builder.build(item, pair.questionScriptMode, pair.answerScriptMode),
      skillCode: catalog.skills.find((skill) => skill.id === item.skillId)?.code ?? null,
    }));

    const session: SessionSnapshot = {
      id: randomUUID(),
      userId,
      deck,
      status: 'ACTIVE',
      questionScriptMode: pair.questionScriptMode,
      answerScriptMode: pair.answerScriptMode,
      turns,
      totalAnswered: 0,
      correctCount: 0,
      incorrectCount: 0,
      startedAt: now.toISOString(),
      completedAt: null,
    };

    await this.repository.createSession(session);

    return session;
  }

  async submitAnswer(
    userId: string,
    sessionId: string,
    request: SubmitAnswerRequest,
  ): Promise<AnswerResult> {
    const answer = await this.repository.withSessionLock(userId, sessionId, async (transaction) => {
      const session = transaction.session;
      const existing = await transaction.findAnswer(request.itemId);
      if (existing) {
        if (
          existing.selectedOptionId !== request.selectedOptionId ||
          existing.responseTimeMs !== (request.responseTimeMs ?? null)
        )
          throw new FlashcardError(
            142205005,
            'The item already has a different recorded answer.',
            'itemId',
          );

        return existing;
      }

      const aggregate = new FlashcardSession(session);
      const turn = aggregate.currentTurn(request.itemId, request.selectedOptionId);
      if (session.totalAnswered > 0) {
        const previous = await transaction.findAnswer(session.turns[session.totalAnswered - 1]!.id);
        if (previous && !previous.progressRecorded)
          throw new FlashcardError(
            142205005,
            'Retry the previous answer to finish its progress update.',
            'itemId',
          );
      }

      const state = await transaction.lockItemState(turn.id);
      const answeredAt = this.now();
      const isCorrect = request.selectedOptionId === turn.correctOptionId;
      const bucket = this.scheduler.evaluate(state, isCorrect, answeredAt);

      aggregate.recordOutcome(isCorrect, answeredAt);

      const correct = turn.answerOptions.find((option) => option.id === turn.correctOptionId)!;
      const result: AnswerResult = {
        sessionId: session.id,
        itemId: turn.id,
        selectedOptionId: request.selectedOptionId,
        correctOptionId: turn.correctOptionId,
        isCorrect,
        correctAnswer: { scriptMode: correct.scriptMode, value: correct.value },
        feedback: this.feedback(turn, bucket.currentBucket, correct.value),
        bucketUpdate: bucket,
        sessionProgress: {
          totalItems: session.turns.length,
          totalAnswered: session.totalAnswered,
          correctCount: session.correctCount,
          incorrectCount: session.incorrectCount,
          isCompleted: session.status === 'COMPLETED',
        },
        nextItem: publicItem(session.turns[session.totalAnswered]),
        progressImpact: null,
      };

      const answer: StoredAnswer = {
        id: randomUUID(),
        eventId: randomUUID(),
        sessionId: session.id,
        itemId: turn.id,
        selectedOptionId: request.selectedOptionId,
        responseTimeMs: request.responseTimeMs ?? null,
        answeredAt: answeredAt.toISOString(),
        skillId: turn.item.skillId,
        skillCode: turn.skillCode ?? null,
        result,
        progressRecorded: !turn.item.skillId,
        producerSession: {
          status: session.status,
          title: session.deck.title,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
        },
      };

      await transaction.saveAnswer(answer, turn, bucket);

      return answer;
    });

    if (answer.progressRecorded || !answer.skillId) return answer.result;
    if (!answer.skillCode) throw new Error('Mapped flashcard turn has no skill-code snapshot.');

    const impact = await this.progress.recordAnswer(userId, answer, answer.skillCode);

    return this.repository.saveProgressResult(answer.id, {
      ...answer.result,
      progressImpact: impact,
      feedback: { ...answer.result.feedback, progressMessage: 'Progress updated.' },
    });
  }

  private feedback(
    turn: TurnSnapshot,
    bucket: string,
    correctAnswer: string,
  ): AnswerResult['feedback'] {
    const item = turn.item;
    const base = {
      headline: `Correct answer: ${correctAnswer}`,
      bucketMessage: `Bucket: ${bucket === 'MASTERED' ? 'Mastered' : 'Learning'}.`,
      progressMessage: item.skillId
        ? 'Progress update pending.'
        : 'No syllabus skill is mapped to this item.',
    };

    if (item.itemType === 'KANJI_CHARACTER')
      return {
        ...base,
        variant: 'KANJI_EXPLANATION',
        kanjiDetails: {
          character: item.surfaceFormText,
          englishMeaning: item.englishMeaning ?? '',
          onyomi: item.onyomiReadings ?? [],
          kunyomi: item.kunyomiReadings ?? [],
          exampleWords: item.exampleWords ?? [],
        },
      };

    if (item.itemType === 'VOCABULARY')
      return {
        ...base,
        variant: 'VOCABULARY_EXPLANATION',
        vocabularyDetails: {
          term: item.surfaceFormText,
          kana: item.kanaDisplayText,
          englishMeaning: item.englishMeaning ?? '',
        },
      };

    return { ...base, variant: 'KANA_DEFAULT' };
  }
}

function family(item: FlashcardItem): ContentType {
  return item.itemType === 'KANJI_CHARACTER'
    ? 'KANJI'
    : item.itemType === 'VOCABULARY'
      ? 'VOCABULARY'
      : 'KANA';
}

function publicItem(turn: TurnSnapshot | undefined): ItemPrompt | null {
  return turn
    ? {
        id: turn.id,
        itemType: turn.itemType,
        prompt: { ...turn.prompt },
        answerOptions: turn.answerOptions.map((option) => ({ ...option })),
      }
    : null;
}
