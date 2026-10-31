import type {
  FlashcardAnswerResult,
  FlashcardSession,
} from '@/frontend/flashcards/interfaces/entities';
import type {
  CreateFlashcardSessionRequest,
  FlashcardAnswerRequest,
} from '@/frontend/flashcards/interfaces/requests';
import {
  flashcardSessionFixture,
  flashcardTurnsFixture,
  type MockFlashcardTurn,
} from '@/mocks/fixtures/flashcards';
import { syllabusLessonFixture } from '@/mocks/fixtures/syllabus';
import { recordMockProgress } from './progress';
import { registerMockStateReset } from './reset';

interface MockSession {
  ownerId: string;
  session: FlashcardSession;
  turns: MockFlashcardTurn[];
  answers: Map<string, { payload: FlashcardAnswerRequest; result: FlashcardAnswerResult }>;
}

const sessions = new Map<string, MockSession>();

export function createMockFlashcardSession(
  ownerId: string,
  config: CreateFlashcardSessionRequest,
): FlashcardSession {
  const session = flashcardSessionFixture({ ...config, id: crypto.randomUUID() });
  sessions.set(session.id, {
    ownerId,
    session,
    turns: flashcardTurnsFixture(config),
    answers: new Map(),
  });

  return structuredClone(session);
}

export function answerMockFlashcardSession(
  ownerId: string,
  sessionId: string,
  payload: FlashcardAnswerRequest,
): { result: FlashcardAnswerResult } | { code: number; message: string; httpStatus: number } {
  const state = sessions.get(sessionId);

  if (!state || state.ownerId !== ownerId)
    return { code: 140405002, message: 'This flashcard session is unavailable.', httpStatus: 404 };

  const previous = state.answers.get(payload.itemId);

  if (previous) {
    if (
      previous.payload.selectedOptionId === payload.selectedOptionId &&
      previous.payload.responseTimeMs === payload.responseTimeMs
    )
      return { result: structuredClone(previous.result) };

    return {
      code: 142205005,
      message: 'Retry the original answer or start a new session.',
      httpStatus: 422,
    };
  }

  const { session } = state;
  const turn = state.turns[session.sessionProgress.totalAnswered];

  if (!turn || turn.item.id !== payload.itemId)
    return { code: 142205005, message: 'This card is not the current turn.', httpStatus: 422 };

  if (!turn.item.answerOptions.some((option) => option.id === payload.selectedOptionId))
    return { code: 142205006, message: 'Choose one of the available answers.', httpStatus: 422 };

  const isCorrect = payload.selectedOptionId === turn.correctOptionId;
  const correct = turn.item.answerOptions.find((option) => option.id === turn.correctOptionId)!;
  const progress = {
    totalItems: session.sessionProgress.totalItems,
    totalAnswered: session.sessionProgress.totalAnswered + 1,
    correctCount: session.sessionProgress.correctCount + Number(isCorrect),
    incorrectCount: session.sessionProgress.incorrectCount + Number(!isCorrect),
  };
  const nextItem = state.turns[progress.totalAnswered]?.item ?? null;
  const result: FlashcardAnswerResult = {
    sessionId,
    itemId: payload.itemId,
    selectedOptionId: payload.selectedOptionId,
    correctOptionId: turn.correctOptionId,
    isCorrect,
    correctAnswer: { scriptMode: correct.scriptMode, value: correct.value },
    feedback: turn.feedback,
    bucketUpdate: {
      previousBucket: 'NEW',
      currentBucket: 'LEARNING',
      consecutiveCorrectCount: Number(isCorrect),
      nextDueAt: isCorrect ? '2026-04-04T12:00:00.000Z' : '2026-04-04T10:10:00.000Z',
    },
    sessionProgress: { ...progress, isCompleted: nextItem === null },
    nextItem,
    progressImpact: turn.skillCode
      ? {
          progressEventId: crypto.randomUUID(),
          skillCode: turn.skillCode,
          masteryScore: isCorrect ? 42.5 : 12.5,
          masteryState: 'WEAK',
          recommendedDifficultyBand: 'STANDARD',
        }
      : null,
  };
  session.sessionProgress = progress;
  session.currentItem = nextItem;
  session.status = nextItem ? 'ACTIVE' : 'COMPLETED';
  state.answers.set(payload.itemId, {
    payload: structuredClone(payload),
    result: structuredClone(result),
  });

  if (result.progressImpact) {
    const lesson = syllabusLessonFixture();
    const answeredAt = new Date().toISOString();

    recordMockProgress({
      ownerId,
      event: {
        id: result.progressImpact.progressEventId,
        sourceType: 'FLASHCARD',
        sourceSessionId: sessionId,
        sourceEntityId: payload.itemId,
        questionType: turn.item.itemType,
        skillCode: result.progressImpact.skillCode,
        skillTitle: lesson.skills[0]!.title,
        trackSlug: lesson.track.slug,
        unitSlug: lesson.unit.slug,
        lessonSlug: lesson.slug,
        isCorrect,
        numericScore: isCorrect ? 100 : 0,
        confidenceWeight: null,
        responseTimeMs: payload.responseTimeMs,
        answeredAt,
      },
      mastery: result.progressImpact,
      session: {
        sessionStatus: session.status,
        sessionTitle: session.deck.title,
        startedAt: session.startedAt,
        completedAt: nextItem ? null : answeredAt,
      },
    });
  }

  return { result: structuredClone(result) };
}

export function resetMockFlashcards(): void {
  sessions.clear();
}

registerMockStateReset(resetMockFlashcards);
