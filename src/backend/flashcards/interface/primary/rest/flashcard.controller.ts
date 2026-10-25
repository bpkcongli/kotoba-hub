import { randomUUID } from 'node:crypto';
import type { AuthorizationService } from '@/backend/auth/application/services/authorization.service';
import { authorizationService, getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { requireSameOrigin } from '@/backend/auth/interface/primary/rest/origin';
import type { FlashcardService } from '@/backend/flashcards/application/services/flashcard.service';
import { FlashcardError } from '@/backend/flashcards/domain/exceptions/flashcard-error';
import type { ScriptMode } from '@/backend/flashcards/domain/repositories/flashcard.repository';
import { flashcardService } from '@/backend/flashcards/infrastructure/di';
import {
  createFlashcardDeckRequestSchema,
  createFlashcardSessionRequestSchema,
  flashcardSessionPathSchema,
  listFlashcardDecksRequestSchema,
  submitFlashcardAnswerRequestSchema,
} from '@/backend/flashcards/interface/primary/rest/dto/flashcard.request.dto';
import {
  toFlashcardAnswerDto,
  toFlashcardDeckDto,
  toFlashcardSessionDto,
} from '@/backend/flashcards/interface/primary/rest/dto/flashcard.response.dto';
import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { queryValue } from '@/backend/shared/interface/primary/rest/query-value';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';

export class FlashcardController {
  constructor(
    private readonly flashcards: FlashcardService,
    private readonly authorization: AuthorizationService,
  ) {}

  listDecks(request: Request): Promise<Response> {
    return this.handle(request, async (userId) => {
      const url = new URL(request.url);
      const names = ['offset', 'limit', 'deckSource', 'deckTypes', 'unitSlug', 'contentType'];
      const parsed = listFlashcardDecksRequestSchema.safeParse(
        Object.fromEntries(names.map((name) => [name, queryValue(url, name)])),
      );
      if (!parsed.success) return invalid(parsed.error.issues);

      const result = await this.flashcards.listDecks(userId, parsed.data);

      return Response.json({
        status: {
          traceId: randomUUID(),
          code: ApplicationStatusCode.FLASHCARDS_SUCCESS,
          message: 'Success!',
          errorDetails: [],
        },
        metadata: {
          pagination: {
            pageNumber: Math.floor(parsed.data.offset / parsed.data.limit) + 1,
            pageSize: parsed.data.limit,
            totalRecords: result.totalRecords,
          },
        },
        data: { flashcardDecks: result.items.map(toFlashcardDeckDto) },
      });
    });
  }

  createDeck(request: Request): Promise<Response> {
    return this.handle(request, async (userId) => {
      const parsed = createFlashcardDeckRequestSchema.safeParse(await readBody(request));
      if (!parsed.success) return invalid(parsed.error.issues);

      return apiResponse(
        ApplicationStatusCode.FLASHCARDS_SUCCESS,
        toFlashcardDeckDto(await this.flashcards.createDeck(userId, parsed.data)),
      );
    });
  }

  createSession(request: Request): Promise<Response> {
    return this.handle(request, async (userId) => {
      const parsed = createFlashcardSessionRequestSchema.safeParse(await readBody(request));
      if (!parsed.success) return invalid(parsed.error.issues);

      return apiResponse(
        ApplicationStatusCode.FLASHCARDS_SUCCESS,
        toFlashcardSessionDto(
          await this.flashcards.createSession(userId, {
            ...parsed.data,
            questionScriptMode: parsed.data.questionScriptMode as ScriptMode,
            answerScriptMode: parsed.data.answerScriptMode as ScriptMode,
          }),
        ),
      );
    });
  }

  submitAnswer(request: Request, sessionId: string): Promise<Response> {
    return this.handle(request, async (userId) => {
      const path = flashcardSessionPathSchema.safeParse({ sessionId });
      if (!path.success) return invalid(path.error.issues);

      const parsed = submitFlashcardAnswerRequestSchema.safeParse(await readBody(request));
      if (!parsed.success) return invalid(parsed.error.issues);

      return apiResponse(
        ApplicationStatusCode.FLASHCARDS_SUCCESS,
        toFlashcardAnswerDto(
          await this.flashcards.submitAnswer(userId, path.data.sessionId, parsed.data),
        ),
      );
    });
  }

  private async handle(
    request: Request,
    work: (userId: string) => Promise<Response>,
  ): Promise<Response> {
    if (request.method !== 'GET') {
      const denied = requireSameOrigin(request);
      if (denied) return denied;
    }

    try {
      const session = await getSessionSnapshot(request.headers.get('cookie'));
      const denied = this.authorization.authorize(session, 'APP_READY');
      if (denied || !session.user)
        return apiResponse(
          denied === 'ONBOARDING_REQUIRED'
            ? ApplicationStatusCode.FLASHCARDS_ONBOARDING_REQUIRED
            : ApplicationStatusCode.FLASHCARDS_UNAUTHORIZED,
        );

      return await work(session.user.id);
    } catch (error) {
      if (error instanceof FlashcardError)
        return apiResponse(error.code as ApplicationStatusCode, undefined, [
          { field: error.field, message: error.message },
        ]);

      console.error('Flashcard request failed', error);

      return apiResponse(ApplicationStatusCode.UNHANDLED_FLASHCARDS_EXCEPTION);
    }
  }
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new FlashcardError(142205001, 'Request body must be valid JSON.', 'body');
  }
}

function invalid(issues: { path: PropertyKey[]; message: string }[]): Response {
  return apiResponse(
    ApplicationStatusCode.FLASHCARDS_VALIDATION_ERROR,
    undefined,
    issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })),
  );
}

export const flashcardController = new FlashcardController(flashcardService, authorizationService);
