export type SeedScriptMode = 'KANJI' | 'KANA' | 'ROMAJI' | 'ENGLISH' | 'JAPANESE';

export interface FlashcardSeedItem {
  id: string;
  skillId: string | null;
  itemType: 'KANJI_CHARACTER' | 'HIRAGANA_CHARACTER' | 'KATAKANA_CHARACTER' | 'VOCABULARY';
  surfaceFormText: string;
  kanaDisplayText: string | null;
  romajiText: string | null;
  englishMeaning: string | null;
  onyomiReadings: string[] | null;
  kunyomiReadings: string[] | null;
  exampleWords: { word: string; kana: string; meaning: string }[] | null;
  answerOptionPayload: Partial<
    Record<SeedScriptMode, { canonicalAnswer: string; distractors: string[] }>
  >;
  explanationText: string | null;
  isActive: boolean;
}

export interface FlashcardSeedPlan {
  decks: {
    id: string;
    slug: string;
    unitId: string | null;
    title: string;
    description: string | null;
    deckSource: 'SYSTEM';
    deckType: 'FOUNDATION';
    contentType: 'KANA' | 'KANJI' | 'VOCABULARY';
    sortOrder: number;
    isPublished: boolean;
  }[];
  items: FlashcardSeedItem[];
  deckItems: { deckId: string; itemId: string; sortOrder: number }[];
  counts: {
    decks: number;
    items: number;
    memberships: number;
    mappedItems: number;
    pendingItems: number;
  };
}

export interface PrepareFlashcardSeedService {
  prepare(): Promise<FlashcardSeedPlan>;
}
