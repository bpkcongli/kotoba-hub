import {
  actionBound,
  computed,
  makeObservable,
  observable,
  observableRef,
  runInAction,
} from 'mobx';
import { questionModes, answerModes } from '@/frontend/flashcards/helpers';
import type {
  FlashcardDeck,
  FlashcardSession,
  FlashcardItem,
  FlashcardAnswerResult,
  ScriptMode,
} from '@/frontend/flashcards/interfaces/entities';
import type { FlashcardAnswerRequest } from '@/frontend/flashcards/interfaces/requests';
import type { IFlashcardService } from '@/frontend/flashcards/services/external';
import type { IFlashcardStore } from '@/frontend/flashcards/services/internal/IFlashcardStore';
import { ApiException, ClientException } from '@/frontend/shared/exceptions';
import { presentError } from '@/frontend/shared/helpers';
import type { StoreError } from '@/frontend/shared/interfaces';

export class FlashcardStore implements IFlashcardStore {
  decks: FlashcardDeck[] = [];
  selectedDeckId = '';
  questionScriptMode: ScriptMode = 'KANA';
  answerScriptMode: ScriptMode = 'ROMAJI';
  session: FlashcardSession | null = null;
  currentItem: FlashcardItem | null = null;
  answerResult: FlashcardAnswerResult | null = null;
  selectedOptionId: string | null = null;
  stage: IFlashcardStore['stage'] = 'setup';
  isLoading = false;
  isLoaded = false;
  isStarting = false;
  isSubmitting = false;
  error: StoreError | null = null;
  errorOperation: 'decks' | 'start' | 'answer' | null = null;
  accessIssue: IFlashcardStore['accessIssue'] = null;

  private loadController: AbortController | null = null;
  private writeController: AbortController | null = null;

  private pendingAnswer: FlashcardAnswerRequest | null = null;
  private turnStartedAt = 0;

  constructor(private readonly service: IFlashcardService) {
    makeObservable<this, 'pendingAnswer'>(this, {
      pendingAnswer: observableRef,
      decks: observableRef,
      selectedDeckId: observable,
      questionScriptMode: observable,
      answerScriptMode: observable,
      session: observableRef,
      currentItem: observableRef,
      answerResult: observableRef,
      selectedOptionId: observable,
      stage: observable,
      isLoading: observable,
      isLoaded: observable,
      isStarting: observable,
      isSubmitting: observable,
      error: observableRef,
      errorOperation: observable,
      accessIssue: observable,
      selectedDeck: computed,
      answerLocked: computed,
      loadDecks: actionBound,
      selectDeck: actionBound,
      setQuestionScriptMode: actionBound,
      setAnswerScriptMode: actionBound,
      startSession: actionBound,
      selectOption: actionBound,
      submitAnswer: actionBound,
      continueSession: actionBound,
      resetSession: actionBound,
      dispose: actionBound,
    });
  }

  get selectedDeck() {
    return this.decks.find((deck) => deck.id === this.selectedDeckId) ?? null;
  }

  get answerLocked() {
    return this.pendingAnswer !== null || this.stage !== 'question';
  }

  async loadDecks() {
    this.loadController?.abort();

    const controller = new AbortController();
    this.loadController = controller;
    this.isLoading = true;
    this.errorOperation = null;
    this.error = null;
    this.accessIssue = null;

    try {
      const decks = await this.service.getDecks(controller.signal);

      runInAction(() => {
        if (this.loadController === controller && !controller.signal.aborted) {
          this.decks = decks;
          this.isLoaded = true;

          if (!this.selectedDeck) this.selectDeck(decks[0]?.id ?? '');
        }
      });
    } catch (error) {
      runInAction(() => {
        if (this.loadController === controller && !controller.signal.aborted)
          this.recordError(error, 'decks');
      });
    } finally {
      runInAction(() => {
        if (this.loadController === controller) {
          this.loadController = null;
          this.isLoading = false;
        }
      });
    }
  }

