import type {
  FlashcardCatalogPort,
  FlashcardCatalog,
} from '@/backend/flashcards/application/ports/flashcard-catalog.port';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';

export class FlashcardCatalogAdapter implements FlashcardCatalogPort {
  constructor(private readonly syllabus: SyllabusCatalogService) {}

  async getPublishedCatalog(): Promise<FlashcardCatalog> {
    const tracks = await this.syllabus.getPublishedTracks();
    const units = tracks.flatMap((track) => this.syllabus.publishedUnits(track));

    return {
      units: units.map((unit) => ({ id: unit.id, slug: unit.slug })),
      skills: units.flatMap((unit) =>
        this.syllabus.publishedLessons(unit).flatMap((lesson) =>
          this.syllabus
            .publishedSkills(lesson)
            .filter((skill) => skill.supportsFlashcards)
            .map((skill) => ({ id: skill.id, code: skill.code })),
        ),
      ),
    };
  }
}
