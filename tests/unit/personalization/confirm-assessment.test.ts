import type { SyllabusCatalogPort } from '@/backend/personalization/application/ports/syllabus-catalog.port';
import { ConfirmAssessmentServiceImpl } from '@/backend/personalization/application/services/impl/confirm-assessment.service.impl';
import type {
  LearnerProfilePort,
  UserProfileSnapshot,
} from '@/backend/users/application/ports/learner-profile.port';

const input = {
  userId: 'user-id',
  currentLevel: 'JLPT_N5',
  targetLevel: 'JLPT_N4',
  dailyGoalMinutes: 20,
  preferredScript: 'MIXED' as const,
  weakSkillFocuses: ['particles', 'listening'],
  knownSkillClaims: [] as string[],
};

const profile: UserProfileSnapshot = {
  userId: 'user-id',
  email: 'learner@example.com',
  displayName: 'Learner',
  avatarUrl: null,
  onboardingCompleted: true,
  appAccess: 'APP_READY',
  learnerProfile: {
    currentLevel: 'JLPT_N5',
    targetLevel: 'JLPT_N4',
    dailyGoalMinutes: 20,
    preferredScript: 'MIXED',
    weakSkillFocuses: ['particles', 'listening'],
    knownSkillClaims: [],
    onboardingCompletedAt: '2026-10-08T00:00:00.000Z',
  },
};

describe('confirmed onboarding catalog rules', () => {
  const catalog: SyllabusCatalogPort = {
    getPublishedOnboardingTracks: jest.fn(async () => [
      {
        slug: 'jlpt-n5-foundation',
        curriculumLevel: 'N5',
        sortOrder: 1,
        units: [
          {
            slug: 'n5-kana-basics',
            sortOrder: 1,
            lessons: [
              {
                slug: 'hiragana-vowels-and-k-row',
                sortOrder: 1,
                skillCodes: ['hiragana_a_row', 'hiragana_ka_row'],
              },
              {
                slug: 'katakana-vowels-and-k-row',
                sortOrder: 2,
                skillCodes: ['katakana_a_row'],
              },
            ],
          },
        ],
      },
      {
        slug: 'jlpt-n4-expansion',
        curriculumLevel: 'N4',
        sortOrder: 2,
        units: [
          {
            slug: 'n4-grammar-basics',
            sortOrder: 1,
            lessons: [{ slug: 'n4-grammar-intro', sortOrder: 1, skillCodes: ['n4_grammar_intro'] }],
          },
        ],
      },
    ]),
  };
  const profiles: LearnerProfilePort = {
    get: jest.fn(),
    confirm: jest.fn(async () => profile),
  };
  const service = new ConfirmAssessmentServiceImpl(catalog, profiles);

  beforeEach(() => jest.clearAllMocks());

  it('returns a lesson from the published seed and persists the confirmed profile', async () => {
    const result = await service.confirm(input);

    expect(result.recommendation).toEqual({
      recommendedTrackSlug: 'jlpt-n5-foundation',
      recommendedUnitSlug: 'n5-kana-basics',
      nextLessonSlug: 'hiragana-vowels-and-k-row',
    });
    expect(profiles.confirm).toHaveBeenCalledWith(input);
  });

  it('skips lessons whose published skills are all claimed as known', async () => {
    const { recommendation } = await service.confirm({
      ...input,
      knownSkillClaims: ['hiragana_a_row', 'hiragana_ka_row'],
    });

    expect(recommendation.nextLessonSlug).not.toBe('hiragana-vowels-and-k-row');
  });

  it('accepts self-reported weak area labels and rejects unpublished targets or unknown claims', async () => {
    await expect(
      service.confirm({
        ...input,
        targetLevel: 'JLPT_N3',
        weakSkillFocuses: ['particles', 'listening'],
        knownSkillClaims: ['hiragana_basic'],
      }),
    ).rejects.toMatchObject({
      details: [{ field: 'targetLevel' }, { field: 'knownSkillClaims' }],
    });
    expect(profiles.confirm).not.toHaveBeenCalled();
  });
});