  selectDeck(id: string) {
    if (this.stage !== 'setup' || this.isStarting) return;

    const deck = this.decks.find((deck) => deck.id === id);
    if (!deck) return;

    this.selectedDeckId = id;
    this.questionScriptMode = questionModes(deck.contentType)[0];
    this.answerScriptMode = answerModes(deck.contentType, this.questionScriptMode)[0];
    this.error = null;
  }

  setQuestionScriptMode(mode: ScriptMode) {
    const deck = this.selectedDeck;

    if (
      this.stage !== 'setup' ||
      this.isStarting ||
      !deck ||
      !questionModes(deck.contentType).includes(mode)
    )
      return;

    this.questionScriptMode = mode;

    const options = answerModes(deck.contentType, mode);
    if (!options.includes(this.answerScriptMode)) this.answerScriptMode = options[0];
  }

  setAnswerScriptMode(mode: ScriptMode) {
    const deck = this.selectedDeck;

    if (
      this.stage === 'setup' &&
      !this.isStarting &&
      deck &&
      answerModes(deck.contentType, this.questionScriptMode).includes(mode)
    )
      this.answerScriptMode = mode;
  }

  async startSession() {
    const deck = this.selectedDeck;

    if (this.stage !== 'setup' || this.isStarting || !deck || !deck.itemCount) return;

    const controller = new AbortController();
    this.writeController = controller;
    this.isStarting = true;
    this.errorOperation = null;
    this.error = null;
    this.accessIssue = null;

    try {
      const session = await this.service.createSession(
        {
          deckId: deck.id,
          questionScriptMode: this.questionScriptMode,
          answerScriptMode: this.answerScriptMode,
        },
        controller.signal,
      );

      runInAction(() => {
        if (this.writeController === controller && !controller.signal.aborted) {
          this.session = session;
          this.currentItem = session.currentItem;
          this.stage = 'question';
          this.selectedOptionId = null;
          this.answerResult = null;
          this.pendingAnswer = null;
          this.turnStartedAt = Date.now();
        }
      });
    } catch (error) {
      runInAction(() => {
        if (this.writeController === controller && !controller.signal.aborted)
          this.recordError(error, 'start');
      });
    } finally {
      runInAction(() => {
        if (this.writeController === controller) {
          this.writeController = null;
          this.isStarting = false;
        }
      });
    }
  }

  selectOption(id: string) {
    if (
      this.answerLocked ||
      this.isSubmitting ||
      !this.currentItem?.answerOptions.some((option) => option.id === id)
    )
      return;

    this.selectedOptionId = id;
  }

  async submitAnswer() {
    if (
      this.stage !== 'question' ||
      this.isSubmitting ||
      !this.session ||
      !this.currentItem ||
      !this.selectedOptionId ||
      this.accessIssue
    )
      return;

    // The server may have committed before a response failed; every retry must replay the same timing and choice.
    this.pendingAnswer ??= {
      itemId: this.currentItem.id,
      selectedOptionId: this.selectedOptionId,
      responseTimeMs: Math.min(2147483647, Math.max(0, Date.now() - this.turnStartedAt)),
    };

    const request = this.pendingAnswer;
    const sessionId = this.session.id;
    const controller = new AbortController();
    this.writeController = controller;
    this.isSubmitting = true;
    this.errorOperation = null;
    this.error = null;

    try {
      const result = await this.service.submitAnswer(sessionId, request, controller.signal);

      runInAction(() => {
        if (this.writeController === controller && !controller.signal.aborted && this.session) {
          this.validateAnswerResult(result, request, this.session);

          this.answerResult = result;
          this.session = {
            ...this.session,
            sessionProgress: result.sessionProgress,
            currentItem: result.nextItem,
            status: result.sessionProgress.isCompleted ? 'COMPLETED' : 'ACTIVE',
          };
          this.stage = 'feedback';
        }
      });
    } catch (error) {
      runInAction(() => {
        if (this.writeController === controller && !controller.signal.aborted)
          this.recordError(error, 'answer');
      });
    } finally {
      runInAction(() => {
        if (this.writeController === controller) {
          this.writeController = null;
          this.isSubmitting = false;
        }
      });
    }
  }

