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

  static create(
    contentType: ContentType,
    questionMode: string,
    answerMode: string,
    localized = false,
  ): ScriptPair {
    if (
      (localized && [questionMode, answerMode].includes('ENGLISH')) ||
      (!localized && [questionMode, answerMode].includes('MEANING'))
    ) {
      throw new FlashcardError(
        142205004,
        'Script mode does not match contentFormat.',
        'answerScriptMode',
      );
    }

    const meaning = localized ? 'MEANING' : 'ENGLISH';
    const pairs: Record<ContentType, Record<string, string[]>> = {
      KANJI: { KANJI: ['KANA', meaning], KANA: ['KANJI', meaning], [meaning]: ['KANJI', 'KANA'] },
      KANA: { KANA: ['ROMAJI'], ROMAJI: ['KANA'] },
      VOCABULARY: { JAPANESE: [meaning], [meaning]: ['JAPANESE', 'KANA'] },
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
