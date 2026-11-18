import type { FlashcardSeedPlan } from '@/backend/flashcards/application/services/prepare-flashcard-seed.service';
import {
  deckTranslationSchema,
  itemTranslationSchema,
} from '@/backend/flashcards/domain/value-objects/localized-content';
import type {
  DeckLocalizations,
  ItemLocalizations,
} from '@/backend/flashcards/domain/value-objects/localized-content';

interface VersionedContent {
  id: string;
  contentRevision?: number;
  localizations?: DeckLocalizations | ItemLocalizations | null;
}

export function validateFlashcardSeedPlan(plan: FlashcardSeedPlan): void {
  if (
    new Set(plan.items.map((item) => item.id)).size !== plan.items.length ||
    new Set(plan.decks.map((deck) => deck.id)).size !== plan.decks.length
  )
    throw new Error('Duplicate flashcard seed identity.');

  for (const item of plan.items) {
    for (const content of Object.values(item.localizations ?? {})) {
      for (const [mode, bank] of Object.entries(content.scriptOptions ?? {})) {
        if (bank.canonicalAnswer !== item.answerOptionPayload[mode as 'KANA']?.canonicalAnswer)
          throw new Error(`Localized flashcard changed Japanese script: ${item.id}.`);
      }
    }
  }

  for (const [owners, schema] of [
    [plan.items, itemTranslationSchema],
    [plan.decks, deckTranslationSchema],
  ] as const) {
    for (const owner of owners) {
      if (
        !Number.isInteger(owner.contentRevision) ||
        owner.contentRevision! < 1 ||
        !owner.localizations?.en
      )
        throw new Error(`Missing audited English flashcard content: ${owner.id}.`);

      for (const [locale, value] of Object.entries(owner.localizations)) {
        if (
          !['en', 'id'].includes(locale) ||
          !schema.safeParse(value).success ||
          value.sourceRevision !== owner.contentRevision
        )
          throw new Error(`Invalid flashcard translation: ${owner.id}/${locale}.`);
      }

      if (!owner.localizations.en.isPublished)
        throw new Error(`English flashcard translation is unpublished: ${owner.id}.`);
    }
  }
}

export function assertFlashcardRevision(
  stored: VersionedContent & Record<string, unknown>,
  incoming: VersionedContent & Record<string, unknown>,
  fields: string[],
): void {
  if (!stored.localizations) return;

  if (!incoming.localizations || incoming.contentRevision! < stored.contentRevision!)
    throw new Error(`Flashcard revision moved backwards: ${incoming.id}.`);

  const content = (owner: Record<string, unknown>) =>
    Object.fromEntries(fields.map((field) => [field, owner[field]]));

  if (
    incoming.contentRevision === stored.contentRevision &&
    !sameJson(content(stored), content(incoming))
  )
    throw new Error(`Flashcard content changed without a new revision: ${incoming.id}.`);

  for (const locale of ['en', 'id'] as const) {
    const previous = stored.localizations[locale];
    const next = incoming.localizations[locale];

    if (!previous) continue;

    if (!next || next.translationRevision < previous.translationRevision)
      throw new Error(`Flashcard translation revision moved backwards: ${incoming.id}/${locale}.`);

    const payload = (value: typeof previous) => {
      return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'isPublished'));
    };

    if (
      next.translationRevision === previous.translationRevision &&
      !sameJson(payload(previous), payload(next))
    )
      throw new Error(
        `Flashcard translation changed without a new revision: ${incoming.id}/${locale}.`,
      );
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  const canonical = (value: unknown) =>
    JSON.stringify(value, (_key, entry: unknown) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry))
        return Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)));

      return entry;
    });

  return canonical(left) === canonical(right);
}
