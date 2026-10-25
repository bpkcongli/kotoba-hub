import type {
  FlashcardDeck,
  FlashcardItem,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';

export const ids = {
  user: '10000000-0000-4000-8000-000000000001',
  otherUser: '10000000-0000-4000-8000-000000000002',
  deck: '20000000-0000-4000-8000-000000000001',
  otherDeck: '20000000-0000-4000-8000-000000000002',
  item: '30000000-0000-4000-8000-000000000001',
  nextItem: '30000000-0000-4000-8000-000000000002',
  skill: '40000000-0000-4000-8000-000000000001',
};

export function item(overrides: Partial<FlashcardItem> = {}): FlashcardItem {
  return {
    id: ids.item,
    skillId: ids.skill,
    itemType: 'KANJI_CHARACTER',
    surfaceFormText: '日',
    kanaDisplayText: 'にち・ひ',
    romajiText: null,
    englishMeaning: 'day / sun',
    onyomiReadings: ['ニチ', 'ジツ'],
    kunyomiReadings: ['ひ'],
    exampleWords: [{ word: '日本', kana: 'にほん', meaning: 'Japan' }],
    answerOptionPayload: {
      KANJI: { canonicalAnswer: '日', distractors: ['月', '木', '火', '水'] },
      KANA: { canonicalAnswer: 'にち・ひ', distractors: ['つき', 'き', 'ひ・か', 'みず'] },
      ENGLISH: {
        canonicalAnswer: 'day / sun',
        distractors: ['month / moon', 'tree', 'fire', 'water', 'gold'],
      },
    },
    isActive: true,
    ...overrides,
  };
}

export function deck(overrides: Partial<FlashcardDeck> = {}): FlashcardDeck {
  return {
    id: ids.deck,
    ownerUserId: null,
    slug: 'n5-kanji',
    unitId: null,
    title: 'N5 Kanji',
    description: null,
    deckSource: 'SYSTEM',
    deckType: 'FOUNDATION',
    contentType: 'KANJI',
    sortOrder: 1,
    isPublished: true,
    itemCount: 1,
    ...overrides,
  };
}
