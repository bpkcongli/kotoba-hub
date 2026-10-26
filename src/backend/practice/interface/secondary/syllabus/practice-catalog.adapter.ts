import type {
  PracticeCatalogPort,
  PracticeCatalogSkill,
} from '@/backend/practice/application/ports/practice-catalog.port';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';

export class PracticeCatalogAdapter implements PracticeCatalogPort {
  constructor(private readonly syllabus: SyllabusCatalogService) {}

  async getSkills() {
    const tracks = await this.syllabus.getPublishedTracks();

    return tracks.flatMap((t) =>
      this.syllabus.publishedUnits(t).flatMap((u) =>
        this.syllabus.publishedLessons(u).flatMap((l) =>
          this.syllabus.publishedSkills(l).map((s): PracticeCatalogSkill => ({
            id: s.id,
            code: s.code,
            lessonSlug: l.slug,
            supportsPracticeObjective: s.supportsPracticeObjective,
            supportsPracticeFreeResponse: s.supportsPracticeFreeResponse,
          })),
        ),
      ),
    );
  }

  async getLesson(slug: string) {
    const model = await this.syllabus.getPublishedLesson(slug);

    return model ? { id: model.lesson.id, slug: model.lesson.slug } : null;
  }

  async getQuestion(slug: string, difficulty: number) {
    const model = await this.syllabus.getCanonicalPostStudyQuestion(slug, difficulty);
    if (!model) return null;

    const skill = this.syllabus
      .publishedSkills(model.lesson)
      .find((s) => s.code === model.question.skillCode);
    if (!skill) throw new Error('Canonical question skill is missing.');

    return { ...model.question, skillId: skill.id, lessonId: model.lesson.id };
  }
}
