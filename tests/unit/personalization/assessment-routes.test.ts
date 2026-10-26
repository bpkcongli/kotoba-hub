import { POST } from '@/app/api/v1/personalization/assessment/route';
import type { SessionSnapshot } from '@/backend/auth/application/services/session.service';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { InvalidOnboardingCatalogReference } from '@/backend/personalization/domain/exceptions/invalid-onboarding-catalog-reference';
import {
  assessmentService,
  confirmAssessmentService,
} from '@/backend/personalization/infrastructure/di';

jest.mock('@/backend/auth/infrastructure/di', () => ({
  authorizationService: new (jest.requireActual(
    '@/backend/auth/application/services/impl/authorization.service.impl',
  ).AuthorizationServiceImpl)(),
  getSessionSnapshot: jest.fn(),
}));

jest.mock('@/backend/personalization/infrastructure/di', () => ({
  assessmentService: { assess: jest.fn() },
  confirmAssessmentService: { confirm: jest.fn() },
}));

const session: SessionSnapshot = {
  isAuthenticated: true,
  sessionId: 'session-id',
  expiresAt: '2027-01-01T00:00:00Z',
  user: {
    id: 'learner-owner',
    email: 'learner@example.com',
    displayName: 'Learner',
    avatarUrl: null,
    emailVerified: true,
  },
  authorization: { appAccess: 'ONBOARDING_REQUIRED', onboardingCompleted: false },
};

const body = {
  targetLevel: 'JLPT_N5',
  dailyGoalMinutes: 20,
  preferredScript: 'MIXED' as const,
  weakSkillFocuses: ['particles', 'listening'],
};

const draft = {
  draftProfile: { ...body, currentLevel: null },
  suggestedKnownSkillClaims: [
    {
      skillCode: 'hiragana_a_row',
      title: 'Hiragana A Row',
      source: 'ai_note' as const,
      confidence: 0.91,
    },
  ],
  recommendation: {
    recommendedTrackSlug: 'jlpt-n5-foundation',
    recommendedUnitSlug: 'n5-kana',
    nextLessonSlug: 'hiragana',
  },
  aiNormalizationUsed: true,
};

function request(value: unknown, origin: string | null = 'http://localhost:3000') {
  const headers = new Headers({ Cookie: 'authjs.session-token=test' });

  if (origin) headers.set('Origin', origin);

  return new Request('http://localhost:3000/api/v1/personalization/assessment', {
    method: 'POST',
    headers,
    body: JSON.stringify(value),
  });
}

