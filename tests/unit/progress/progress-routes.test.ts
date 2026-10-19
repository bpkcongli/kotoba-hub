import { GET as getOverview } from '@/app/api/v1/progress/overview/route';
import { GET as getSessions } from '@/app/api/v1/progress/sessions/route';
import { GET as getTimeline } from '@/app/api/v1/progress/timeline/route';
import { anonymousSession } from '@/backend/auth/application/services/session.service';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { progressService } from '@/backend/progress/infrastructure/di';
import { event } from './fixtures';

jest.mock('@/backend/auth/infrastructure/di', () => ({
  authorizationService: new (jest.requireActual(
    '@/backend/auth/application/services/impl/authorization.service.impl',
  ).AuthorizationServiceImpl)(),
  getSessionSnapshot: jest.fn(),
}));
jest.mock('@/backend/progress/infrastructure/di', () => ({
  progressService: {
    getOverview: jest.fn(),
    getTimeline: jest.fn(),
    getSessions: jest.fn(),
  },
}));

const readySession = {
  isAuthenticated: true,
  sessionId: 'session-id',
  expiresAt: '2027-01-01T00:00:00Z',
  user: {
    id: 'current-user',
    email: 'learner@example.com',
    displayName: 'Learner',
    avatarUrl: null,
    emailVerified: true,
  },
  authorization: { appAccess: 'APP_READY' as const, onboardingCompleted: true },
};

const endpoints = [
  ['overview', getOverview],
  ['timeline', getTimeline],
  ['sessions', getSessions],
] as const;
const request = (path: string) => new Request(`http://localhost/api/v1/progress/${path}`);

describe('protected progress routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getSessionSnapshot).mockResolvedValue(readySession);
  });

  it.each(endpoints)('requires authentication for %s', async (path, get) => {
    jest.mocked(getSessionSnapshot).mockResolvedValue(anonymousSession);

    const response = await get(request(path));

    expect(response.status).toBe(401);
    expect((await response.json()).status.code).toBe(140107001);
    expect(progressService.getOverview).not.toHaveBeenCalled();
    expect(progressService.getTimeline).not.toHaveBeenCalled();
    expect(progressService.getSessions).not.toHaveBeenCalled();
  });

  it.each(endpoints)('requires completed onboarding for %s', async (path, get) => {
    jest.mocked(getSessionSnapshot).mockResolvedValue({
      ...readySession,
      authorization: { appAccess: 'ONBOARDING_REQUIRED', onboardingCompleted: false },
    });

    const response = await get(request(path));

    expect(response.status).toBe(403);
    expect((await response.json()).status.code).toBe(140307001);
    expect(progressService.getOverview).not.toHaveBeenCalled();
    expect(progressService.getTimeline).not.toHaveBeenCalled();
    expect(progressService.getSessions).not.toHaveBeenCalled();
  });

  it.each([
    'timeline?limit=101',
    'timeline?offset=-1',
    'timeline?offset=1.5',
    'timeline?sourceTypes=PRACTICE,UNKNOWN',
    'timeline?sourceTypes=PRACTICE&sourceTypes=FLASHCARD',
    'sessions?limit=0',
    'sessions?sourceTypes=UNKNOWN',
  ])('rejects malformed query %s before reading progress', async (path) => {
    const response = await (path.startsWith('timeline') ? getTimeline : getSessions)(request(path));

    expect(response.status).toBe(422);
    expect((await response.json()).status.code).toBe(142207001);
    expect(progressService.getTimeline).not.toHaveBeenCalled();
    expect(progressService.getSessions).not.toHaveBeenCalled();
  });

  it('uses the session owner, parses filters, and returns contract pagination', async () => {
    jest.mocked(progressService.getTimeline).mockResolvedValue({ items: [], totalRecords: 7 });

    const response = await getTimeline(
      request(
        'timeline?offset=2&limit=2&sourceTypes=FLASHCARD,PRACTICE&skillCodes=kana,particles&trackSlug=jlpt-n5-foundation&userId=another-user',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(progressService.getTimeline).toHaveBeenCalledWith('current-user', {
      offset: 2,
      limit: 2,
      sourceTypes: ['FLASHCARD', 'PRACTICE'],
      skillCodes: ['kana', 'particles'],
      trackSlug: 'jlpt-n5-foundation',
    });
    expect(body.status).toMatchObject({ code: 120007000, errorDetails: [] });
    expect(body.metadata.pagination).toEqual({ pageNumber: 2, pageSize: 2, totalRecords: 7 });
    expect(body.data).toEqual({ progressEvents: [] });
  });

  it('defaults session feed pagination and keeps its envelope distinct from the timeline', async () => {
    jest.mocked(progressService.getSessions).mockResolvedValue({ items: [], totalRecords: 0 });

    const response = await getSessions(request('sessions'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(progressService.getSessions).toHaveBeenCalledWith(
      'current-user',
      expect.objectContaining({ offset: 0, limit: 10 }),
    );
    expect(body.data).toEqual({ progressSessions: [] });
    expect(body.metadata.pagination).toEqual({ pageNumber: 1, pageSize: 10, totalRecords: 0 });
  });

  it('serializes only public timeline fields', async () => {
    jest.mocked(progressService.getTimeline).mockResolvedValue({
      totalRecords: 1,
      items: [
        {
          ...event(),
          skillCode: 'kana',
          skillTitle: 'Kana',
          trackSlug: 'n5',
          unitSlug: 'kana-unit',
          lessonSlug: 'kana-lesson',
        },
      ],
    });

    const response = await getTimeline(request('timeline'));
    const body = await response.json();
    const item = body.data.progressEvents[0];

    expect(response.status).toBe(200);
    expect(item).toMatchObject({
      id: event().id,
      numericScore: 100,
      answeredAt: event().answeredAt,
    });
    expect(item).not.toHaveProperty('userId');
    expect(item).not.toHaveProperty('skillId');
    expect(item).not.toHaveProperty('gradingMetadata');
  });

  it('returns the progress error envelope on an unexpected read failure', async () => {
    jest.mocked(progressService.getOverview).mockRejectedValue(new Error('database unavailable'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await getOverview(request('overview'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.status.code).toBe(150007999);
    expect(JSON.stringify(body)).not.toContain('database unavailable');
  });
});
