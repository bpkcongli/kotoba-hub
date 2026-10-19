import type {
  CanonicalQuestionReadModel,
  PublishedOnboardingTrack,
  SyllabusCatalogService,
  SyllabusLessonReadModel,
  SyllabusUnitReadModel,
} from '@/backend/syllabus/application/services/syllabus-catalog.service';
import type {
  SyllabusCatalogRepository,
  SyllabusLessonSnapshot,
  SyllabusSkillSnapshot,
  SyllabusTrackSnapshot,
  SyllabusUnitSnapshot,
} from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';
import { PostStudyQuestionBank } from '@/backend/syllabus/domain/value-objects/post-study-question-bank';

export class SyllabusCatalogServiceImpl implements SyllabusCatalogService {
  constructor(private readonly repository: SyllabusCatalogRepository) {}

  async getPublishedTracks(): Promise<SyllabusTrackSnapshot[]> {
    return (await this.repository.getTracks())
      .filter((track) => track.isPublished)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getPublishedOnboardingTracks(): Promise<PublishedOnboardingTrack[]> {
    return (await this.getPublishedTracks()).map((track) => ({
      slug: track.slug,
      curriculumLevel: track.curriculumLevel,
      sortOrder: track.sortOrder,
      units: this.publishedUnits(track).map((unit) => ({
        slug: unit.slug,
        sortOrder: unit.sortOrder,
        lessons: this.publishedLessons(unit).map((lesson) => ({
          slug: lesson.slug,
          sortOrder: lesson.sortOrder,
          skillCodes: this.publishedSkills(lesson).map((skill) => skill.code),
        })),
      })),
    }));
  }

  async getPublishedUnit(unitSlug: string): Promise<SyllabusUnitReadModel | null> {
    for (const track of await this.getPublishedTracks()) {
      const unit = this.publishedUnits(track).find((item) => item.slug === unitSlug);
      if (unit) return { track, unit };
    }

    return null;
  }

  async getPublishedLesson(lessonSlug: string): Promise<SyllabusLessonReadModel | null> {
    for (const track of await this.getPublishedTracks()) {
      for (const unit of this.publishedUnits(track)) {
        const lesson = this.publishedLessons(unit).find((item) => item.slug === lessonSlug);
        if (lesson) return { track, unit, lesson };
      }
    }

    return null;
  }

  async getCanonicalPostStudyQuestion(
    lessonSlug: string,
    difficultyLevel: number,
  ): Promise<CanonicalQuestionReadModel | null> {
    const result = await this.getPublishedLesson(lessonSlug);
    if (!result) return null;

    const bank = this.questionBank(result.lesson);
    return { ...result, question: bank.get(difficultyLevel) };
  }

  assertPostStudyBank(lesson: SyllabusLessonSnapshot): void {
    this.questionBank(lesson);
  }

  publishedUnits(track: SyllabusTrackSnapshot): SyllabusUnitSnapshot[] {
    return track.units.filter((unit) => unit.isPublished).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  publishedLessons(unit: SyllabusUnitSnapshot): SyllabusLessonSnapshot[] {
    return unit.lessons
      .filter((lesson) => lesson.isPublished)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  publishedSkills(lesson: SyllabusLessonSnapshot): SyllabusSkillSnapshot[] {
    return lesson.skills
      .filter((skill) => skill.isPublished)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private questionBank(lesson: SyllabusLessonSnapshot): PostStudyQuestionBank {
    return new PostStudyQuestionBank(
      lesson.slug,
      (lesson.postStudyQuestions ?? []).filter((question) => question.isPublished !== false),
      this.publishedSkills(lesson).map((skill) => skill.code),
    );
  }
}
