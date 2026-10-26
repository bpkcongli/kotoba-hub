import type { RecommendationCatalogPort } from '@/backend/personalization/application/ports/recommendation-catalog.port';
import type { RecommendationProfilePort } from '@/backend/personalization/application/ports/recommendation-profile.port';
import type { RecommendationProgressPort } from '@/backend/personalization/application/ports/recommendation-progress.port';
import type {
  PracticeRecommendation,
  RecommendationService,
} from '@/backend/personalization/application/services/recommendation.service';
import { RecommendationUnavailable } from '@/backend/personalization/domain/exceptions/recommendation-unavailable';
import type { AiQuestionType } from '@/backend/shared/application/services/requests/ai-request';

const levels = ['JLPT_N5', 'JLPT_N4', 'JLPT_N3', 'JLPT_N2'];
const focusTerms: Record<string, string[]> = {
  particles: ['particle'],
  kana: ['hiragana', 'katakana', 'kana'],
};

export class RecommendationServiceImpl implements RecommendationService {
  constructor(
    private readonly profiles: RecommendationProfilePort,
    private readonly catalog: RecommendationCatalogPort,
    private readonly progress: RecommendationProgressPort,
  ) {}

  async getRecommendation(userId: string): Promise<PracticeRecommendation> {
    const profile = await this.profiles.getProfile(userId);
    if (profile?.appAccess !== 'APP_READY' || !profile.learnerProfile)
      throw new RecommendationUnavailable();

    const learner = profile.learnerProfile;
    const targetIndex = levels.indexOf(learner.targetLevel);
    if (targetIndex < 0) throw new RecommendationUnavailable();

    const [published, state] = await Promise.all([
      this.catalog.getPracticeSkills(),
      this.progress.getLearningContext(userId),
    ]);
    const mastery = new Map(state.skills.map((skill) => [skill.skillId, skill]));
    const understanding = new Map(
      state.lessons.map((lesson) => [lesson.lessonId, lesson.currentUnderstandingLevel]),
    );
    const known = new Set(learner.knownSkillClaims);
    const focuses = learner.weakSkillFocuses
      .map((focus) => focus.trim().toLowerCase())
      .filter(Boolean)
      .flatMap((focus) => focusTerms[focus] ?? [focus]);
    const currentIndex = levels.indexOf(learner.currentLevel ?? '');

    const priority = (skill: (typeof published)[number]) => {
      const snapshot = mastery.get(skill.skillId);
      if (snapshot?.masteryState === 'WEAK') return 0;

      if (
        focuses.some((focus) =>
          [skill.skillType, skill.skillCode, skill.title].some((value) =>
            value.toLowerCase().includes(focus),
          ),
        )
      )
        return 1;

      if (
        (understanding.get(skill.lessonId) ?? 0) > 0 &&
        (understanding.get(skill.lessonId) ?? 0) < 10
      )
        return 2;

      if (snapshot?.masteryState === 'MASTERED' || known.has(skill.skillCode)) return 5;

      return levels.indexOf(`JLPT_${skill.curriculumLevel}`) < currentIndex ? 4 : 3;
    };

    let candidates = published
      .filter((skill) => {
        const level = levels.indexOf(`JLPT_${skill.curriculumLevel}`);
        return (
          level >= 0 &&
          level <= targetIndex &&
          (skill.supportsObjective || skill.supportsFreeResponse)
        );
      })
      .map((skill, index) => ({ skill, index }))
      .sort((a, b) => priority(a.skill) - priority(b.skill) || a.index - b.index)
      .map(({ skill }) => skill);

    // A shared type list must be valid for every skill sent to the generator.
    if (
      !candidates.every((skill) => skill.supportsObjective) &&
      !candidates.every((skill) => skill.supportsFreeResponse)
    ) {
      const objective = candidates.some((skill) => skill.supportsObjective);
      candidates = candidates.filter((skill) =>
        objective ? skill.supportsObjective : skill.supportsFreeResponse,
      );
    }

    candidates = candidates.slice(0, 40);
    if (!candidates.length) throw new RecommendationUnavailable();

    const allowedQuestionTypes: AiQuestionType[] = candidates.every(
      (skill) => skill.supportsObjective,
    )
      ? ['SHORT_FREE_RESPONSE', 'SLOT_FILL', 'ARRANGE_TOKEN']
      : [];

    if (candidates.every((skill) => skill.supportsFreeResponse))
      allowedQuestionTypes.push('FREE_RESPONSE');

    const byId = new Map(candidates.map((skill) => [skill.skillId, skill]));
    const bands = candidates.flatMap((skill) => {
      const snapshot = mastery.get(skill.skillId);
      return snapshot ? [snapshot.recommendedDifficultyBand] : ['STANDARD' as const];
    });

    return {
      difficultyBand: bands.includes('REMEDIAL')
        ? 'REMEDIAL'
        : bands.every((band) => band === 'STRETCH')
          ? 'STRETCH'
          : 'STANDARD',
      questionMix: { WEAK: 0.6, REINFORCEMENT: 0.3, STRETCH: 0.1 },
      context: {
        targetLevel: learner.targetLevel,
        currentLevel: learner.currentLevel,
        currentUnitSlug: candidates[0].unitSlug,
        catalog: candidates.map(({ skillCode, title, lessonSlug, unitSlug, trackSlug }) => ({
          skillCode,
          title,
          lessonSlug,
          unitSlug,
          trackSlug,
        })),
        weakSkillCodes: candidates
          .filter((skill) => priority(skill) <= 1)
          .map((skill) => skill.skillCode),
        masteredSkillCodes: candidates
          .filter((skill) => mastery.get(skill.skillId)?.masteryState === 'MASTERED')
          .map((skill) => skill.skillCode),
        recentMistakes: state.recentMistakes
          .flatMap((mistake) => {
            const skill = byId.get(mistake.skillId);
            return skill
              ? [
                  {
                    skillCode: skill.skillCode,
                    summary: `Incorrect ${mistake.questionType} answer at ${mistake.answeredAt}.`,
                  },
                ]
              : [];
          })
          .slice(0, 20),
        lessonUnderstanding: [
          ...new Map(
            candidates.map((skill) => [
              skill.lessonSlug,
              {
                lessonSlug: skill.lessonSlug,
                level: understanding.get(skill.lessonId) ?? 0,
              },
            ]),
          ).values(),
        ],
        allowedQuestionTypes,
      },
    };
  }
}
