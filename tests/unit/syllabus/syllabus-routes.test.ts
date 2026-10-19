import { GET as getLesson } from '@/app/api/v1/syllabus/lessons/[lessonSlug]/route';
import { GET as listTracks } from '@/app/api/v1/syllabus/route';
import { GET as getUnit } from '@/app/api/v1/syllabus/units/[unitSlug]/route';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';

jest.mock('@/backend/auth/infrastructure/di', () => ({ getSessionSnapshot: jest.fn() }));
jest.mock('@/backend/syllabus/infrastructure/di', () => {
  const { SyllabusCatalogServiceImpl } = jest.requireActual(
    '@/backend/syllabus/application/services/impl/syllabus-catalog.service.impl',
  );
  const { PrepareSyllabusSeedServiceImpl } = jest.requireActual(
    '@/backend/syllabus/application/services/impl/prepare-syllabus-seed.service.impl',
  );
  const { SeedSyllabusCatalogRepository } = jest.requireActual(
    '@/backend/syllabus/interface/secondary/seed/seed-syllabus-catalog.repository',
  );
  const plan = new PrepareSyllabusSeedServiceImpl(new SeedSyllabusCatalogRepository()).prepare();
  return {
    syllabusCatalogService: new SyllabusCatalogServiceImpl({
      getTracks: async () => (await plan).tracks,
    }),
  };
});

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
  authorization: { appAccess: 'APP_READY' as const, onboardingCompleted: true },
};

const root = 'http://localhost:3000/api/v1/syllabus';

describe('syllabus routes', () => {
  beforeEach(() => {
    jest.mocked(getSessionSnapshot).mockResolvedValue(session);
  });

  it('allows track listing during onboarding and paginates published tracks', async () => {
    jest.mocked(getSessionSnapshot).mockResolvedValueOnce({
      ...session,
      authorization: { appAccess: 'ONBOARDING_REQUIRED', onboardingCompleted: false },
    });

    const response = await listTracks(new Request(`${root}?offset=0&limit=1`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(
      body.data.tracks.map((track: { curriculumLevel: string }) => track.curriculumLevel),
    ).toEqual(['N5']);
    expect(body.metadata.pagination).toEqual({ pageNumber: 1, pageSize: 1, totalRecords: 1 });
  });

  it('rejects unpublished level filters and malformed query values', async () => {
    const unpublished = await listTracks(new Request(`${root}?curriculumLevels=N3`));

    expect(unpublished.status).toBe(422);
    expect((await unpublished.json()).status.errorDetails[0].field).toBe('curriculumLevels');

    const malformed = await listTracks(new Request(`${root}?limit=101`));

    expect(malformed.status).toBe(422);
  });

  it('requires completed onboarding for unit and lesson detail', async () => {
    jest.mocked(getSessionSnapshot).mockResolvedValue({
      ...session,
      authorization: { appAccess: 'ONBOARDING_REQUIRED', onboardingCompleted: false },
    });

    const unit = await getUnit(new Request(`${root}/units/n5-kana-basics`), {
      params: Promise.resolve({ unitSlug: 'n5-kana-basics' }),
    });
    const lesson = await getLesson(
      new Request(`${root}/lessons/copula-affirmative-and-questions`),
      { params: Promise.resolve({ lessonSlug: 'copula-affirmative-and-questions' }) },
    );

    expect(unit.status).toBe(403);
    expect(lesson.status).toBe(403);
  });

  it('returns canonical quiz metadata only for a validated lesson bank', async () => {
    const response = await getLesson(
      new Request(`${root}/lessons/copula-affirmative-and-questions?includeContentBlocks=false`),
      { params: Promise.resolve({ lessonSlug: 'copula-affirmative-and-questions' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.contentBlocks).toEqual([]);
    expect(body.data.postStudyQuiz.bankQuestionCount).toBe(10);
    expect(body.data).not.toHaveProperty('postStudyQuestions');
  });
});
