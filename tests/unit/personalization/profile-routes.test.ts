import { POST as confirm } from '@/app/api/v1/personalization/assessment/confirm/route';
import { GET as getProfile } from '@/app/api/v1/user-profile/me/route';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { confirmAssessmentService } from '@/backend/personalization/infrastructure/di';
import { learnerProfileService } from '@/backend/users/infrastructure/di';

jest.mock('@/backend/auth/infrastructure/di', () => ({ getSessionSnapshot: jest.fn() }));
jest.mock('@/backend/personalization/infrastructure/di', () => ({
  confirmAssessmentService: { confirm: jest.fn() },
}));
jest.mock('@/backend/users/infrastructure/di', () => ({
  learnerProfileService: { get: jest.fn() },
}));

const session = {
  isAuthenticated: true,
  sessionId: 'session-id',
  expiresAt: '2027-01-01T00:00:00Z',
  user: {
    id: 'user-id',
    email: 'learner@example.com',
    displayName: 'Learner',
    avatarUrl: null,
    emailVerified: true,
  },
  authorization: { appAccess: 'ONBOARDING_REQUIRED' as const, onboardingCompleted: false },
};

const body = {
  currentLevel: 'JLPT_N5',
  targetLevel: 'JLPT_N4',
  dailyGoalMinutes: 20,
  preferredScript: 'MIXED' as const,
  weakSkillFocuses: ['hiragana_a_row'],
  knownSkillClaims: [],
};

function confirmRequest(value: unknown, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/v1/personalization/assessment/confirm', {
    method: 'POST',
    headers: { Origin: origin, Cookie: 'authjs.session-token=test' },
    body: JSON.stringify(value),
  });
}

describe('profile and confirmation routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getSessionSnapshot).mockResolvedValue(session);
  });

  it('reads an authenticated user without a confirmed learner profile', async () => {
    jest.mocked(learnerProfileService.get).mockResolvedValueOnce({
      userId: 'user-id',
      email: 'learner@example.com',
      displayName: 'Learner',
      avatarUrl: null,
      onboardingCompleted: false,
      appAccess: 'ONBOARDING_REQUIRED',
      learnerProfile: null,
    });
    const response = await getProfile(new Request('http://localhost:3000/api/v1/user-profile/me'));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.status.code).toBe(120002000);
    expect(result.data.learnerProfile).toBeNull();
  });

  it('rejects an unauthenticated confirmation with the personalization code', async () => {
    jest.mocked(getSessionSnapshot).mockResolvedValueOnce({
      isAuthenticated: false,
      sessionId: null,
      expiresAt: null,
      user: null,
      authorization: { appAccess: 'ANONYMOUS', onboardingCompleted: null },
    });
    const response = await confirm(confirmRequest(body));

    expect(response.status).toBe(401);
    expect((await response.json()).status.code).toBe(140103001);
    expect(confirmAssessmentService.confirm).not.toHaveBeenCalled();
  });

  it('validates the full body before calling the use case', async () => {
    const response = await confirm(confirmRequest({ ...body, dailyGoalMinutes: '20' }));
    const result = await response.json();

    expect(response.status).toBe(422);
    expect(result.status.code).toBe(142203001);
    expect(result.status.errorDetails[0].field).toBe('dailyGoalMinutes');
    expect(confirmAssessmentService.confirm).not.toHaveBeenCalled();
  });

  it('rejects cross-origin writes before reading the session', async () => {
    const response = await confirm(confirmRequest(body, 'https://evil.test'));

    expect(response.status).toBe(403);
    expect(getSessionSnapshot).not.toHaveBeenCalled();
  });

  it('rejects a write without Origin before reading the session', async () => {
    const response = await confirm(
      new Request('http://localhost:3000/api/v1/personalization/assessment/confirm', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(403);
    expect(getSessionSnapshot).not.toHaveBeenCalled();
  });

  it('maps the confirmed profile and recommendation to the public envelope', async () => {
    jest.mocked(confirmAssessmentService.confirm).mockResolvedValueOnce({
      userProfile: {
        userId: 'user-id',
        email: 'learner@example.com',
        displayName: 'Learner',
        avatarUrl: null,
        onboardingCompleted: true,
        appAccess: 'APP_READY',
        learnerProfile: { ...body, onboardingCompletedAt: '2026-10-08T00:00:00.000Z' },
      },
      recommendation: {
        recommendedTrackSlug: 'jlpt-n5-foundation',
        recommendedUnitSlug: 'n5-kana-basics',
        nextLessonSlug: 'hiragana-vowels-and-k-row',
      },
    });
    const response = await confirm(confirmRequest(body));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.status.code).toBe(120003000);
    expect(result.data.userProfile.appAccess).toBe('APP_READY');
    expect(result.data.recommendation.nextLessonSlug).toBe('hiragana-vowels-and-k-row');
    expect(confirmAssessmentService.confirm).toHaveBeenCalledWith({ ...body, userId: 'user-id' });
  });
});
