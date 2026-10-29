import type { FlashcardDeck } from '@/frontend/flashcards/interfaces/entities';
import type {
  CreateFlashcardSessionRequest,
  FlashcardAnswerRequest,
} from '@/frontend/flashcards/interfaces/requests';
import {
  decksResponseSchema,
  sessionResponseSchema,
  answerResponseSchema,
} from '@/frontend/flashcards/interfaces/responses';
import type { IFlashcardService } from '@/frontend/flashcards/services/external/IFlashcardService';
import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import { readHttpResponse } from '@/frontend/shared/adapters/http-client/helpers';
import { ClientException } from '@/frontend/shared/exceptions';

export class FlashcardService implements IFlashcardService {
  constructor(private readonly http: HttpClient) {}

  async getDecks(signal?: AbortSignal) {
    const decks: FlashcardDeck[] = [];
    let total = 0;

    do {
      const response = readHttpResponse(
        await this.http.request({
          method: 'GET',
          path: '/flashcards/decks',
          query: { offset: decks.length, limit: 100 },
          signal,
        }),
        decksResponseSchema,
      );
      total = response.metadata.pagination.totalRecords;

      if (!response.data.flashcardDecks.length && decks.length < total)
        throw new ClientException('contract', 'The deck list could not be read. Please try again.');

      decks.push(...response.data.flashcardDecks);
    } while (decks.length < total);

    return decks;
  }

  async createSession(request: CreateFlashcardSessionRequest, signal?: AbortSignal) {
    const data = readHttpResponse(
      await this.http.request({
        method: 'POST',
        path: '/flashcards/sessions',
        body: request,
        signal,
      }),
      sessionResponseSchema,
    ).data;

    if (
      data.deck.id !== request.deckId ||
      data.sessionConfig.questionScriptMode !== request.questionScriptMode ||
      data.sessionConfig.answerScriptMode !== request.answerScriptMode ||
      data.status !== 'ACTIVE' ||
      !data.currentItem ||
      data.sessionProgress.totalAnswered !== 0 ||
      data.sessionProgress.correctCount !== 0 ||
      data.sessionProgress.incorrectCount !== 0 ||
      data.currentItem.prompt.scriptMode !== request.questionScriptMode ||
      data.currentItem.answerOptions.some(
        (option) => option.scriptMode !== request.answerScriptMode,
      )
    )
      throw new ClientException(
        'contract',
        'The flashcard session could not be read. Please try again.',
      );

    return data;
  }

  async submitAnswer(sessionId: string, request: FlashcardAnswerRequest, signal?: AbortSignal) {
    const data = readHttpResponse(
      await this.http.request({
        method: 'POST',
        path: `/flashcards/sessions/${encodeURIComponent(sessionId)}/answer`,
        body: request,
        signal,
      }),
      answerResponseSchema,
    ).data;

    if (
      data.sessionId !== sessionId ||
      data.itemId !== request.itemId ||
      data.selectedOptionId !== request.selectedOptionId
    )
      throw new ClientException(
        'contract',
        'The answer result could not be read. Retry the same answer.',
      );

    return data;
  }
}
