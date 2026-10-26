import type {
  RecommendationCatalogPort,
  RecommendationCatalogSkill,
} from '@/backend/personalization/application/ports/recommendation-catalog.port';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';

export class RecommendationCatalogAdapter implements RecommendationCatalogPort {
  constructor(private readonly syllabus: SyllabusCatalogService) {}

  async getPracticeSkills(): Promise<RecommendationCatalogSkill[]> {
    return (await this.syllabus.getPublishedTracks()).flatMap((track) =>
      this.syllabus.publishedUnits(track).flatMap((unit) =>
        this.syllabus.publishedLessons(unit).flatMap((lesson) =>
          this.syllabus.publishedSkills(lesson).map((skill) => ({
            skillId: skill.id,
            skillCode: skill.code,
            title: skill.title,
            skillType: skill.skillType,
            lessonId: lesson.id,
            lessonSlug: lesson.slug,
            unitSlug: unit.slug,
            trackSlug: track.slug,
            curriculumLevel: track.curriculumLevel,
            supportsObjective: skill.supportsPracticeObjective,
            supportsFreeResponse: skill.supportsPracticeFreeResponse,
          })),
        ),
      ),
    );
  }
}
