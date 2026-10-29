import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { answerModes, questionModes } from '@/frontend/flashcards/helpers';
import { scriptModeSchema } from '@/frontend/flashcards/interfaces/responses';
import { flashcardDecksFixture } from '@/mocks/fixtures/flashcards';
import { createMockFlashcardSession, answerMockFlashcardSession } from '@/mocks/states/flashcards';
import { getMockSession } from '@/mocks/states/session';

function status(code = 120005000, message = 'Success!') {
  return { traceId: crypto.randomUUID(), code, message, errorDetails: [] };
}

function failure(code: number, message: string, httpStatus = 422) {
  return HttpResponse.json({ status: status(code, message) }, { status: httpStatus });
}

function guard() {
  const session = getMockSession();

  if (!session.isAuthenticated || !session.user)
    return failure(140105001, 'Your session expired. Sign in again to continue.', 401);

  if (session.authorization.appAccess !== 'APP_READY')
    return failure(140305001, 'Finish onboarding before opening flashcards.', 403);

  return null;
}

const createSchema = z
  .object({
    deckId: z.uuid(),
    questionScriptMode: scriptModeSchema,
    answerScriptMode: scriptModeSchema,
  })
  .strict();

const answerSchema = z
  .object({
    itemId: z.uuid(),
    selectedOptionId: z.string().min(1),
    responseTimeMs: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .optional()
      .transform((value) => value ?? null),
  })
  .strict();

const querySchema = z
  .object({
    offset: z.coerce.number().int().nonnegative().default(0),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    deckSource: z.enum(['SYSTEM', 'CUSTOM', 'ALL']).default('ALL'),
    contentType: z.enum(['KANA', 'KANJI', 'VOCABULARY', 'ALL']).default('ALL'),
    deckTypes: z.string().min(1).optional(),
    unitSlug: z.string().min(1).optional(),
  })
  .strict();

export const flashcardHandlers = [
  http.get('*/api/v1/flashcards/decks', ({ request }) => {
    const denied = guard();
    if (denied) return denied;

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return failure(142205001, 'Choose valid deck filters.');

    const query = parsed.data;
    const decks = flashcardDecksFixture().filter(
      (deck) =>
        (query.deckSource === 'ALL' || deck.deckSource === query.deckSource) &&
        (query.contentType === 'ALL' || deck.contentType === query.contentType) &&
        (!query.unitSlug || deck.unitSlug === query.unitSlug) &&
        (!query.deckTypes || query.deckTypes.split(',').includes(deck.deckType)),
    );

    return HttpResponse.json({
      status: status(),
      metadata: {
        pagination: {
          pageNumber: Math.floor(query.offset / query.limit) + 1,
          pageSize: query.limit,
          totalRecords: decks.length,
        },
      },
      data: { flashcardDecks: decks.slice(query.offset, query.offset + query.limit) },
    });
  }),
  http.post('*/api/v1/flashcards/sessions', async ({ request }) => {
    const denied = guard();
    if (denied) return denied;

    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return failure(142205001, 'Choose a deck and script pair.');

    const config = parsed.data;
    const deck = flashcardDecksFixture().find((entry) => entry.id === config.deckId);

    if (!deck) return failure(140405001, 'This deck is unavailable.', 404);

    if (
      !questionModes(deck.contentType).includes(config.questionScriptMode) ||
      !answerModes(deck.contentType, config.questionScriptMode).includes(config.answerScriptMode)
    )
      return failure(142205004, 'Choose a valid script pair for this deck.');

    return HttpResponse.json({
      status: status(),
      data: createMockFlashcardSession(getMockSession().user!.id, config),
    });
  }),
  http.post('*/api/v1/flashcards/sessions/:sessionId/answer', async ({ request, params }) => {
    const denied = guard();
    if (denied) return denied;

    const parsed = answerSchema.safeParse(await request.json().catch(() => null));

    if (
      !parsed.success ||
      typeof params.sessionId !== 'string' ||
      !z.uuid().safeParse(params.sessionId).success
    )
      return failure(142205001, 'Choose an answer for the current card.');

    const answer = answerMockFlashcardSession(
      getMockSession().user!.id,
      params.sessionId,
      parsed.data,
    );

    return 'result' in answer
      ? HttpResponse.json({ status: status(), data: answer.result })
      : failure(answer.code, answer.message, answer.httpStatus);
  }),
];
