import type {
  ProgressCatalogPort,
  ProgressSkillAttribution,
} from '@/backend/progress/application/ports/progress-catalog.port';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';

export class ProgressCatalogAdapter implements ProgressCatalogPort {
  constructor(private readonly syllabus: SyllabusCatalogService) {}

  async getPublishedAttributions(): Promise<ProgressSkillAttribution[]> {
    return (await this.syllabus.getPublishedTracks()).flatMap((track) =>
      this.syllabus.publishedUnits(track).flatMap((unit) =>
        this.syllabus.publishedLessons(unit).flatMap((lesson) =>
          this.syllabus.publishedSkills(lesson).map((skill) => ({
            skillId: skill.id,
            skillCode: skill.code,
            skillTitle: skill.title,
            lessonId: lesson.id,
            lessonSlug: lesson.slug,
            lessonTitle: lesson.title,
            unitId: unit.id,
            unitSlug: unit.slug,
            trackId: track.id,
            trackSlug: track.slug,
            trackTitle: track.title,
            postStudyQuestions: (lesson.postStudyQuestions ?? [])
              .filter((question) => question.isPublished !== false)
              .map(({ id, skillCode, questionType, difficultyLevel }) => ({
                id,
                skillCode,
                questionType,
                difficultyLevel,
              })),
          })),
        ),
      ),
    );
  }
}