describe('POST personalization assessment', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(getSessionSnapshot).mockResolvedValue(session);
    jest.mocked(assessmentService.assess).mockResolvedValue(draft);
  });

  it.each(['ONBOARDING_REQUIRED', 'APP_READY'] as const)(
    'accepts an authenticated %s user and never confirms the profile',
    async (appAccess) => {
      jest.mocked(getSessionSnapshot).mockResolvedValueOnce({
        ...session,
        authorization: { appAccess, onboardingCompleted: appAccess === 'APP_READY' },
      });

      const response = await POST(request(body));
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.status.code).toBe(120003000);
      expect(result.status.traceId).toBe(
        jest.mocked(assessmentService.assess).mock.calls[0][0].requestId,
      );
      expect(result.data).toEqual(draft);
      expect(assessmentService.assess).toHaveBeenCalledWith(
        expect.objectContaining({
          ...body,
          currentLevel: null,
          userId: 'learner-owner',
          requestId: expect.any(String),
        }),
      );
      expect(getSessionSnapshot).toHaveBeenCalledWith('authjs.session-token=test');
      expect(confirmAssessmentService.confirm).not.toHaveBeenCalled();
    },
  );

  it('rejects an anonymous session before invoking assessment', async () => {
    jest.mocked(getSessionSnapshot).mockResolvedValueOnce({
      isAuthenticated: false,
      sessionId: null,
      expiresAt: null,
      user: null,
      authorization: { appAccess: 'ANONYMOUS', onboardingCompleted: null },
    });

    const response = await POST(request(body));

    expect(response.status).toBe(401);
    expect((await response.json()).status.code).toBe(140103001);
    expect(assessmentService.assess).not.toHaveBeenCalled();
  });

  it.each(['https://evil.test', null])(
    'rejects origin %p before session or AI work',
    async (origin) => {
      const response = await POST(request(body, origin));

      expect(response.status).toBe(403);
      expect(getSessionSnapshot).not.toHaveBeenCalled();
      expect(assessmentService.assess).not.toHaveBeenCalled();
    },
  );

  it.each([
    { ...body, dailyGoalMinutes: '20' },
    { ...body, dailyGoalMinutes: 0 },
    { ...body, dailyGoalMinutes: 1.5 },
    { ...body, preferredScript: 'ANY' },
    { ...body, weakSkillFocuses: undefined },
    { ...body, note: 'a'.repeat(2001) },
    { ...body, knownSkillClaims: ['hiragana_a_row'] },
    { ...body, userId: 'another-user' },
  ])('rejects invalid or extra request fields: %p', async (payload) => {
    const response = await POST(request(payload));
    const result = await response.json();

    expect(response.status).toBe(422);
    expect(result.status.code).toBe(142203001);
    expect(result.status.errorDetails.length).toBeGreaterThan(0);
    expect(assessmentService.assess).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with a body validation detail', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/v1/personalization/assessment', {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000' },
        body: '{',
      }),
    );
    const result = await response.json();

    expect(response.status).toBe(422);
    expect(result.status.code).toBe(142203001);
    expect(result.status.errorDetails[0].field).toBe('body');
    expect(assessmentService.assess).not.toHaveBeenCalled();
  });

  it('distinguishes unpublished catalog references from malformed payloads', async () => {
    jest.mocked(assessmentService.assess).mockRejectedValueOnce(
      new InvalidOnboardingCatalogReference([
        {
          field: 'targetLevel',
          message: 'Target level is not available in the syllabus catalog.',
        },
      ]),
    );

    const response = await POST(request({ ...body, targetLevel: 'JLPT_N3' }));
    const result = await response.json();

    expect(response.status).toBe(422);
    expect(result.status.code).toBe(142203002);
    expect(result.status.traceId).toBe(
      jest.mocked(assessmentService.assess).mock.calls[0][0].requestId,
    );
    expect(result.status.errorDetails[0].field).toBe('targetLevel');
  });

  it('maps only documented response fields and does not expose note or provider metadata', async () => {
    const internal = {
      ...draft,
      note: 'private note',
      provider: 'internal-provider',
      draftProfile: { ...draft.draftProfile, userId: 'learner-owner' },
      suggestedKnownSkillClaims: [
        { ...draft.suggestedKnownSkillClaims[0], providerPayload: 'private' },
      ],
      recommendation: { ...draft.recommendation, skillIds: ['internal-skill'] },
    };
    jest.mocked(assessmentService.assess).mockResolvedValueOnce(internal);

    const response = await POST(request({ ...body, note: 'private note' }));

    expect((await response.json()).data).toEqual(draft);
  });

  it('returns a safe failure envelope for provider or persistence failures', async () => {
    jest
      .mocked(assessmentService.assess)
      .mockRejectedValueOnce(new Error('provider secret and raw note'));

    const response = await POST(request({ ...body, note: 'private note' }));
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.status.code).toBe(150003999);
    expect(result.status.traceId).toBe(
      jest.mocked(assessmentService.assess).mock.calls[0][0].requestId,
    );
    expect(result.data).toBeUndefined();
    expect(JSON.stringify(result)).not.toMatch(/provider secret|private note|raw note/);
    expect(confirmAssessmentService.confirm).not.toHaveBeenCalled();
  });
});
