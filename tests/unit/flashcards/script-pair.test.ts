import { ScriptPair } from '@/backend/flashcards/domain/value-objects/script-pair';

const modes = ['KANJI', 'KANA', 'ENGLISH', 'ROMAJI', 'JAPANESE'] as const;
const validPairs = {
  KANJI: [
    'KANJI:KANA',
    'KANJI:ENGLISH',
    'KANA:KANJI',
    'KANA:ENGLISH',
    'ENGLISH:KANJI',
    'ENGLISH:KANA',
  ],
  KANA: ['KANA:ROMAJI', 'ROMAJI:KANA'],
  VOCABULARY: ['JAPANESE:ENGLISH', 'ENGLISH:JAPANESE', 'ENGLISH:KANA'],
} as const;

describe('flashcard script pair rules', () => {
  it.each(['KANJI', 'KANA', 'VOCABULARY'] as const)(
    'allows precisely the documented pairs for %s decks',
    (contentType) => {
      for (const question of modes) {
        for (const answer of modes) {
          const create = () => ScriptPair.create(contentType, question, answer);

          if ((validPairs[contentType] as readonly string[]).includes(`${question}:${answer}`)) {
            expect(create).not.toThrow();
          } else {
            expect(create).toThrow();
          }
        }
      }
    },
  );
});
