import type { AuthorizationService } from '@/backend/auth/application/services/authorization.service';
import { authorizationService, getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { requireSameOrigin } from '@/backend/auth/interface/primary/rest/origin';
import type { PracticeService } from '@/backend/practice/application/services/practice.service';
import { PracticeError } from '@/backend/practice/domain/exceptions/practice-error';
import { practiceService } from '@/backend/practice/infrastructure/di';
import {
  generatePracticeSessionRequestSchema,
  practiceSessionPathSchema,
  submitPracticeAnswerRequestSchema,
  lessonPostStudyNextRequestSchema,
  lessonPostStudyAnswerRequestSchema,
  idempotencyKeySchema,
} from '@/backend/practice/interface/primary/rest/dto/practice.request.dto';
import {
  toPracticeSessionDto,
  toPracticeAnswerDto,
  toLessonNextDto,
  toLessonAnswerDto,
} from '@/backend/practice/interface/primary/rest/dto/practice.response.dto';
import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';

export class PracticeController {
  constructor(
    private readonly practice: PracticeService,
    private readonly authorization: AuthorizationService,
  ) {}

  generateSession(request: Request) {
    return this.handle(request, async (userId) => {
      const body = generatePracticeSessionRequestSchema.safeParse(await readBody(request, true));
      if (!body.success) return invalid(body.error.issues);

      return apiResponse(
        ApplicationStatusCode.PRACTICE_SUCCESS,
        toPracticeSessionDto(await this.practice.generateSession(userId, body.data.questionCount)),
      );
    });
  }

  submitAnswer(request: Request, sessionId: string) {
    return this.handle(request, async (userId) => {
      const path = practiceSessionPathSchema.safeParse({ sessionId });
      if (!path.success) return invalid(path.error.issues);

      const body = submitPracticeAnswerRequestSchema.safeParse(await readBody(request));
      if (!body.success) return invalid(body.error.issues);

      return apiResponse(
        ApplicationStatusCode.PRACTICE_SUCCESS,
        toPracticeAnswerDto(
          await this.practice.submitAnswer(userId, path.data.sessionId, body.data),
        ),
      );
    });
  }

  nextLessonQuestion(request: Request) {
    return this.handle(request, async (userId) => {
      const body = lessonPostStudyNextRequestSchema.safeParse(await readBody(request));
      if (!body.success) return invalid(body.error.issues);

      return apiResponse(
        ApplicationStatusCode.PRACTICE_SUCCESS,
        toLessonNextDto(await this.practice.nextLessonQuestion(userId, body.data.lessonSlug)),
      );
    });
  }

  submitLessonAnswer(request: Request) {
    return this.handle(request, async (userId) => {
      const body = lessonPostStudyAnswerRequestSchema.safeParse(await readBody(request));
      if (!body.success) return invalid(body.error.issues);

      const key = request.headers.get('idempotency-key');
      if (key !== null) {
        const parsed = idempotencyKeySchema.safeParse(key);

        if (!parsed.success)
          return invalid([
            { path: ['Idempotency-Key'], message: 'Idempotency-Key must be a UUID.' },
          ]);
      }

      return apiResponse(
        ApplicationStatusCode.PRACTICE_SUCCESS,
        toLessonAnswerDto(
          await this.practice.submitLessonAnswer(userId, {
            ...body.data,
            ...(key ? { idempotencyKey: key } : {}),
          }),
        ),
      );
    });
  }

  private async handle(request: Request, work: (userId: string) => Promise<Response>) {
    const originDenied = requireSameOrigin(request);
    if (originDenied) return originDenied;

    try {
      const session = await getSessionSnapshot(request.headers.get('cookie'));
      const denied = this.authorization.authorize(session, 'APP_READY');

      if (denied || !session.user)
        return apiResponse(
          denied === 'ONBOARDING_REQUIRED'
            ? ApplicationStatusCode.PRACTICE_ONBOARDING_REQUIRED
            : ApplicationStatusCode.PRACTICE_UNAUTHORIZED,
        );

      return await work(session.user.id);
    } catch (error) {
      if (error instanceof PracticeError)
        return apiResponse(error.code as ApplicationStatusCode, undefined, [
          { field: error.field, message: error.message },
        ]);

      console.error('Practice request failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });

      return apiResponse(ApplicationStatusCode.UNHANDLED_PRACTICE_EXCEPTION);
    }
  }
}

async function readBody(request: Request, allowEmpty = false): Promise<unknown> {
  try {
    const text = await request.text();

    if (allowEmpty && text.length === 0) return {};

    return JSON.parse(text);
  } catch {
    throw new PracticeError(142206001, 'Request body must be valid JSON.');
  }
}

function invalid(issues: { path: PropertyKey[]; message: string }[]) {
  return apiResponse(
    ApplicationStatusCode.PRACTICE_VALIDATION_ERROR,
    undefined,
    issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message })),
  );
}

export const practiceController = new PracticeController(practiceService, authorizationService);
