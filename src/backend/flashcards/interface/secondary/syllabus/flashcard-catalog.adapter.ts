import type {
  FlashcardCatalogPort,
  FlashcardCatalog,
} from '@/backend/flashcards/application/ports/flashcard-catalog.port';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';

export class FlashcardCatalogAdapter implements FlashcardCatalogPort {
  constructor(private readonly syllabus: SyllabusCatalogService) {}

  async getPublishedCatalog(): Promise<FlashcardCatalog> {
    const tracks = await this.syllabus.getPublishedTracks();

    return {
      units: tracks
        .flatMap((track) => this.syllabus.publishedUnits(track))
        .map(({ id, slug }) => ({ id, slug })),
      skills: (await this.syllabus.getActivitySkills())
        .filter(({ skill }) => skill.supportsFlashcards)
        .map(({ skill }) => ({ id: skill.id, code: skill.code })),
    };
  }
}
