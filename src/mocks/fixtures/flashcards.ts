import type {
  FlashcardAnswerResult,
  FlashcardDeck,
  FlashcardItem,
  FlashcardSession,
  ScriptMode,
} from '@/frontend/flashcards/interfaces/entities';
import type { CreateFlashcardSessionRequest } from '@/frontend/flashcards/interfaces/requests';

export const FLASHCARD_DECK_IDS = {
  kana: 'a0000000-0000-4000-8000-000000000001',
  kanji: 'a0000000-0000-4000-8000-000000000002',
  vocabulary: 'a0000000-0000-4000-8000-000000000003',
} as const;

export function flashcardDecksFixture(): FlashcardDeck[] {
  return [
    {
      id: FLASHCARD_DECK_IDS.kana,
      slug: 'mock-kana',
      title: 'Kana foundations',
      description: 'Read hiragana and katakana.',
      contentType: 'KANA',
    },
    {
      id: FLASHCARD_DECK_IDS.kanji,
      slug: 'mock-kanji',
      title: 'Kanji foundations',
      description: 'Review day and month kanji.',
      contentType: 'KANJI',
    },
    {
      id: FLASHCARD_DECK_IDS.vocabulary,
      slug: 'mock-vocabulary',
      title: 'Vocabulary foundations',
      description: 'Review common Japanese words.',
      contentType: 'VOCABULARY',
    },
  ].map((deck, index) => ({
    ...deck,
    contentType: deck.contentType as FlashcardDeck['contentType'],
    deckSource: 'SYSTEM',
    deckType: 'FOUNDATION',
    unitSlug: null,
    sortOrder: index + 1,
    itemCount: 2,
    isPublished: true,
  }));
}

export interface MockFlashcardTurn {
  item: FlashcardItem;
  correctOptionId: string;
  feedback: FlashcardAnswerResult['feedback'];
  skillCode: string | null;
}

export function flashcardTurnsFixture(config: CreateFlashcardSessionRequest): MockFlashcardTurn[] {
  const family =
    config.deckId === FLASHCARD_DECK_IDS.kana
      ? 'KANA'
      : config.deckId === FLASHCARD_DECK_IDS.kanji
        ? 'KANJI'
        : 'VOCABULARY';
  const kana = [
    { KANA: 'あ', ROMAJI: 'a', itemType: 'HIRAGANA_CHARACTER' },
    { KANA: 'ア', ROMAJI: 'a', itemType: 'KATAKANA_CHARACTER' },
  ] as const;
  const kanji = [
    {
      KANJI: '日',
      KANA: 'ひ',
      ENGLISH: 'day / sun',
      onyomi: ['ニチ', 'ジツ'],
      kunyomi: ['ひ', 'か'],
      exampleWords: [{ word: '日本', kana: 'にほん', meaning: 'Japan' }],
    },
    {
      KANJI: '月',
      KANA: 'つき',
      ENGLISH: 'month / moon',
      onyomi: ['ゲツ', 'ガツ'],
      kunyomi: ['つき'],
      exampleWords: [{ word: '月曜日', kana: 'げつようび', meaning: 'Monday' }],
    },
  ];
  const vocabulary = [
    { JAPANESE: '日本', KANA: 'にほん', ENGLISH: 'Japan' },
    { JAPANESE: '学校', KANA: 'がっこう', ENGLISH: 'school' },
  ];
  const distractors: Record<ScriptMode, string[]> = {
    KANJI: ['火', '水', '木'],
    KANA: ['い', 'う', 'え'],
    ENGLISH: ['fire', 'water', 'tree'],
    ROMAJI: ['i', 'u', 'e'],
    JAPANESE: ['先生', '学生', '友達'],
  };

  return [0, 1].map((index) => {
    const values =
      family === 'KANA' ? kana[index] : family === 'KANJI' ? kanji[index] : vocabulary[index];
    const scriptValues = values as Partial<Record<ScriptMode, string>>;
    const correctValue = scriptValues[config.answerScriptMode]!;
    const base = {
      headline: `Correct answer: ${correctValue}`,
      bucketMessage: 'Card is now in Learning.',
      progressMessage:
        family === 'VOCABULARY' && index === 1
          ? 'Card practice saved without syllabus mastery.'
          : 'Progress updated.',
    };
    let feedback: FlashcardAnswerResult['feedback'] = { ...base, variant: 'KANA_DEFAULT' };

    if (family === 'KANJI') {
      const entry = kanji[index];
      feedback = {
        ...base,
        variant: 'KANJI_EXPLANATION',
        kanjiDetails: {
          character: entry.KANJI,
          englishMeaning: entry.ENGLISH,
          onyomi: entry.onyomi,
          kunyomi: entry.kunyomi,
          exampleWords: entry.exampleWords,
        },
      };
    } else if (family === 'VOCABULARY') {
      const entry = vocabulary[index];
      feedback = {
        ...base,
        variant: 'VOCABULARY_EXPLANATION',
        vocabularyDetails: {
          term: entry.JAPANESE,
          kana: entry.KANA,
          englishMeaning: entry.ENGLISH,
        },
      };
    }

    return {
      item: {
        id: `b0000000-0000-4000-8000-0000000000${family === 'KANA' ? '1' : family === 'KANJI' ? '2' : '3'}${index + 1}`,
        itemType:
          family === 'KANA'
            ? kana[index].itemType
            : family === 'KANJI'
              ? 'KANJI_CHARACTER'
              : 'VOCABULARY',
        prompt: {
          scriptMode: config.questionScriptMode,
          value: scriptValues[config.questionScriptMode]!,
        },
        answerOptions: [correctValue, ...distractors[config.answerScriptMode]].map(
          (value, optionIndex) => ({
            id: `opt_${optionIndex + 1}`,
            scriptMode: config.answerScriptMode,
            value,
          }),
        ),
      },
      correctOptionId: 'opt_1',
      feedback,
      skillCode:
        family === 'VOCABULARY' && index === 1 ? null : `mock_${family.toLowerCase()}_${index + 1}`,
    };
  });
}

export function flashcardSessionFixture(
  options: Partial<CreateFlashcardSessionRequest> & { id?: string } = {},
): FlashcardSession {
  const deck =
    flashcardDecksFixture().find((entry) => entry.id === options.deckId) ??
    flashcardDecksFixture()[0];
  const config: CreateFlashcardSessionRequest = {
    deckId: deck.id,
    questionScriptMode:
      options.questionScriptMode ??
      (deck.contentType === 'KANJI' ? 'KANJI' : deck.contentType === 'KANA' ? 'KANA' : 'JAPANESE'),
    answerScriptMode:
      options.answerScriptMode ?? (deck.contentType === 'KANA' ? 'ROMAJI' : 'ENGLISH'),
  };

  return {
    id: options.id ?? 'c0000000-0000-4000-8000-000000000001',
    status: 'ACTIVE',
    startedAt: '2026-04-04T10:00:00.000Z',
    deck: {
      id: deck.id,
      slug: deck.slug,
      title: deck.title,
      deckSource: deck.deckSource,
      deckType: deck.deckType,
      contentType: deck.contentType,
    },
    sessionConfig: {
      questionScriptMode: config.questionScriptMode,
      answerScriptMode: config.answerScriptMode,
      isLocked: true,
    },
    sessionProgress: { totalItems: 2, totalAnswered: 0, correctCount: 0, incorrectCount: 0 },
    currentItem: flashcardTurnsFixture(config)[0].item,
  };
}
