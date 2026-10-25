export interface FlashcardCatalog {
  units: { id: string; slug: string }[];
  skills: { id: string; code: string }[];
}

export interface FlashcardCatalogPort {
  getPublishedCatalog(): Promise<FlashcardCatalog>;
}
