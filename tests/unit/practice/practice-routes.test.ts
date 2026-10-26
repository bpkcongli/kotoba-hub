import { POST as answerLesson } from '@/app/api/v1/practice/lesson-post-study/answer/route';
import { POST as nextLesson } from '@/app/api/v1/practice/lesson-post-study/next/route';
import { POST as answerSession } from '@/app/api/v1/practice/sessions/[sessionId]/answer/route';
import { POST as generateSession } from '@/app/api/v1/practice/sessions/generate/route';
import { anonymousSession } from '@/backend/auth/application/services/session.service';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { PracticeError } from '@/backend/practice/domain/exceptions/practice-error';
import { practiceService } from '@/backend/practice/infrastructure/di';
import { canonicalQuestion, ids, lessonSlug, shortQuestion, skillCode } from './fixtures';

jest.mock('@/backend/auth/infrastructure/di', () => ({
  authorizationService: new (jest.requireActual(
    '@/backend/auth/application/services/impl/authorization.service.impl',
  ).AuthorizationServiceImpl)(),
  getSessionSnapshot: jest.fn(),
}));

jest.mock('@/backend/practice/infrastructure/di', () => ({
  practiceService: {
    generateSession: jest.fn(),
    submitAnswer: jest.fn(),
    nextLessonQuestion: jest.fn(),
    submitLessonAnswer: jest.fn(),
  },
}));

const readySession = {
  isAuthenticated: true,
  sessionId: 'auth-session',
  expiresAt: '2027-01-01T00:00:00Z',
  user: {
    id: ids.user,
    email: 'learner@example.test',
    displayName: 'Learner',
    avatarUrl: null,
    emailVerified: true,
  },
  authorization: { appAccess: 'APP_READY' as const, onboardingCompleted: true },
};
const textAnswer = { rawInputRomaji: 'wa', normalizedKana: 'は' };
const answerBody = { questionId: ids.question, userAnswer: textAnswer, responseTimeMs: 700 };
const endpoints = [
  { name: 'generation', path: 'sessions/generate', invoke: generateSession },
  { name: 'lesson selection', path: 'lesson-post-study/next', invoke: nextLesson },
  { name: 'lesson answer', path: 'lesson-post-study/answer', invoke: answerLesson },
  {
    name: 'session answer',
    path: `sessions/${ids.session}/answer`,
    invoke: (request: Request) =>
      answerSession(request, { params: Promise.resolve({ sessionId: ids.session }) }),
  },
];

