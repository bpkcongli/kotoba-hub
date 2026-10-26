import type { PlacementNormalizationPort } from '@/backend/personalization/application/ports/placement-normalization.port';
import type { RecommendationCatalogPort } from '@/backend/personalization/application/ports/recommendation-catalog.port';
import type { RecommendationProgressPort } from '@/backend/personalization/application/ports/recommendation-progress.port';
import type { SyllabusCatalogPort } from '@/backend/personalization/application/ports/syllabus-catalog.port';
import type {
  AssessmentInput,
  AssessmentResult,
  AssessmentService,
} from '@/backend/personalization/application/services/assessment.service';
import {
  type InvalidCatalogReference,
  InvalidOnboardingCatalogReference,
} from '@/backend/personalization/domain/exceptions/invalid-onboarding-catalog-reference';
import { placementSchema } from '@/backend/shared/application/helpers/ai-schemas';
import { AiFailure } from '@/backend/shared/domain/exceptions/ai-failure';

export class AssessmentServiceImpl implements AssessmentService {
  constructor(
    private readonly catalog: SyllabusCatalogPort,
    private readonly skills: RecommendationCatalogPort,
    private readonly progress: RecommendationProgressPort,
    private readonly normalizer: PlacementNormalizationPort,
  ) {}

  async assess(input: AssessmentInput): Promise<AssessmentResult> {
    const tracks = [...(await this.catalog.getPublishedOnboardingTracks())].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const levels = tracks.map((track) => `JLPT_${track.curriculumLevel}`);
    const details: InvalidCatalogReference[] = [];

    if (!levels.includes(input.targetLevel)) {
      details.push({
        field: 'targetLevel',
        message: 'Target level is not available in the syllabus catalog.',
      });
    }

    if (
      input.currentLevel !== null &&
      input.currentLevel !== 'BEGINNER' &&
      !levels.includes(input.currentLevel)
    ) {
      details.push({
        field: 'currentLevel',
        message: 'Current level is not available in the syllabus catalog.',
      });
    }

    if (details.length) throw new InvalidOnboardingCatalogReference(details);

    const targetIndex = levels.indexOf(input.targetLevel);
    const currentIndex = levels.indexOf(input.currentLevel ?? '');
    const startIndex = currentIndex < 0 ? 0 : Math.min(currentIndex, targetIndex);
    const candidates = tracks
      .slice(startIndex, targetIndex + 1)
      .flatMap((track) =>
        [...track.units]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .flatMap((unit) =>
            [...unit.lessons]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((lesson) => ({ track, unit, lesson })),
          ),
      );

    if (!candidates.length) throw new Error('No published onboarding lesson is available.');

    const [publishedSkills, baseline] = await Promise.all([
      this.skills.getPracticeSkills(),
      this.progress.getLearningContext(input.userId),
    ]);
    const skillsByCode = new Map(publishedSkills.map((skill) => [skill.skillCode, skill]));
    const mastery = new Map(baseline.skills.map((skill) => [skill.skillId, skill.masteryState]));
    const understanding = new Map(
      baseline.lessons.map((lesson) => [lesson.lessonId, lesson.currentUnderstandingLevel]),
    );
    const next =
      candidates.find(({ lesson }) => {
        const lessonSkills = publishedSkills.filter((skill) => skill.lessonSlug === lesson.slug);
        if (lessonSkills.some((skill) => (understanding.get(skill.lessonId) ?? 0) >= 1))
          return false;

        return (
          lesson.skillCodes.length === 0 ||
          lesson.skillCodes.some((code) => {
            const skill = skillsByCode.get(code);
            return !skill || mastery.get(skill.skillId) !== 'MASTERED';
          })
        );
      }) ?? candidates[0];

    const result: AssessmentResult = {
      draftProfile: {
        currentLevel: input.currentLevel,
        targetLevel: input.targetLevel,
        dailyGoalMinutes: input.dailyGoalMinutes,
        preferredScript: input.preferredScript,
        weakSkillFocuses: [...input.weakSkillFocuses],
      },
      suggestedKnownSkillClaims: [],
      recommendation: {
        recommendedTrackSlug: next.track.slug,
        recommendedUnitSlug: next.unit.slug,
        nextLessonSlug: next.lesson.slug,
      },
      aiNormalizationUsed: false,
    };

    const note = input.note?.trim();
    if (!note) return result;

    const allowedLessons = new Set(
      tracks
        .slice(0, targetIndex + 1)
        .flatMap((track) =>
          track.units.flatMap((unit) => unit.lessons.map((lesson) => lesson.slug)),
        ),
    );
    const aiSkills = [
      ...new Map(
        publishedSkills
          .filter((skill) => allowedLessons.has(skill.lessonSlug))
          .map((skill) => [skill.skillCode, skill]),
      ).values(),
    ];
    const byId = new Map(aiSkills.map((skill) => [skill.skillId, skill]));
    const summary = placementSchema.safeParse(
      await this.normalizer.summarize({
        metadata: {
          requestId: input.requestId,
          userId: input.userId,
          sourceEntityType: 'PERSONALIZATION_ASSESSMENT',
        },
        note,
        context: {
          targetLevel: input.targetLevel,
          currentLevel: input.currentLevel,
          currentUnitSlug: next.unit.slug,
          catalog: aiSkills.map(({ skillCode, title, lessonSlug, unitSlug, trackSlug }) => ({
            skillCode,
            title,
            lessonSlug,
            unitSlug,
            trackSlug,
          })),
          weakSkillCodes: aiSkills
            .filter((skill) => mastery.get(skill.skillId) === 'WEAK')
            .map((skill) => skill.skillCode),
          masteredSkillCodes: aiSkills
            .filter((skill) => mastery.get(skill.skillId) === 'MASTERED')
            .map((skill) => skill.skillCode),
          recentMistakes: baseline.recentMistakes
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
              aiSkills.map((skill) => [
                skill.lessonSlug,
                {
                  lessonSlug: skill.lessonSlug,
                  level: understanding.get(skill.lessonId) ?? 0,
                },
              ]),
            ).values(),
          ],
          allowedQuestionTypes: [],
        },
      }),
    );

    if (!summary.success) throw new AiFailure('INVALID_OUTPUT');

    const canonical = new Map(aiSkills.map((skill) => [skill.skillCode, skill]));
    const claims = summary.data.suggestedKnownSkillClaims;

    if (
      new Set(claims.map((claim) => claim.skillCode)).size !== claims.length ||
      claims.some((claim) => !canonical.has(claim.skillCode))
    )
      throw new AiFailure('INVALID_OUTPUT');

    result.suggestedKnownSkillClaims = claims.map((claim) => ({
      skillCode: claim.skillCode,
      title: canonical.get(claim.skillCode)!.title,
      source: 'ai_note',
      confidence: claim.confidence,
    }));
    result.aiNormalizationUsed = true;

    return result;
  }
}
