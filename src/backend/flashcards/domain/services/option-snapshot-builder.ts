import { randomInt } from 'node:crypto';
import { FlashcardError } from '@/backend/flashcards/domain/exceptions/flashcard-error';
import type {
  FlashcardItem,
  ScriptMode,
  TurnSnapshot,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';
import { LocalizedFlashcardContent } from '@/backend/flashcards/domain/value-objects/localized-content';
import type { Locale } from '@/shared/locale';

export class OptionSnapshotBuilder {
  constructor(private readonly choose: (maximum: number) => number = randomInt) {}

  build(
    item: FlashcardItem,
    questionMode: ScriptMode,
    answerMode: ScriptMode,
    locale?: Locale,
  ): TurnSnapshot {
    if (locale) {
      for (const candidate of LocalizedFlashcardContent.item(item, locale)) {
        try {
          return {
            ...this.build(candidate.item, questionMode, answerMode),
            localization: candidate.localization,
            localizedContent: {
              meaning: candidate.content.meaning,
              explanationText: candidate.content.explanationText,
              exampleWords: structuredClone(candidate.content.exampleWords),
            },
          };
        } catch (error) {
          if (!(error instanceof FlashcardError)) throw error;
        }
      }

      throw new FlashcardError(
        142205001,
        'Item has no unambiguous published localization for this script pair.',
        'deckId',
      );
    }

    const prompt = item.answerOptionPayload[questionMode]?.canonicalAnswer.trim();
    const seed = item.answerOptionPayload[answerMode];

    if (!prompt || !seed?.canonicalAnswer.trim())
      throw new FlashcardError(
        142205001,
        'Item does not support the selected script pair.',
        'deckId',
      );

    const canonical = seed.canonicalAnswer.trim();
    const normalized = (value: string) =>
      value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

    const accepted = new Set(
      Object.values(item.answerOptionPayload)
        .map((value) => normalized(value?.canonicalAnswer ?? ''))
        .filter(Boolean),
    );
    const distinct = new Map<string, string>();

    for (const value of seed.distractors) {
      const key = normalized(value);
      if (key && !accepted.has(key) && !distinct.has(key)) distinct.set(key, value.trim());
    }

    const pool = [...distinct.values()];
    if (pool.length < 1)
      throw new FlashcardError(
        142205001,
        'Item has no distinct distractor for the selected script pair.',
        'deckId',
      );

    const values = [canonical, ...this.shuffle(pool).slice(0, 3)];

    const options = this.shuffle(values).map((value, index) => ({
      id: `opt_${index + 1}`,
      scriptMode: answerMode,
      value,
    }));

    return {
      id: item.id,
      itemType: item.itemType,
      prompt: { scriptMode: questionMode, value: prompt },
      answerOptions: options,
      correctOptionId: options.find((option) => option.value === canonical)!.id,
      item: structuredClone(item),
    };
  }

  private shuffle<T>(input: T[]): T[] {
    const values = [...input];

    for (let index = values.length - 1; index > 0; index--) {
      const target = this.choose(index + 1);
      [values[index], values[target]] = [values[target]!, values[index]!];
    }

    return values;
  }
}
