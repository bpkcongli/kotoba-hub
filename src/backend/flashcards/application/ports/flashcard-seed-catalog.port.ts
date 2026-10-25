export interface FlashcardSeedCatalog {
  tracks: { slug: string; curriculumLevel: string }[];
  units: { id: string; slug: string; trackSlug: string }[];
  skills: {
    id: string;
    code: string;
    lessonSlug: string;
    unitSlug: string;
    trackSlug: string;
    skillType: string;
  }[];
}

export interface FlashcardSeedCatalogPort {
  getPublishedCatalog(): Promise<FlashcardSeedCatalog>;
}
