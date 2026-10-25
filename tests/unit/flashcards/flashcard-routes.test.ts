import { GET as listDecks, POST as createDeck } from '@/app/api/v1/flashcards/decks/route';
import { POST as submitAnswer } from '@/app/api/v1/flashcards/sessions/[sessionId]/answer/route';
import { POST as createSession } from '@/app/api/v1/flashcards/sessions/route';
import { anonymousSession } from '@/backend/auth/application/services/session.service';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { FlashcardError } from '@/backend/flashcards/domain/exceptions/flashcard-error';
import { OptionSnapshotBuilder } from '@/backend/flashcards/domain/services/option-snapshot-builder';
import { flashcardService } from '@/backend/flashcards/infrastructure/di';
import { deck, ids, item } from './fixtures';

jest.mock('@/backend/auth/infrastructure/di', () => ({
  authorizationService: new (jest.requireActual(
    '@/backend/auth/application/services/impl/authorization.service.impl',
  ).AuthorizationServiceImpl)(),
  getSessionSnapshot: jest.fn(),
}));
jest.mock('@/backend/flashcards/infrastructure/di', () => ({
  flashcardService: {
    listDecks: jest.fn(),
    createDeck: jest.fn(),
    createSession: jest.fn(),
    submitAnswer: jest.fn(),
  },
}));

const sessionId = '50000000-0000-4000-8000-000000000001';
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

const endpoints = [
  { name: 'deck list', path: 'decks', method: 'GET', invoke: listDecks },
  { name: 'deck creation', path: 'decks', method: 'POST', invoke: createDeck },
  { name: 'session creation', path: 'sessions', method: 'POST', invoke: createSession },
  {
    name: 'answer submission',
    path: `sessions/${sessionId}/answer`,
    method: 'POST',
    invoke: (request: Request) => submitAnswer(request, { params: Promise.resolve({ sessionId }) }),
  },
];

function request(path: string, method = 'POST', body: unknown = {}, origin = 'http://localhost') {
  return new Request(`http://localhost/api/v1/flashcards/${path}`, {
    method,
    headers: { origin, 'content-type': 'application/json' },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
  });
}

function expectNoServiceCall() {
  expect(flashcardService.listDecks).not.toHaveBeenCalled();
  expect(flashcardService.createDeck).not.toHaveBeenCalled();
  expect(flashcardService.createSession).not.toHaveBeenCalled();
  expect(flashcardService.submitAnswer).not.toHaveBeenCalled();
}

