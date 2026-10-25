import { FlashcardError } from '@/backend/flashcards/domain/exceptions/flashcard-error';
import type {
  ContentType,
  ScriptMode,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';

export class ScriptPair {
  private constructor(
    public readonly questionScriptMode: ScriptMode,
    public readonly answerScriptMode: ScriptMode,
  ) {}

  static create(contentType: ContentType, questionMode: string, answerMode: string): ScriptPair {
    const pairs: Record<ContentType, Record<string, string[]>> = {
      KANJI: { KANJI: ['KANA', 'ENGLISH'], KANA: ['KANJI', 'ENGLISH'], ENGLISH: ['KANJI', 'KANA'] },
      KANA: { KANA: ['ROMAJI'], ROMAJI: ['KANA'] },
      VOCABULARY: { JAPANESE: ['ENGLISH'], ENGLISH: ['JAPANESE', 'KANA'] },
    };
    if (!pairs[contentType][questionMode]?.includes(answerMode))
      throw new FlashcardError(
        142205004,
        'answerScriptMode is not valid for the selected questionScriptMode.',
        'answerScriptMode',
      );

    return new ScriptPair(questionMode as ScriptMode, answerMode as ScriptMode);
  }
}
