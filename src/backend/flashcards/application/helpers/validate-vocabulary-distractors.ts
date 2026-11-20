import type { FlashcardSeedItem } from '@/backend/flashcards/application/services/prepare-flashcard-seed.service';
import { normalizeFlashcardText } from '@/backend/flashcards/domain/value-objects/localized-content';

export function validateVocabularyDistractors(
  item: FlashcardSeedItem,
  reviewedPeerIds?: string[],
): void {
  // Earlier revisions remain valid inputs to upgrade/replay verification.
  if (item.itemType !== 'VOCABULARY' || (item.contentRevision ?? 1) < 5) return;

  if (!reviewedPeerIds || new Set(reviewedPeerIds).size < 6)
    throw new Error(`Vocabulary requires six reviewed distractor peers: ${item.id}.`);

  const validate = (
    label: string,
    seed: { canonicalAnswer: string; distractors: string[] },
    answers: string[],
  ) => {
    const accepted = new Set(answers.map(normalizeFlashcardText));
    const distinct = new Set(
      seed.distractors.map(normalizeFlashcardText).filter((value) => value && !accepted.has(value)),
    );

    if (distinct.size < 6)
      throw new Error(`Vocabulary requires six eligible distractors: ${item.id}/${label}.`);
  };

  const canonical = Object.values(item.answerOptionPayload).map((seed) => seed!.canonicalAnswer);

  for (const [mode, seed] of Object.entries(item.answerOptionPayload))
    if (seed) validate(`legacy/${mode}`, seed, canonical);

  for (const [locale, content] of Object.entries(item.localizations ?? {})) {
    if (!content) continue;

    const banks = { ...content.scriptOptions, MEANING: content.meaningOptions };
    const accepted = Object.values(banks).flatMap((seed) => seed?.aliases ?? []);

    for (const [mode, seed] of Object.entries(banks))
      if (seed) validate(`${locale}/${mode}`, seed, accepted);
  }
}
