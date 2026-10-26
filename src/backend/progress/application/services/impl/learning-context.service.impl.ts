import type {
  LearningContext,
  LearningContextService,
} from '@/backend/progress/application/services/learning-context.service';
import type { ProgressRepository } from '@/backend/progress/domain/repositories/progress.repository';

export class LearningContextServiceImpl implements LearningContextService {
  constructor(private readonly repository: ProgressRepository) {}

  async getLearningContext(userId: string): Promise<LearningContext> {
    const state = await this.repository.readState(userId);

    return {
      skills: state.skills.filter((skill) => skill.attemptsWindowSize > 0),
      lessons: state.lessons,
      recentMistakes: state.events
        .filter((event) => !event.isCorrect)
        .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt) || b.id.localeCompare(a.id))
        .slice(0, 20)
        .map(({ skillId, questionType, answeredAt }) => ({ skillId, questionType, answeredAt })),
    };
  }
}
