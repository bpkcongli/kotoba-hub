import type {
  FlashcardSeedCatalog,
  FlashcardSeedCatalogPort,
} from '@/backend/flashcards/application/ports/flashcard-seed-catalog.port';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';

export class FlashcardSeedCatalogAdapter implements FlashcardSeedCatalogPort {
  constructor(private readonly syllabus: SyllabusCatalogService) {}

  async getPublishedCatalog(): Promise<FlashcardSeedCatalog> {
    const result: FlashcardSeedCatalog = { tracks: [], units: [], skills: [] };

    for (const track of await this.syllabus.getPublishedTracks()) {
      if (!['N5', 'N4'].includes(track.curriculumLevel)) continue;

      result.tracks.push({ slug: track.slug, curriculumLevel: track.curriculumLevel });

      for (const unit of this.syllabus.publishedUnits(track)) {
        result.units.push({ id: unit.id, slug: unit.slug, trackSlug: track.slug });

        for (const lesson of this.syllabus.publishedLessons(unit)) {
          for (const skill of this.syllabus.publishedSkills(lesson)) {
            if (!skill.supportsFlashcards) continue;

            result.skills.push({
              id: skill.id,
              code: skill.code,
              lessonSlug: lesson.slug,
              unitSlug: unit.slug,
              trackSlug: track.slug,
              skillType: skill.skillType,
            });
          }
        }
      }
    }

    for (const { skill, track, lesson } of await this.syllabus.getActivitySkills()) {
      if (lesson || !['N5', 'N4'].includes(track.curriculumLevel)) continue;

      result.skills.push({
        id: skill.id,
        code: skill.code,
        lessonSlug: null,
        unitSlug: null,
        trackSlug: track.slug,
        skillType: skill.skillType,
        vocabularyItemIds: (skill.content?.vocabularyGroup as { itemIds: string[] }).itemIds,
        vocabularyPendingSkillCodes: (
          skill.content?.vocabularyGroup as { pendingSkillCodes: Record<string, string> }
        ).pendingSkillCodes,
      });
    }

    return result;
  }
}
