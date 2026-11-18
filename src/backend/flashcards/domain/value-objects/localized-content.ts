import { z } from 'zod';
import { FlashcardError } from '@/backend/flashcards/domain/exceptions/flashcard-error';
import type {
  FlashcardDeck,
  FlashcardItem,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';
import type { Locale, Localization } from '@/shared/locale';

const text = z.string().trim().min(1);
const revision = z.number().int().positive();

const provenance = {
  sourceRevision: revision,
  translationRevision: revision,
  isPublished: z.boolean(),
  sourceRefs: z.array(text).min(1),
};

export const deckTranslationSchema = z.strictObject({
  ...provenance,
  title: text.max(255),
  description: z.string().nullable(),
});

export const itemTranslationSchema = z
  .strictObject({
    ...provenance,
    meaning: text.nullable(),
    explanationText: text.nullable(),
    exampleWords: z.array(z.strictObject({ word: text, kana: text, meaning: text })),
    scriptOptions: z.partialRecord(
      z.enum(['KANJI', 'KANA', 'ROMAJI', 'JAPANESE']),
      z.strictObject({
        canonicalAnswer: text,
        aliases: z.array(text).min(1),
        distractors: z.array(text),
      }),
    ),
    meaningOptions: z
      .strictObject({
        canonicalAnswer: text,
        aliases: z.array(text).min(1),
        distractors: z.array(text),
      })
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      value.meaning !== value.meaningOptions?.canonicalAnswer &&
      !(value.meaning === null && value.meaningOptions === null)
    )
      ctx.addIssue({ code: 'custom', message: 'Meaning must match the canonical answer.' });

    if (
      value.meaningOptions &&
      !value.meaningOptions.aliases
        .map(normalizeFlashcardText)
        .includes(normalizeFlashcardText(value.meaningOptions.canonicalAnswer))
    )
      ctx.addIssue({ code: 'custom', message: 'Canonical meaning must be included in aliases.' });
  });

export type DeckTranslation = z.infer<typeof deckTranslationSchema>;
export type ItemTranslation = z.infer<typeof itemTranslationSchema>;

export type DeckLocalizations = Partial<Record<Locale, DeckTranslation>>;
export type ItemLocalizations = Partial<Record<Locale, ItemTranslation>>;

export function normalizeFlashcardText(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

export class LocalizedFlashcardContent {
  static deck(deck: FlashcardDeck, requested: Locale): FlashcardDeck {
    // Custom deck titles are user-authored and have no declared translation language.
    if (deck.deckSource === 'CUSTOM')
      return { ...deck, contentFormat: 'localized', contentLocale: requested };

    const english = deckTranslationSchema.safeParse(deck.localizations?.en);

    if (
      !english.success ||
      !english.data.isPublished ||
      english.data.sourceRevision !== deck.contentRevision
    )
      throw new FlashcardError(
        142205001,
        'Deck has no current published English translation.',
        'deckId',
      );

    for (const locale of requested === 'id' ? (['id', 'en'] as const) : (['en'] as const)) {
      const parsed = deckTranslationSchema.safeParse(deck.localizations?.[locale]);

      if (
        parsed.success &&
        parsed.data.isPublished &&
        parsed.data.sourceRevision === deck.contentRevision
      ) {
        return {
          ...deck,
          title: parsed.data.title,
          description: parsed.data.description,
          localization: this.metadata(
            requested,
            locale,
            deck.contentRevision!,
            parsed.data.translationRevision,
          ),
          contentFormat: 'localized',
          contentLocale: requested,
        };
      }
    }

    throw new FlashcardError(
      142205001,
      'Deck has no current published English translation.',
      'deckId',
    );
  }

  static item(
    item: FlashcardItem,
    requested: Locale,
  ): { item: FlashcardItem; localization: Localization; content: ItemTranslation }[] {
    const candidates: {
      item: FlashcardItem;
      localization: Localization;
      content: ItemTranslation;
    }[] = [];

    const english = itemTranslationSchema.safeParse(item.localizations?.en);

    if (
      !english.success ||
      !english.data.isPublished ||
      english.data.sourceRevision !== item.contentRevision
    )
      return candidates;

    const requiresMeaning = item.itemType === 'VOCABULARY' || item.itemType === 'KANJI_CHARACTER';

    if (requiresMeaning && (!english.data.meaning || !english.data.meaningOptions))
      return candidates;

    for (const locale of requested === 'id' ? (['id', 'en'] as const) : (['en'] as const)) {
      const parsed = itemTranslationSchema.safeParse(item.localizations?.[locale]);

      if (
        !parsed.success ||
        !parsed.data.isPublished ||
        parsed.data.sourceRevision !== item.contentRevision
      )
        continue;

      const content = parsed.data;

      const aliases = (seed: ItemTranslation['scriptOptions']) =>
        Object.fromEntries(
          Object.entries(seed)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([mode, bank]) => [
              mode,
              [...new Set(bank.aliases.map(normalizeFlashcardText))].sort(),
            ]),
        );

      if (
        JSON.stringify(aliases(content.scriptOptions)) !==
        JSON.stringify(aliases(english.data.scriptOptions))
      )
        continue;

      if (
        Object.entries(content.scriptOptions).some(
          ([mode, seed]) =>
            seed.canonicalAnswer !== item.answerOptionPayload[mode as 'KANA']?.canonicalAnswer ||
            !seed.aliases
              .map(normalizeFlashcardText)
              .includes(normalizeFlashcardText(seed.canonicalAnswer)),
        )
      )
        continue;

      if (requiresMeaning) {
        if (!content.meaning || !content.meaningOptions) continue;
      }

      const projected = structuredClone(item);
      delete projected.localizations;

      projected.answerOptionPayload = Object.fromEntries(
        Object.entries(content.scriptOptions).map(([mode, value]) => [
          mode,
          {
            canonicalAnswer: value.canonicalAnswer,
            distractors: value.distractors.filter(
              (candidate) =>
                !value.aliases
                  .map(normalizeFlashcardText)
                  .includes(normalizeFlashcardText(candidate)),
            ),
          },
        ]),
      );

      if (content.meaningOptions)
        projected.answerOptionPayload.MEANING = {
          canonicalAnswer: content.meaningOptions.canonicalAnswer,
          distractors: content.meaningOptions.distractors.filter(
            (value) =>
              !content
                .meaningOptions!.aliases.map(normalizeFlashcardText)
                .includes(normalizeFlashcardText(value)),
          ),
        };

      candidates.push({
        item: projected,
        content,
        localization: this.metadata(
          requested,
          locale,
          item.contentRevision!,
          content.translationRevision,
        ),
      });
    }

    return candidates;
  }

  private static metadata(
    requestedLocale: Locale,
    resolvedLocale: Locale,
    contentRevision: number,
    translationRevision: number,
  ): Localization {
    return {
      requestedLocale,
      resolvedLocale,
      isFallback: requestedLocale !== resolvedLocale,
      contentRevision,
      translationRevision,
    };
  }
}
