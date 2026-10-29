import type {
  AssessmentDraft,
  AssessmentProfile,
  OnboardingResult,
  SyllabusTrack,
  UserProfile,
} from '@/frontend/onboarding/interfaces/entities';
import type {
  AssessmentRequest,
  ConfirmAssessmentRequest,
} from '@/frontend/onboarding/interfaces/requests';
import { onboardingSessionFixture } from './session';
import { syllabusTracksFixture } from './syllabus';

export function onboardingTracksFixture(): SyllabusTrack[] {
  return syllabusTracksFixture().map(({ units, ...track }) => {
    void units;
    return track;
  });
}

export function onboardingProfileFixture(): UserProfile {
  const user = onboardingSessionFixture().user!;

  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    onboardingCompleted: false,
    appAccess: 'ONBOARDING_REQUIRED',
    learnerProfile: null,
  };
}

const defaultProfile: AssessmentProfile = {
  currentLevel: 'BEGINNER',
  targetLevel: 'JLPT_N5',
  dailyGoalMinutes: 20,
  preferredScript: 'MIXED',
  weakSkillFocuses: [],
};

export function assessmentDraftFixture(input: Partial<AssessmentRequest> = {}): AssessmentDraft {
  const { note, ...profile } = input;

  return {
    draftProfile: {
      ...defaultProfile,
      ...profile,
      weakSkillFocuses: [...(profile.weakSkillFocuses ?? [])],
    },
    suggestedKnownSkillClaims: note?.trim()
      ? [
          {
            skillCode: 'hiragana_a_row',
            title: 'Hiragana A Row',
            source: 'ai_note',
            confidence: 0.91,
          },
        ]
      : [],
    recommendation: {
      recommendedTrackSlug: 'jlpt-n5-foundation',
      recommendedUnitSlug: 'n5-kana-basics',
      nextLessonSlug: 'hiragana-vowels-and-k-row',
    },
    aiNormalizationUsed: Boolean(note?.trim()),
  };
}

export function onboardingConfirmationFixture(
  input: Partial<ConfirmAssessmentRequest> = {},
): OnboardingResult {
  const { knownSkillClaims, ...profile } = input;

  return {
    userProfile: {
      ...onboardingProfileFixture(),
      onboardingCompleted: true,
      appAccess: 'APP_READY',
      learnerProfile: {
        ...defaultProfile,
        ...profile,
        weakSkillFocuses: [...(profile.weakSkillFocuses ?? [])],
        knownSkillClaims: [...(knownSkillClaims ?? [])],
        onboardingCompletedAt: '2026-10-29T00:00:00Z',
      },
    },
    recommendation: assessmentDraftFixture().recommendation,
  };
}
