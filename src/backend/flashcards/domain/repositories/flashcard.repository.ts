export type ContentType = 'KANJI' | 'KANA' | 'VOCABULARY';
export type ScriptMode = 'KANJI' | 'KANA' | 'ENGLISH' | 'ROMAJI' | 'JAPANESE';

export type ItemType =
  'KANJI_CHARACTER' | 'HIRAGANA_CHARACTER' | 'KATAKANA_CHARACTER' | 'VOCABULARY';

export type Bucket = 'NEW' | 'LEARNING' | 'MASTERED';

export type AnswerOptionPayload = Partial<
  Record<ScriptMode, { canonicalAnswer: string; distractors: string[] }>
>;

export interface FlashcardItem {
  id: string;
  skillId: string | null;
  itemType: ItemType;
  surfaceFormText: string;
  kanaDisplayText: string | null;
  romajiText: string | null;
  englishMeaning: string | null;
  onyomiReadings: string[] | null;
  kunyomiReadings: string[] | null;
  exampleWords: { word: string; kana: string; meaning: string }[] | null;
  answerOptionPayload: AnswerOptionPayload;
  isActive: boolean;
}

export interface FlashcardDeck {
  id: string;
  ownerUserId: string | null;
  slug: string | null;
  unitId: string | null;
  title: string;
  description: string | null;
  deckSource: 'SYSTEM' | 'CUSTOM';
  deckType: string;
  contentType: ContentType;
  sortOrder: number;
  isPublished: boolean;
  itemCount: number;
}

export interface ItemPrompt {
  id: string;
  itemType: ItemType;
  prompt: { scriptMode: ScriptMode; value: string };
  answerOptions: { id: string; scriptMode: ScriptMode; value: string }[];
}

export interface TurnSnapshot extends ItemPrompt {
  skillCode?: string | null;
  item: FlashcardItem;
  correctOptionId: string;
}

export interface ItemState {
  currentBucket: Bucket;
  consecutiveCorrectCount: number;
  nextDueAt: string | null;
}

export interface SessionSnapshot {
  id: string;
  userId: string;
  deck: FlashcardDeck;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  questionScriptMode: ScriptMode;
  answerScriptMode: ScriptMode;
  turns: TurnSnapshot[];
  totalAnswered: number;
  correctCount: number;
  incorrectCount: number;
  startedAt: string;
  completedAt: string | null;
}

export interface ProgressImpact {
  progressEventId: string;
  skillCode: string;
  masteryScore: number;
  masteryState: string;
  recommendedDifficultyBand: string;
}

export interface BucketUpdate {
  previousBucket: Bucket;
  currentBucket: Bucket;
  consecutiveCorrectCount: number;
  nextDueAt: string;
}

export interface AnswerResult {
  sessionId: string;
  itemId: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  correctAnswer: { scriptMode: ScriptMode; value: string };
  feedback: {
    variant: 'KANJI_EXPLANATION' | 'VOCABULARY_EXPLANATION' | 'KANA_DEFAULT';
    headline: string;
    bucketMessage: string;
    progressMessage: string;
    kanjiDetails?: {
      character: string;
      englishMeaning: string;
      onyomi: string[];
      kunyomi: string[];
      exampleWords: { word: string; kana: string; meaning: string }[];
    };
    vocabularyDetails?: { term: string; kana: string | null; englishMeaning: string };
  };
  bucketUpdate: BucketUpdate;
  sessionProgress: {
    totalItems: number;
    totalAnswered: number;
    correctCount: number;
    incorrectCount: number;
    isCompleted: boolean;
  };
  nextItem: ItemPrompt | null;
  progressImpact: ProgressImpact | null;
}

export interface StoredAnswer {
  skillCode: string | null;
  id: string;
  eventId: string;
  sessionId: string;
  itemId: string;
  selectedOptionId: string;
  responseTimeMs: number | null;
  answeredAt: string;
  skillId: string | null;
  result: AnswerResult;
  progressRecorded: boolean;
  producerSession: { status: string; title: string; startedAt: string; completedAt: string | null };
}

export interface DeckFilter {
  offset: number;
  limit: number;
  deckSource: 'SYSTEM' | 'CUSTOM' | 'ALL';
  contentType: ContentType | 'ALL';
  deckTypes?: string[];
  unitId?: string;
}

export interface FlashcardWriteTransaction {
  session: SessionSnapshot;
  findAnswer(itemId: string): Promise<StoredAnswer | null>;
  lockItemState(itemId: string): Promise<ItemState>;
  saveAnswer(answer: StoredAnswer, turn: TurnSnapshot, bucket: BucketUpdate): Promise<void>;
}

export interface FlashcardRepository {
  listDecks(
    userId: string,
    filter: DeckFilter,
  ): Promise<{ items: FlashcardDeck[]; totalRecords: number }>;

  findDeck(userId: string, deckId: string): Promise<FlashcardDeck | null>;

  findItems(itemIds: string[]): Promise<FlashcardItem[]>;

  getDeckItems(deckId: string): Promise<FlashcardItem[]>;

  getItemStates(userId: string, itemIds: string[]): Promise<Record<string, ItemState>>;

  createDeck(deck: FlashcardDeck, itemIds: string[]): Promise<void>;

  createSession(session: SessionSnapshot): Promise<void>;

  withSessionLock<T>(
    userId: string,
    sessionId: string,
    work: (tx: FlashcardWriteTransaction) => Promise<T>,
  ): Promise<T>;

  saveProgressResult(answerId: string, result: AnswerResult): Promise<AnswerResult>;
}
