import type { FlashcardService } from '@/backend/flashcards/application/services/flashcard.service';
import { FlashcardServiceImpl } from '@/backend/flashcards/application/services/impl/flashcard.service.impl';
import { PrepareFlashcardSeedServiceImpl } from '@/backend/flashcards/application/services/impl/prepare-flashcard-seed.service.impl';
import type { PrepareFlashcardSeedService } from '@/backend/flashcards/application/services/prepare-flashcard-seed.service';
import { flashcardRepository } from '@/backend/flashcards/interface/secondary/persistence/drizzle-flashcard.repository';
import { FlashcardProgressAdapter } from '@/backend/flashcards/interface/secondary/progress/flashcard-progress.adapter';
import { FileCanonicalFlashcardSource } from '@/backend/flashcards/interface/secondary/seed/canonical-flashcard-source';
import { FlashcardCatalogAdapter } from '@/backend/flashcards/interface/secondary/syllabus/flashcard-catalog.adapter';
import { FlashcardSeedCatalogAdapter } from '@/backend/flashcards/interface/secondary/syllabus/flashcard-seed-catalog.adapter';
import { progressService } from '@/backend/progress/infrastructure/di';
import { syllabusCatalogService } from '@/backend/syllabus/infrastructure/di';

export const flashcardService: FlashcardService = new FlashcardServiceImpl(
  flashcardRepository,
  new FlashcardCatalogAdapter(syllabusCatalogService),
  new FlashcardProgressAdapter(progressService),
);

export const prepareFlashcardSeedService: PrepareFlashcardSeedService =
  new PrepareFlashcardSeedServiceImpl(
    new FlashcardSeedCatalogAdapter(syllabusCatalogService),
    new FileCanonicalFlashcardSource(),
  );
