import { stableFlashcardSeedId } from '@/backend/flashcards/application/helpers/stable-flashcard-seed-id';
import type {
  CanonicalFlashcardSource,
  FlashcardArtifact,
  FlashcardLocalizationOverlay,
} from '@/backend/flashcards/application/ports/canonical-flashcard-source.port';
import type { FlashcardSeedPlan } from '@/backend/flashcards/application/services/prepare-flashcard-seed.service';
import {
  deckTranslationSchema,
  itemTranslationSchema,
  normalizeFlashcardText as normalize,
} from '@/backend/flashcards/domain/value-objects/localized-content';
import type { ItemTranslation } from '@/backend/flashcards/domain/value-objects/localized-content';
import type { Locale } from '@/shared/locale';

export function attachFlashcardLocalizations(
  plan: FlashcardSeedPlan,
  artifacts: FlashcardArtifact[],
  kanji: Awaited<ReturnType<CanonicalFlashcardSource['readKanjiSkills']>>,
  overlay?: FlashcardLocalizationOverlay,
): void {
  const revision = overlay?.contentRevision ?? 1;
  const provenance = (sourceRefs: string[]) => ({
    sourceRevision: revision,
    translationRevision: overlay?.translationRevision ?? revision,
    isPublished: true,
    sourceRefs,
  });

  const sourceItems = new Map(
    artifacts.flatMap((artifact) => artifact.items).map((item) => [item.id, item]),
  );
  const sourceKanji = new Map(
    kanji.map((item) => [stableFlashcardSeedId(`item/${item.id}/KANJI`), item]),
  );
  const sourceDeckIds = new Set(
    artifacts.flatMap((artifact) => artifact.decks).map((deck) => deck.id),
  );

  for (const [id, entry] of Object.entries(overlay?.items ?? {})) {
    if (sourceItems.get(id)?.surfaceFormText !== entry.surfaceFormText)
      throw new Error(`Localized flashcard identity mismatch: ${id}.`);
  }

  for (const id of Object.keys(overlay?.decks ?? {})) {
    if (!sourceDeckIds.has(id)) throw new Error(`Localized flashcard deck missing: ${id}.`);
  }

  for (const item of plan.items) {
    item.contentRevision = revision;

    const source = sourceItems.get(item.id);
    const rawKanji = sourceKanji.get(item.id);
    const curated = overlay?.items[item.id];

    const meaning = curated?.en ?? item.englishMeaning;
    const aliases =
      source?.answerOptionPayload.canonicalAnswers.ENGLISH ?? rawKanji?.meaningsEn ?? [];
    const sourceRefs = source
      ? [
          `content/flashcards/system-decks/${source.itemType === 'VOCABULARY' ? 'vocabulary' : 'kana'}-foundation.json#${item.id}`,
        ]
      : [`content/syllabus/v1#${rawKanji?.id}`];

    item.localizations = {
      en: itemTranslationSchema.parse({
        ...provenance(curated ? [...sourceRefs, ...(overlay?.sourceRefs ?? [])] : sourceRefs),
        scriptOptions: Object.fromEntries(
          Object.entries(item.answerOptionPayload)
            .filter(([mode]) => mode !== 'ENGLISH')
            .map(([mode, value]) => [
              mode,
              {
                ...value,
                aliases: [
                  ...new Set([
                    value!.canonicalAnswer,
                    ...(source?.answerOptionPayload.canonicalAnswers[mode as 'KANA'] ??
                      (rawKanji && mode === 'KANA'
                        ? [...rawKanji.onyomi, ...rawKanji.kunyomi]
                        : [])),
                  ]),
                ],
              },
            ]),
        ),
        meaning,
        explanationText: item.explanationText,
        exampleWords: item.exampleWords ?? [],
        meaningOptions: meaning
          ? {
              canonicalAnswer: meaning,
              aliases: [...new Set([meaning, ...aliases])],
              distractors: [],
            }
          : null,
      }),
    };

    if (
      curated ||
      item.itemType === 'HIRAGANA_CHARACTER' ||
      item.itemType === 'KATAKANA_CHARACTER'
    ) {
      item.localizations.id = itemTranslationSchema.parse({
        ...provenance(overlay?.sourceRefs ?? sourceRefs),
        scriptOptions: structuredClone(item.localizations.en!.scriptOptions),
        meaning: curated?.id ?? null,
        explanationText: null,
        exampleWords: [],
        meaningOptions: curated
          ? { canonicalAnswer: curated.id, aliases: [curated.id], distractors: [] }
          : null,
      });
    }
  }

  for (const locale of ['en', 'id'] as const) {
    for (const item of plan.items) {
      const content = item.localizations?.[locale];
      if (!content) continue;

      const sharedPrompt = (other: typeof item) => {
        const otherContent = other.localizations?.[locale];
        if (!otherContent) return true;

        const accepted = { ...content.scriptOptions, MEANING: content.meaningOptions };
        const candidates = { ...otherContent.scriptOptions, MEANING: otherContent.meaningOptions };

        return Object.entries(accepted).some(([mode, seed]) =>
          seed?.aliases.some((alias) =>
            candidates[mode as 'MEANING']?.aliases.map(normalize).includes(normalize(alias)),
          ),
        );
      };

      for (const [mode, seed] of Object.entries({
        ...content.scriptOptions,
        MEANING: content.meaningOptions,
      })) {
        if (!seed) continue;

        const accepted = new Set(seed.aliases.map(normalize));
        const seen = new Set<string>();

        seed.distractors = plan.items
          .flatMap((other) => {
            const otherContent = other.localizations?.[locale];
            const candidate =
              mode === 'MEANING'
                ? otherContent?.meaningOptions
                : otherContent?.scriptOptions[mode as 'KANA'];

            if (
              other.id === item.id ||
              other.itemType !== item.itemType ||
              !candidate ||
              sharedPrompt(other) ||
              candidate.aliases.some((alias) => accepted.has(normalize(alias)))
            )
              return [];

            const value = candidate.canonicalAnswer;

            if (seen.has(normalize(value))) return [];

            seen.add(normalize(value));

            return [value];
          })
          .slice(0, 30);

        validateOptionBank(seed, locale, item.id);
      }
    }
  }

  for (const deck of plan.decks) {
    deck.contentRevision = revision;

    const curated = overlay?.decks[deck.id];

    deck.localizations = {
      en: deckTranslationSchema.parse({
        ...provenance([`content/flashcards/system-decks#${deck.id}`]),
        title: curated?.en ?? deck.title,
        description: deck.description,
      }),
    };

    const unitSlug = kanji.find(
      (item) => stableFlashcardSeedId(`deck/${item.unitSlug}/KANJI`) === deck.id,
    )?.unitSlug;
    const title =
      curated?.id ??
      (unitSlug && overlay?.unitTitles[unitSlug]
        ? `Kanji ${unitSlug.slice(0, 2).toUpperCase()}: ${overlay.unitTitles[unitSlug]}`
        : undefined);

    if (title)
      deck.localizations.id = deckTranslationSchema.parse({
        ...provenance(overlay?.sourceRefs ?? []),
        title,
        description: null,
      });
  }
}

function validateOptionBank(
  seed: NonNullable<ItemTranslation['meaningOptions']>,
  locale: Locale,
  id: string,
): void {
  const normalized = seed.distractors.map(normalize);

  if (
    !normalized.length ||
    new Set(normalized).size !== normalized.length ||
    normalized.some((value) => seed.aliases.map(normalize).includes(value))
  ) {
    // Empty pools remain unavailable at runtime; never add another language to fill them.
    if (normalized.length) throw new Error(`Ambiguous localized option bank for ${id}/${locale}.`);
  }
}
