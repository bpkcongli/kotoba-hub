import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import {
  answerMockLessonQuiz,
  answerMockPracticeSession,
  createMockPracticeSession,
  nextMockLessonQuiz,
} from '@/mocks/states/practice';
import { getMockSession } from '@/mocks/states/session';

function status(code = 120006000, message = 'Success!') {
  return { traceId: crypto.randomUUID(), code, message, errorDetails: [] };
}

function failure(code: number, message: string, httpStatus = 422) {
  return HttpResponse.json({ status: status(code, message) }, { status: httpStatus });
}

function guard() {
  const session = getMockSession();

  if (!session.isAuthenticated || !session.user)
    return failure(140106001, 'Your session expired. Sign in again to continue.', 401);

  if (session.authorization.appAccess !== 'APP_READY')
    return failure(140306001, 'Finish onboarding before starting practice.', 403);

  return null;
}

const text = z.string().min(1).max(2000);

const textAnswer = z.strictObject({
  rawInputRomaji: z.string().max(2000),
  normalizedKana: text,
  normalizedKanji: text.optional(),
});

const userAnswer = z.union([
  textAnswer,
  z.strictObject({ selectedOptionId: z.string().min(1).max(100) }),
  z.strictObject({ arrangedTokenIds: z.array(z.string().min(1).max(100)).min(1).max(30) }),
]);

const answerSchema = z.strictObject({
  questionId: z.uuid(),
  userAnswer,
  responseTimeMs: z.number().int().min(0).max(2147483647),
});

const lessonAnswerSchema = answerSchema.extend({
  lessonSlug: z.string().min(1).max(255),
  userAnswer: textAnswer,
});

function result<T>(value: { result: T } | { code: number; message: string; httpStatus: number }) {
  return 'result' in value
    ? HttpResponse.json({ status: status(), data: value.result })
    : failure(value.code, value.message, value.httpStatus);
}

export const practiceHandlers = [
  http.post('*/api/v1/practice/sessions/generate', async ({ request }) => {
    const denied = guard();
    if (denied) return denied;

    const raw = await request.text();
    let body: unknown;

    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return failure(142206001, 'Choose a valid question count.');
    }

    const parsed = z
      .strictObject({ questionCount: z.number().int().min(1).max(10).default(5) })
      .safeParse(body);

    return parsed.success
      ? HttpResponse.json({
          status: status(),
          data: createMockPracticeSession(getMockSession().user!.id, parsed.data),
        })
      : failure(142206001, 'Choose 1 to 10 questions.');
  }),

  http.post('*/api/v1/practice/sessions/:sessionId/answer', async ({ request, params }) => {
    const denied = guard();
    if (denied) return denied;

    const parsed = answerSchema.safeParse(await request.json().catch(() => null));

    if (
      !parsed.success ||
      typeof params.sessionId !== 'string' ||
      !z.uuid().safeParse(params.sessionId).success
    )
      return failure(142206001, 'Answer the current question.');

    return result(
      answerMockPracticeSession(getMockSession().user!.id, params.sessionId, parsed.data),
    );
  }),

  http.post('*/api/v1/practice/lesson-post-study/next', async ({ request }) => {
    const denied = guard();
    if (denied) return denied;

    const parsed = z
      .strictObject({ lessonSlug: z.string().min(1).max(255) })
      .safeParse(await request.json().catch(() => null));

    return parsed.success
      ? result(nextMockLessonQuiz(getMockSession().user!.id, parsed.data.lessonSlug))
      : failure(142206001, 'Choose a lesson.');
  }),

  http.post('*/api/v1/practice/lesson-post-study/answer', async ({ request }) => {
    const denied = guard();
    if (denied) return denied;

    const parsed = lessonAnswerSchema.safeParse(await request.json().catch(() => null));
    const key = request.headers.get('Idempotency-Key');

    if (!parsed.success || (key !== null && !z.uuid().safeParse(key).success))
      return failure(142206001, 'Answer the current lesson question.');

    return result(answerMockLessonQuiz(getMockSession().user!.id, parsed.data, key ?? undefined));
  }),
];