  continueSession() {
    if (this.stage !== 'feedback' || !this.answerResult) return;

    if (this.answerResult.sessionProgress.isCompleted) {
      this.stage = 'completed';

      return;
    }

    this.currentItem = this.answerResult.nextItem;
    this.answerResult = null;
    this.selectedOptionId = null;
    this.pendingAnswer = null;
    this.stage = 'question';
    this.error = null;
    this.turnStartedAt = Date.now();
  }

  resetSession() {
    if (this.isSubmitting) return;

    this.writeController?.abort();
    this.writeController = null;
    this.session = null;
    this.currentItem = null;
    this.answerResult = null;
    this.selectedOptionId = null;
    this.pendingAnswer = null;
    this.stage = 'setup';
    this.isStarting = false;
    this.error = null;
    this.accessIssue = null;
  }

  private validateAnswerResult(
    result: FlashcardAnswerResult,
    request: FlashcardAnswerRequest,
    session: FlashcardSession,
  ): void {
    const item = this.currentItem;

    if (
      !item ||
      !this.matchesSubmittedAnswer(result, request, item, session.sessionConfig.answerScriptMode) ||
      !this.matchesExpectedProgress(
        result.sessionProgress,
        session.sessionProgress,
        result.isCorrect,
      ) ||
      !this.matchesNextItem(result.nextItem, item, session.sessionConfig)
    )
      throw new ClientException(
        'contract',
        'The answer result could not be read. Retry the same answer.',
      );
  }

  private matchesSubmittedAnswer(
    result: FlashcardAnswerResult,
    request: FlashcardAnswerRequest,
    item: FlashcardItem,
    answerScriptMode: ScriptMode,
  ): boolean {
    const correctOption = item.answerOptions.find((option) => option.id === result.correctOptionId);

    return (
      correctOption !== undefined &&
      result.isCorrect === (result.correctOptionId === request.selectedOptionId) &&
      result.correctAnswer.value === correctOption.value &&
      result.correctAnswer.scriptMode === answerScriptMode
    );
  }

  private matchesExpectedProgress(
    progress: FlashcardAnswerResult['sessionProgress'],
    previousProgress: FlashcardSession['sessionProgress'],
    isCorrect: boolean,
  ): boolean {
    return (
      progress.totalAnswered === previousProgress.totalAnswered + 1 &&
      progress.totalItems === previousProgress.totalItems &&
      progress.correctCount === previousProgress.correctCount + Number(isCorrect) &&
      progress.incorrectCount === previousProgress.incorrectCount + Number(!isCorrect)
    );
  }

  private matchesNextItem(
    nextItem: FlashcardItem | null,
    currentItem: FlashcardItem,
    sessionConfig: FlashcardSession['sessionConfig'],
  ): boolean {
    return (
      nextItem === null ||
      (nextItem.id !== currentItem.id &&
        nextItem.prompt.scriptMode === sessionConfig.questionScriptMode &&
        nextItem.answerOptions.every(
          (option) => option.scriptMode === sessionConfig.answerScriptMode,
        ))
    );
  }

  private recordError(error: unknown, operation: 'decks' | 'start' | 'answer') {
    this.errorOperation = operation;

    if (error instanceof ClientException && error.kind === 'cancelled') return;

    if (error instanceof ApiException) {
      if (error.failure.httpStatus === 401) this.accessIssue = 'session';
      else if (error.failure.httpStatus === 403 && error.failure.code === 140305001)
        this.accessIssue = 'onboarding';
    }

    this.error = presentError(error);
  }

  dispose() {
    this.loadController?.abort();
    this.writeController?.abort();
    this.loadController = null;
    this.writeController = null;
    this.isLoading = false;
    this.isStarting = false;
    this.isSubmitting = false;
  }
}
