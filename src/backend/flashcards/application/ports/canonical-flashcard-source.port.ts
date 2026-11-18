import type { FlashcardArtifact } from '@/backend/flashcards/application/helpers/flashcard-artifact-schema';

export type { FlashcardArtifact } from '@/backend/flashcards/application/helpers/flashcard-artifact-schema';

export interface FlashcardLocalizationOverlay {
  schemaVersion: '2.0.0';
  contentRevision: number;
  translationRevision?: number;
  sourceRefs: string[];
  items: Record<string, { surfaceFormText: string; en: string; id: string }>;
  decks: Record<string, { en: string; id: string }>;
  unitTitles: Record<string, string>;
}

export interface CanonicalFlashcardSource {
  readLocalizationOverlay?(): Promise<FlashcardLocalizationOverlay>;

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
