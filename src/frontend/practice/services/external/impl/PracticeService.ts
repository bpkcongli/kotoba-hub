import type {
  GeneratePracticeRequest,
  PracticeAnswerRequest,
  LessonAnswerRequest,
} from '@/frontend/practice/interfaces/requests';
import {
  practiceSessionResponseSchema,
  practiceAnswerResponseSchema,
  lessonQuestionResponseSchema,
  lessonAnswerResponseSchema,
} from '@/frontend/practice/interfaces/responses';
import type { IPracticeService } from '@/frontend/practice/services/external/IPracticeService';
import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import { readHttpResponse } from '@/frontend/shared/adapters/http-client/helpers';
import { ClientException } from '@/frontend/shared/exceptions';

export class PracticeService implements IPracticeService {
  constructor(private readonly http: HttpClient) {}

  async generateSession(request: GeneratePracticeRequest, signal?: AbortSignal) {
    const data = readHttpResponse(
      await this.http.request({
        method: 'POST',
        path: '/practice/sessions/generate',
        body: request,
        signal,
      }),
      practiceSessionResponseSchema,
    ).data;

    if (
      data.totalQuestions !== request.questionCount ||
      data.answeredQuestionsCount !== 0 ||
      data.status !== 'GENERATED'
    )
      throw new ClientException(
        'contract',
        'The practice session could not be read. Please try again.',
      );

    return { ...data, questions: [...data.questions].sort((a, b) => a.sortOrder - b.sortOrder) };
  }

  async submitAnswer(sessionId: string, request: PracticeAnswerRequest, signal?: AbortSignal) {
    const data = readHttpResponse(
      await this.http.request({
        method: 'POST',
        path: `/practice/sessions/${encodeURIComponent(sessionId)}/answer`,
        body: request,
        signal,
      }),
      practiceAnswerResponseSchema,
    ).data;

    if (data.sessionId !== sessionId || data.questionId !== request.questionId)
      throw new ClientException(
        'contract',
        'The answer result could not be read. Retry the same answer.',
      );

    return data;
  }

  async getLessonQuestion(lessonSlug: string, signal?: AbortSignal) {
    const data = readHttpResponse(
      await this.http.request({
        method: 'POST',
        path: '/practice/lesson-post-study/next',
        body: { lessonSlug },
        signal,
      }),
      lessonQuestionResponseSchema,
    ).data;

    if (
      data.lessonSlug !== lessonSlug ||
      data.targetDifficultyLevel !== data.question.difficultyLevel
    )
      throw new ClientException(
        'contract',
        'The lesson question could not be read. Please try again.',
      );

    return data;
  }

  async submitLessonAnswer(
    request: LessonAnswerRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ) {
    const data = readHttpResponse(
      await this.http.request({
        method: 'POST',
        path: '/practice/lesson-post-study/answer',
        body: request,
        headers: { 'Idempotency-Key': idempotencyKey },
        signal,
      }),
      lessonAnswerResponseSchema,
    ).data;

    if (data.lessonSlug !== request.lessonSlug || data.questionId !== request.questionId)
      throw new ClientException(
        'contract',
        'The answer result could not be read. Retry the same answer.',
      );

    return data;
  }
}
