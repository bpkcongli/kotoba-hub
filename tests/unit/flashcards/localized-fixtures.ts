import type { FlashcardItem } from '@/backend/flashcards/domain/repositories/flashcard.repository';
import type { ItemTranslation } from '@/backend/flashcards/domain/value-objects/localized-content';

export function translation(item: FlashcardItem, meaning = 'hari / matahari'): ItemTranslation {
  return {
    sourceRevision: 1,
    translationRevision: 1,
    isPublished: true,
    sourceRefs: ['KOTOBAHUB_INTERNAL:BIL-05-test'],
    meaning,
    explanationText: 'Arti karakter ini dalam bahasa Indonesia.',
    exampleWords: [{ word: '日本', kana: 'にほん', meaning: 'Jepang' }],
    scriptOptions: Object.fromEntries(
      Object.entries(item.answerOptionPayload)
        .filter(([mode]) => mode !== 'ENGLISH')
        .map(([mode, seed]) => [mode, { ...seed!, aliases: [seed!.canonicalAnswer] }]),
    ),
    meaningOptions: {
      canonicalAnswer: meaning,
      aliases: [meaning, 'hari'],
      distractors: ['bulan', 'pohon', 'api', 'air'],
    },
  };
}