describe('protected flashcard routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getSessionSnapshot).mockResolvedValue(readySession);
  });

  it.each(endpoints)('requires authentication for $name', async ({ path, method, invoke }) => {
    jest.mocked(getSessionSnapshot).mockResolvedValue(anonymousSession);
    const response = await invoke(request(path, method));

    expect(response.status).toBe(401);
    expect((await response.json()).status.code).toBe(140105001);
    expectNoServiceCall();
  });

  it.each(endpoints)(
    'requires completed onboarding for $name',
    async ({ path, method, invoke }) => {
      jest.mocked(getSessionSnapshot).mockResolvedValue({
        ...readySession,
        authorization: { appAccess: 'ONBOARDING_REQUIRED', onboardingCompleted: false },
      });
      const response = await invoke(request(path, method));

      expect(response.status).toBe(403);
      expect((await response.json()).status.code).toBe(140305001);
      expectNoServiceCall();
    },
  );

  it.each(endpoints.filter(({ method }) => method === 'POST'))(
    'checks same origin before $name',
    async ({ path, invoke }) => {
      const response = await invoke(request(path, 'POST', {}, 'https://attacker.example'));

      expect(response.status).toBe(403);
      expect(getSessionSnapshot).not.toHaveBeenCalled();
      expectNoServiceCall();
    },
  );

  it.each(endpoints.filter(({ method }) => method === 'POST'))(
    'returns validation errors for malformed JSON on $name',
    async ({ path, invoke }) => {
      const response = await invoke(
        new Request(`http://localhost/api/v1/flashcards/${path}`, {
          method: 'POST',
          headers: { origin: 'http://localhost', 'content-type': 'application/json' },
          body: '{',
        }),
      );

      expect(response.status).toBe(422);
      expect((await response.json()).status.code).toBe(142205001);
      expectNoServiceCall();
    },
  );

  it.each([
    { itemId: ids.item, selectedOptionId: '' },
    { itemId: ids.item, selectedOptionId: 'opt_1', responseTimeMs: -1 },
    { itemId: ids.item, selectedOptionId: 'opt_1', responseTimeMs: 1.5 },
    { itemId: ids.item, selectedOptionId: 'opt_1', questionScriptMode: 'ENGLISH' },
    { itemId: ids.item, selectedOptionId: 'opt_1', userId: ids.otherUser },
  ])('rejects invalid or session-mutating answer payload %j', async (body) => {
    const response = await submitAnswer(request(`sessions/${sessionId}/answer`, 'POST', body), {
      params: Promise.resolve({ sessionId }),
    });

    expect(response.status).toBe(422);
    expect((await response.json()).status.code).toBe(142205001);
    expect(flashcardService.submitAnswer).not.toHaveBeenCalled();
  });

  it('validates the session path before attempting an answer', async () => {
    const response = await submitAnswer(request('sessions/invalid/answer'), {
      params: Promise.resolve({ sessionId: 'invalid' }),
    });

    expect(response.status).toBe(422);
    expect(flashcardService.submitAnswer).not.toHaveBeenCalled();
  });

  it('uses the authenticated owner and exposes only the current item without its answer key', async () => {
    const turn = new OptionSnapshotBuilder(() => 0).build(item(), 'KANJI', 'ENGLISH');
    jest.mocked(flashcardService.createSession).mockResolvedValue({
      id: sessionId,
      userId: ids.user,
      deck: deck(),
      status: 'ACTIVE',
      questionScriptMode: 'KANJI',
      answerScriptMode: 'ENGLISH',
      turns: [turn, { ...turn, id: ids.nextItem }],
      totalAnswered: 0,
      correctCount: 0,
      incorrectCount: 0,
      startedAt: '2026-10-19T00:00:00.000Z',
      completedAt: null,
    });
    const body = { deckId: ids.deck, questionScriptMode: 'KANJI', answerScriptMode: 'ENGLISH' };
    const response = await createSession(request('sessions', 'POST', body));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(flashcardService.createSession).toHaveBeenCalledWith(ids.user, body);
    expect(result.data.sessionConfig).toEqual({
      questionScriptMode: 'KANJI',
      answerScriptMode: 'ENGLISH',
      isLocked: true,
    });
    expect(Object.keys(result.data.currentItem).sort()).toEqual([
      'answerOptions',
      'id',
      'itemType',
      'prompt',
    ]);
    expect(result.data.currentItem).not.toHaveProperty('correctOptionId');
    expect(result.data).not.toHaveProperty('turns');
    expect(result.data).not.toHaveProperty('userId');
    expect(result.data.deck).not.toHaveProperty('ownerUserId');
  });

  it('returns contract pagination and ignores a query that tries to choose another owner', async () => {
    jest.mocked(flashcardService.listDecks).mockResolvedValue({ items: [], totalRecords: 7 });
    const response = await listDecks(
      request('decks?offset=2&limit=2&deckSource=CUSTOM&userId=other', 'GET'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(flashcardService.listDecks).toHaveBeenCalledWith(
      ids.user,
      expect.objectContaining({ offset: 2, limit: 2, deckSource: 'CUSTOM' }),
    );
    expect(body.metadata.pagination).toEqual({ pageNumber: 2, pageSize: 2, totalRecords: 7 });
    expect(body.data).toEqual({ flashcardDecks: [] });
  });

  it('maps invalid option selection to its documented flashcard error', async () => {
    jest
      .mocked(flashcardService.submitAnswer)
      .mockRejectedValue(new FlashcardError(142205006, 'Invalid option.', 'selectedOptionId'));
    const response = await submitAnswer(
      request(`sessions/${sessionId}/answer`, 'POST', {
        itemId: ids.item,
        selectedOptionId: 'forged',
      }),
      { params: Promise.resolve({ sessionId }) },
    );

    expect(response.status).toBe(422);
    expect((await response.json()).status.code).toBe(142205006);
    expect(flashcardService.submitAnswer).toHaveBeenCalledWith(ids.user, sessionId, {
      itemId: ids.item,
      selectedOptionId: 'forged',
    });
  });
});
