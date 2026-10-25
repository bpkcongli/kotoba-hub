import { and, eq, inArray } from 'drizzle-orm';
import type { FlashcardSeedPlan } from '@/backend/flashcards/application/services/prepare-flashcard-seed.service';
import {
  flashcardDeckItems,
  flashcardDecks,
  flashcardItems,
} from '@/backend/flashcards/infrastructure/database/schema';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';

export class DrizzleFlashcardImporter {
  async import(plan: FlashcardSeedPlan): Promise<void> {
    await getDatabase().transaction(async (tx) => {
      const storedDecks = await tx.select().from(flashcardDecks);

      for (const deck of plan.decks) {
        const existing = storedDecks.find((row) => row.id === deck.id || row.slug === deck.slug);
        if (
          existing &&
          (existing.id !== deck.id ||
            existing.deckSource !== 'SYSTEM' ||
            existing.ownerUserId !== null)
        )
          throw new Error(`System flashcard deck identity conflict for ${deck.slug}.`);
      }

      const systemDeckIds = storedDecks
        .filter((deck) => deck.deckSource === 'SYSTEM')
        .map((deck) => deck.id);
      const previousMembers = systemDeckIds.length
        ? await tx
            .select({ itemId: flashcardDeckItems.itemId })
            .from(flashcardDeckItems)
            .where(inArray(flashcardDeckItems.deckId, systemDeckIds))
        : [];

      if (previousMembers.length) {
        await tx
          .update(flashcardItems)
          .set({ isActive: false })
          .where(
            inArray(
              flashcardItems.id,
              previousMembers.map((row) => row.itemId),
            ),
          );
      }

      await tx
        .update(flashcardDecks)
        .set({ isPublished: false })
        .where(eq(flashcardDecks.deckSource, 'SYSTEM'));

      if (systemDeckIds.length)
        await tx
          .delete(flashcardDeckItems)
          .where(inArray(flashcardDeckItems.deckId, systemDeckIds));

      for (const item of plan.items) {
        await tx.insert(flashcardItems).values(item).onDuplicateKeyUpdate({ set: item });
      }

      for (const deck of plan.decks) {
        const values = { ...deck, ownerUserId: null };
        await tx.insert(flashcardDecks).values(values).onDuplicateKeyUpdate({ set: values });
      }

      for (let index = 0; index < plan.deckItems.length; index += 100) {
        await tx.insert(flashcardDeckItems).values(plan.deckItems.slice(index, index + 100));
      }

      const published = await tx
        .select({ id: flashcardDecks.id })
        .from(flashcardDecks)
        .where(and(eq(flashcardDecks.deckSource, 'SYSTEM'), eq(flashcardDecks.isPublished, true)));
      if (published.length !== plan.counts.decks)
        throw new Error('Flashcard import deck count mismatch.');
    });
  }
}
