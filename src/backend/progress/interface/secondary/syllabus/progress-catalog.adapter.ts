import type {
  ProgressCatalogPort,
  ProgressSkillAttribution,
} from '@/backend/progress/application/ports/progress-catalog.port';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';

export class ProgressCatalogAdapter implements ProgressCatalogPort {
  constructor(private readonly syllabus: SyllabusCatalogService) {}

  async getPublishedAttributions(): Promise<ProgressSkillAttribution[]> {
    return (await this.syllabus.getActivitySkills()).map(({ skill, track, unit, lesson }) => ({
      skillId: skill.id,
      skillCode: skill.code,
      skillTitle: skill.title,
      lessonId: lesson?.id ?? null,
      lessonSlug: lesson?.slug ?? null,
      lessonTitle: lesson?.title ?? null,
      unitId: unit?.id ?? null,
      unitSlug: unit?.slug ?? null,
      trackId: track.id,
      trackSlug: track.slug,
      trackTitle: track.title,
      ...(!lesson
        ? { vocabularyItemIds: (skill.content?.vocabularyGroup as { itemIds: string[] }).itemIds }
        : {}),
      postStudyQuestions: (lesson?.postStudyQuestions ?? [])
        .filter((q) => q.isPublished !== false)
        .map(({ id, skillCode, questionType, difficultyLevel }) => ({
          id,
          skillCode,
          questionType,
          difficultyLevel,
        })),
    }));
  }
}