function request(path: string, body: unknown = {}, headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/v1/practice/${path}`, {
    method: 'POST',
    headers: { origin: 'http://localhost', 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function expectNoServiceCall() {
  for (const operation of Object.values(practiceService)) expect(operation).not.toHaveBeenCalled();
}

describe('protected practice routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getSessionSnapshot).mockResolvedValue(readySession);
  });

  it.each(endpoints)('requires a valid session for $name', async ({ path, invoke }) => {
    jest.mocked(getSessionSnapshot).mockResolvedValue(anonymousSession);

    const response = await invoke(request(path));

    expect(response.status).toBe(401);
    expect((await response.json()).status.code).toBe(140106001);
    expectNoServiceCall();
  });

  it.each(endpoints)('requires completed onboarding for $name', async ({ path, invoke }) => {
    jest.mocked(getSessionSnapshot).mockResolvedValue({
      ...readySession,
      authorization: { appAccess: 'ONBOARDING_REQUIRED', onboardingCompleted: false },
    });

    const response = await invoke(request(path));

    expect(response.status).toBe(403);
    expect((await response.json()).status.code).toBe(140306001);
    expectNoServiceCall();
  });

  it.each(endpoints)(
    'checks origin before accessing session for $name',
    async ({ path, invoke }) => {
      const response = await invoke(request(path, {}, { origin: 'https://attacker.example' }));

      expect(response.status).toBe(403);
      expect(getSessionSnapshot).not.toHaveBeenCalled();
      expectNoServiceCall();
    },
  );

  it.each(endpoints)('rejects malformed JSON for $name', async ({ path, invoke }) => {
    const response = await invoke(
      new Request(`http://localhost/api/v1/practice/${path}`, {
        method: 'POST',
        headers: { origin: 'http://localhost', 'content-type': 'application/json' },
        body: '{',
      }),
    );

    expect(response.status).toBe(422);
    expect((await response.json()).status.code).toBe(142206001);
    expectNoServiceCall();
  });

  it.each([0, 11, 1.5, '5', null])('rejects invalid questionCount %j', async (questionCount) => {
    const response = await generateSession(request('sessions/generate', { questionCount }));

    expect(response.status).toBe(422);
    expectNoServiceCall();
  });

  it.each([
    { ...answerBody, userId: ids.otherUser },
    { ...answerBody, questionId: 'invalid' },
    { ...answerBody, responseTimeMs: -1 },
    { ...answerBody, responseTimeMs: 1.5 },
    { ...answerBody, userAnswer: { ...textAnswer, isCorrect: true } },
    { ...answerBody, userAnswer: { rawInputRomaji: 'wa' } },
    {
      ...answerBody,
      userAnswer: { selectedOptionId: 'a', normalizedKana: 'は', rawInputRomaji: 'wa' },
    },
    { ...answerBody, userAnswer: { arrangedTokenIds: [] } },
  ])('rejects malformed or owner-forging answer %j', async (body) => {
    const response = await answerSession(request(`sessions/${ids.session}/answer`, body), {
      params: Promise.resolve({ sessionId: ids.session }),
    });

    expect(response.status).toBe(422);
    expectNoServiceCall();
  });

  it('validates the session identifier before invoking the answer service', async () => {
    const response = await answerSession(request('sessions/invalid/answer', answerBody), {
      params: Promise.resolve({ sessionId: 'invalid' }),
    });

    expect(response.status).toBe(422);
    expectNoServiceCall();
  });

  it('rejects an option answer for a direct lesson quiz', async () => {
    const response = await answerLesson(
      request('lesson-post-study/answer', {
        lessonSlug,
        questionId: ids.question,
        userAnswer: { selectedOptionId: 'a' },
      }),
    );

    expect(response.status).toBe(422);
    expectNoServiceCall();
  });

  it('rejects an invalid lesson attempt idempotency header', async () => {
    const response = await answerLesson(
      request(
        'lesson-post-study/answer',
        { ...answerBody, lessonSlug },
        {
          'idempotency-key': 'invalid',
        },
      ),
    );

    expect(response.status).toBe(422);
    expectNoServiceCall();
  });

  it('maps a missing or foreign session to the same documented error', async () => {
    jest
      .mocked(practiceService.submitAnswer)
      .mockRejectedValueOnce(new PracticeError(140406001, 'Practice session not found.'));

    const response = await answerSession(request(`sessions/${ids.session}/answer`, answerBody), {
      params: Promise.resolve({ sessionId: ids.session }),
    });

    expect(response.status).toBe(404);
    expect((await response.json()).status.code).toBe(140406001);
    expect(practiceService.submitAnswer).toHaveBeenCalledWith(ids.user, ids.session, answerBody);
  });

  it('selects a canonical lesson question with the authenticated owner and hides answer fields', async () => {
    const canonical = canonicalQuestion();
    jest.mocked(practiceService.nextLessonQuestion).mockResolvedValue({
      lessonSlug,
      currentUnderstandingLevel: 0,
      targetUnderstandingLevel: 1,
      targetDifficultyLevel: 1,
      isReview: false,
      question: {
        id: canonical.id,
        skillCode,
        questionType: 'SHORT_FREE_RESPONSE',
        gradingStrategy: 'DETERMINISTIC',
        difficultyLevel: 1,
        promptPayload: {
          ...canonical.promptPayload,
          expectedAnswer: canonical.expectedAnswer,
          internalProviderTrace: 'secret',
        },
      },
    });

    const response = await nextLesson(request('lesson-post-study/next', { lessonSlug }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(practiceService.nextLessonQuestion).toHaveBeenCalledWith(ids.user, lessonSlug);
    expect(body.data.question).toMatchObject({
      id: canonical.id,
      difficultyLevel: 1,
      questionType: 'SHORT_FREE_RESPONSE',
    });
    expect(body.data.question).not.toHaveProperty('expectedAnswer');
    expect(body.data.question.promptPayload).not.toHaveProperty('expectedAnswer');
    expect(body.data.question.promptPayload).not.toHaveProperty('internalProviderTrace');
  });

  it('uses the default generation count and omits stored answers, owner and recommendation context', async () => {
    jest.mocked(practiceService.generateSession).mockResolvedValue({
      id: ids.session,
      userId: ids.user,
      status: 'GENERATED',
      difficultyBand: 'STANDARD',
      questionMix: { WEAK: 0.6, REINFORCEMENT: 0.3, STRETCH: 0.1 },
      recommendation: {
        context: {
          targetLevel: 'JLPT_N5',
          currentLevel: 'BEGINNER',
          currentUnitSlug: null,
          catalog: [],
          weakSkillCodes: [],
          masteredSkillCodes: [],
          recentMistakes: [],
          lessonUnderstanding: [],
          allowedQuestionTypes: ['SHORT_FREE_RESPONSE'],
        },
        difficultyBand: 'STANDARD',
        questionMix: { WEAK: 0.6, REINFORCEMENT: 0.3, STRETCH: 0.1 },
      },
      questions: [{ ...shortQuestion, id: ids.question, skillId: ids.skill, sortOrder: 1 }],
      answeredQuestionsCount: 0,
      startedAt: '2026-10-26T00:00:00.000Z',
      completedAt: null,
    });

    const response = await generateSession(request('sessions/generate'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status.code).toBe(120006000);
    expect(practiceService.generateSession).toHaveBeenCalledWith(ids.user, 5);
    expect(body.data).not.toHaveProperty('userId');
    expect(body.data).not.toHaveProperty('recommendation');
    expect(body.data.questions[0]).not.toHaveProperty('skillId');
    expect(body.data.questions[0]).not.toHaveProperty('expectedAnswer');
    expect(body.data.totalQuestions).toBe(1);
  });

  it('accepts an omitted generation request body and defaults to five questions', async () => {
    jest
      .mocked(practiceService.generateSession)
      .mockRejectedValueOnce(new PracticeError(142206001, 'No eligible content.'));

    const response = await generateSession(
      new Request('http://localhost/api/v1/practice/sessions/generate', {
        method: 'POST',
        headers: { origin: 'http://localhost' },
      }),
    );

    expect(response.status).toBe(422);
    expect(practiceService.generateSession).toHaveBeenCalledWith(ids.user, 5);
  });
});
