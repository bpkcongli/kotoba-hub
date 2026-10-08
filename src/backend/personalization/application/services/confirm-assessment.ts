import {
  type InvalidCatalogReference,
  InvalidOnboardingCatalogReference,
} from '@/backend/personalization/domain/exceptions/invalid-onboarding-catalog-reference';
import type { OnboardingCatalogPort } from '@/backend/syllabus/application/ports/onboarding-catalog.port';
import type {
  LearnerProfilePort,
  UserProfileSnapshot,
} from '@/backend/users/application/ports/learner-profile.port';

export interface ConfirmAssessmentInput {
  userId: string;
  currentLevel: string | null;
  targetLevel: string;
  dailyGoalMinutes: number;
  preferredScript: 'ROMAJI' | 'KANA' | 'MIXED';
  weakSkillFocuses: string[];
  knownSkillClaims: string[];
}

export interface OnboardingRecommendation {
  recommendedTrackSlug: string;
  recommendedUnitSlug: string;
  nextLessonSlug: string;
}

export class ConfirmAssessmentService {
  constructor(
    private readonly catalog: OnboardingCatalogPort,
    private readonly profiles: LearnerProfilePort,
  ) {}

  async confirm(input: ConfirmAssessmentInput) {
    const tracks = this.catalog.getPublishedTracks().sort((a, b) => a.sortOrder - b.sortOrder);
    const levels = new Set(tracks.map((track) => `JLPT_${track.curriculumLevel}`));
    const skillCodes = new Set(
      tracks.flatMap((track) =>
        track.units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.skillCodes)),
      ),
    );

    const details: InvalidCatalogReference[] = [];
    if (!levels.has(input.targetLevel)) {
      details.push({
        field: 'targetLevel',
        message: 'Target level is not available in the syllabus catalog.',
      });
    }

    if (
      input.currentLevel !== null &&
      input.currentLevel !== 'BEGINNER' &&
      !levels.has(input.currentLevel)
    ) {
      details.push({
        field: 'currentLevel',
        message: 'Current level is not available in the syllabus catalog.',
      });
    }

    if (input.knownSkillClaims.some((code) => !skillCodes.has(code))) {
      details.push({
        field: 'knownSkillClaims',
        message: 'One or more known skill claims are not valid skill codes.',
      });
    }

    if (details.length) throw new InvalidOnboardingCatalogReference(details);

    const targetIndex = tracks.findIndex(
      (track) => `JLPT_${track.curriculumLevel}` === input.targetLevel,
    );
    const currentIndex = tracks.findIndex(
      (track) => `JLPT_${track.curriculumLevel}` === input.currentLevel,
    );
    const startIndex = currentIndex < 0 ? 0 : Math.min(currentIndex, targetIndex);
    const known = new Set(input.knownSkillClaims);
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
    const next =
      candidates.find(({ lesson }) => lesson.skillCodes.some((code) => !known.has(code))) ??
      candidates[0];

    if (!next) throw new Error('No published onboarding lesson is available.');

    const recommendation: OnboardingRecommendation = {
      recommendedTrackSlug: next.track.slug,
      recommendedUnitSlug: next.unit.slug,
      nextLessonSlug: next.lesson.slug,
    };
    const userProfile: UserProfileSnapshot = await this.profiles.confirm(input);

    return { userProfile, recommendation };
  }
}
