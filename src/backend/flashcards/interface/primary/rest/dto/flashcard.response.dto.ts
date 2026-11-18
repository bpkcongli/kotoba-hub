import type { DeckReadModel } from '@/backend/flashcards/application/services/flashcard.service';
import type {
  AnswerResult,
  ContentType,
  ItemPrompt,
  ItemType,
  ScriptMode,
  SessionSnapshot,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';
import type { Locale, Localization } from '@/shared/locale';

export interface FlashcardDeckResponseDto {
  localization?: Localization;
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  deckSource: 'SYSTEM' | 'CUSTOM';
  deckType: string;
  contentType: ContentType;
  unitSlug: string | null;
  sortOrder: number;
  itemCount: number;
  isPublished: boolean;
}

export interface FlashcardItemResponseDto {
  localization?: Localization;
  id: string;
  itemType: ItemType;
  prompt: { scriptMode: ScriptMode; value: string };
  answerOptions: { id: string; scriptMode: ScriptMode; value: string }[];
}

export interface FlashcardSessionResponseDto {
  id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  deck: Pick<
    FlashcardDeckResponseDto,
    'id' | 'slug' | 'title' | 'deckSource' | 'deckType' | 'contentType' | 'localization'
  >;
  sessionConfig: {
    questionScriptMode: ScriptMode;
    answerScriptMode: ScriptMode;
    isLocked: true;
    contentFormat?: 'localized';
    contentLocale?: Locale;
  };
  sessionProgress: {
    totalItems: number;
    totalAnswered: number;
    correctCount: number;
    incorrectCount: number;
  };
  currentItem: FlashcardItemResponseDto | null;
}

export interface FlashcardAnswerResponseDto {
  localization?: Localization;
  sessionId: string;
  itemId: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  correctAnswer: { scriptMode: ScriptMode; value: string };
  feedback: AnswerResult['feedback'];
  bucketUpdate: AnswerResult['bucketUpdate'];
  sessionProgress: AnswerResult['sessionProgress'];
  nextItem: FlashcardItemResponseDto | null;
  progressImpact: AnswerResult['progressImpact'];
}

export function toFlashcardDeckDto(deck: DeckReadModel): FlashcardDeckResponseDto {
  return {
    ...(deck.localization ? { localization: { ...deck.localization } } : {}),
    id: deck.id,
    slug: deck.slug,
    title: deck.title,
    description: deck.description,
    deckSource: deck.deckSource,
    deckType: deck.deckType,
    contentType: deck.contentType,
    unitSlug: deck.unitSlug,
    sortOrder: deck.sortOrder,
    itemCount: deck.itemCount,
    isPublished: deck.isPublished,
  };
}

export function toFlashcardItemDto(
  item: ItemPrompt | null | undefined,
): FlashcardItemResponseDto | null {
  return item
    ? {
        ...(item.localization ? { localization: { ...item.localization } } : {}),
        id: item.id,
        itemType: item.itemType,
        prompt: { scriptMode: item.prompt.scriptMode, value: item.prompt.value },
        answerOptions: item.answerOptions.map((option) => ({
          id: option.id,
          scriptMode: option.scriptMode,
          value: option.value,
        })),
      }
    : null;
}

export function toFlashcardSessionDto(session: SessionSnapshot): FlashcardSessionResponseDto {
  return {
    id: session.id,
    status: session.status,
    startedAt: session.startedAt,
    deck: {
      id: session.deck.id,
      slug: session.deck.slug,
      title: session.deck.title,
      ...(session.deck.localization ? { localization: { ...session.deck.localization } } : {}),
      deckSource: session.deck.deckSource,
      deckType: session.deck.deckType,
      contentType: session.deck.contentType,
    },
    sessionConfig: {
      questionScriptMode: session.questionScriptMode,
      answerScriptMode: session.answerScriptMode,
      isLocked: true,
      ...(session.deck.contentFormat
        ? { contentFormat: session.deck.contentFormat, contentLocale: session.deck.contentLocale }
        : {}),
    },
    sessionProgress: {
      totalItems: session.turns.length,
      totalAnswered: session.totalAnswered,
      correctCount: session.correctCount,
      incorrectCount: session.incorrectCount,
    },
    currentItem: toFlashcardItemDto(session.turns[session.totalAnswered]),
  };
}

export function toFlashcardAnswerDto(answer: AnswerResult): FlashcardAnswerResponseDto {
  const feedback: FlashcardAnswerResponseDto['feedback'] = {
    variant: answer.feedback.variant,
    headline: answer.feedback.headline,
    bucketMessage: answer.feedback.bucketMessage,
    progressMessage: answer.feedback.progressMessage,
    ...(answer.localization ? { explanationText: answer.feedback.explanationText ?? null } : {}),
  };

  const kanji = answer.feedback.kanjiDetails;
  const vocabulary = answer.feedback.vocabularyDetails;

  if (kanji)
    feedback.kanjiDetails = {
      character: kanji.character,
      ...(answer.localization
        ? { meaning: kanji.meaning ?? '' }
        : { englishMeaning: kanji.englishMeaning ?? '' }),
      onyomi: [...kanji.onyomi],
      kunyomi: [...kanji.kunyomi],
      exampleWords: kanji.exampleWords.map((word) => ({
        word: word.word,
        kana: word.kana,
        meaning: word.meaning,
      })),
    };

  if (vocabulary)
    feedback.vocabularyDetails = {
      term: vocabulary.term,
      kana: vocabulary.kana,
      ...(answer.localization
        ? { meaning: vocabulary.meaning ?? '' }
        : { englishMeaning: vocabulary.englishMeaning ?? '' }),
    };

  return {
    ...(answer.localization ? { localization: { ...answer.localization } } : {}),
    sessionId: answer.sessionId,
    itemId: answer.itemId,
    selectedOptionId: answer.selectedOptionId,
    correctOptionId: answer.correctOptionId,
    isCorrect: answer.isCorrect,
    correctAnswer: {
      scriptMode: answer.correctAnswer.scriptMode,
      value: answer.correctAnswer.value,
    },
    feedback,
    bucketUpdate: {
      previousBucket: answer.bucketUpdate.previousBucket,
      currentBucket: answer.bucketUpdate.currentBucket,
      consecutiveCorrectCount: answer.bucketUpdate.consecutiveCorrectCount,
      nextDueAt: answer.bucketUpdate.nextDueAt,
    },
    sessionProgress: {
      totalItems: answer.sessionProgress.totalItems,
      totalAnswered: answer.sessionProgress.totalAnswered,
      correctCount: answer.sessionProgress.correctCount,
      incorrectCount: answer.sessionProgress.incorrectCount,
      isCompleted: answer.sessionProgress.isCompleted,
    },
    nextItem: toFlashcardItemDto(answer.nextItem),
    progressImpact: answer.progressImpact
      ? {
          progressEventId: answer.progressImpact.progressEventId,
          skillCode: answer.progressImpact.skillCode,
          masteryScore: answer.progressImpact.masteryScore,
          masteryState: answer.progressImpact.masteryState,
          recommendedDifficultyBand: answer.progressImpact.recommendedDifficultyBand,
        }
      : null,
  };
}
