import type { FlashcardArtifact } from '@/backend/flashcards/application/helpers/flashcard-artifact-schema';

export type { FlashcardArtifact } from '@/backend/flashcards/application/helpers/flashcard-artifact-schema';

export interface CanonicalFlashcardSource {
  readArtifacts(): Promise<FlashcardArtifact[]>;

  readKanjiSkills(): Promise<
    {
      id: string;
      code: string;
      trackSlug: string;
      unitSlug: string;
      lessonSlug: string;
      literal: string;
      meaningsEn: string[];
      onyomi: string[];
      kunyomi: string[];
    }[]
  >;
}
