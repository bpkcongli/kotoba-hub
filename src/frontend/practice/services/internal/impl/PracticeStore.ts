import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import { toKana } from 'wanakana';
import type {
  PracticeSession,
  PracticeQuestion,
  PracticeAnswerResult,
  LessonQuiz,
  LessonQuizResult,
} from '@/frontend/practice/interfaces/entities';
import type {
  PracticeAnswerRequest,
  LessonAnswerRequest,
  PracticeUserAnswer,
} from '@/frontend/practice/interfaces/requests';
import type { IPracticeService } from '@/frontend/practice/services/external';
import type { IPracticeStore } from '@/frontend/practice/services/internal/IPracticeStore';
import { ApiException, ClientException } from '@/frontend/shared/exceptions';
import { presentError } from '@/frontend/shared/helpers';
import type { StoreError } from '@/frontend/shared/interfaces';

export class PracticeStore implements IPracticeStore {
  questionCount = 5;
  session: PracticeSession | null = null;
  results: PracticeAnswerResult[] = [];
  answerResult: PracticeAnswerResult | null = null;
  lessonQuiz: LessonQuiz | null = null;
  lessonResult: LessonQuizResult | null = null;
  lessonSlug: string | null = null;
  mode: IPracticeStore['mode'] = 'random';
  stage: IPracticeStore['stage'] = 'setup';
  isLoading = false;
  isGenerating = false;
  isSubmitting = false;
  error: StoreError | null = null;
  accessIssue: IPracticeStore['accessIssue'] = null;
  textInput = '';
  japaneseAnswer = '';
  selectedOptionId: string | null = null;
  arrangedTokenIds: string[] = [];

  private currentIndex = 0;
  private controller: AbortController | null = null;
  private turnStartedAt = 0;

  private pending: {
    request: PracticeAnswerRequest;
    lessonRequest?: LessonAnswerRequest;
    key?: string;
  } | null = null;

  constructor(private readonly service: IPracticeService) {
    makeAutoObservable<this, 'service' | 'controller' | 'pending' | 'turnStartedAt'>(
      this,
      {
        service: false,
        controller: false,
        turnStartedAt: false,
        pending: observableRef,
        session: observableRef,
        results: observableRef,
        answerResult: observableRef,
        lessonQuiz: observableRef,
        lessonResult: observableRef,
      },
      { autoBind: true },
    );
  }

  get currentQuestion(): PracticeQuestion | LessonQuiz['question'] | null {
    return this.mode === 'lesson'
      ? (this.lessonQuiz?.question ?? null)
      : (this.session?.questions[this.currentIndex] ?? null);
  }

  get answerLocked() {
    return !!this.pending || this.stage !== 'question';
  }

  get canSubmit() {
    if (this.isSubmitting || this.accessIssue || this.stage !== 'question') return false;

    if (this.pending) return true;

    const q = this.currentQuestion;

    if (!q) return false;

    if (q.questionType === 'SLOT_FILL') return !!this.selectedOptionId;

    if (q.questionType === 'ARRANGE_TOKEN')
      return this.arrangedTokenIds.length === q.promptPayload.arrangeTokens.length;

    return (
      !!this.japaneseAnswer.trim() &&
      this.japaneseAnswer.length <= 2000 &&
      !/[a-z]/i.test(this.japaneseAnswer)
    );
  }

  setQuestionCount(value: number) {
    if (!this.isGenerating && Number.isInteger(value) && value >= 1 && value <= 10)
      this.questionCount = value;
  }

  async generateSession() {
    if (this.isGenerating || this.isSubmitting) return null;

    this.controller?.abort();

    const controller = new AbortController();

    this.controller = controller;
    this.isGenerating = true;
    this.isLoading = false;
    this.error = null;
    this.accessIssue = null;

    try {
      const session = await this.service.generateSession(
        { questionCount: this.questionCount },
        controller.signal,
      );

      return runInAction(() => {
        if (this.isCurrent(controller)) {
          this.session = session;
          this.mode = 'random';

          this.lessonSlug = null;
          this.lessonQuiz = null;
          this.lessonResult = null;

          this.currentIndex = 0;
          this.results = [];
          this.beginQuestion();

          return session;
        }

        return null;
      });
    } catch (error) {
      runInAction(() => {
        if (this.isCurrent(controller)) this.recordError(error);
      });

      return null;
    } finally {
      runInAction(() => {
        if (this.controller === controller) {
          this.controller = null;
          this.isGenerating = false;
        }
      });
    }
  }

  async loadLessonQuiz(lessonSlug: string) {
    if (this.isSubmitting) return;

    this.controller?.abort();

    const controller = new AbortController();

    this.controller = controller;
    this.mode = 'lesson';
    this.lessonSlug = lessonSlug;
    this.lessonQuiz = null;
    this.lessonResult = null;
    this.stage = 'setup';
    this.pending = null;

    this.isLoading = true;
    this.isGenerating = false;
    this.error = null;
    this.accessIssue = null;

    try {
      const quiz = await this.service.getLessonQuestion(lessonSlug, controller.signal);

      runInAction(() => {
        if (this.isCurrent(controller)) {
          this.lessonQuiz = quiz;
          this.beginQuestion();
        }
      });
    } catch (error) {
      runInAction(() => {
        if (this.isCurrent(controller)) this.recordError(error);
      });
    } finally {
      runInAction(() => {
        if (this.controller === controller) {
          this.controller = null;
          this.isLoading = false;
        }
      });
    }
  }

  setTextInput(value: string) {
    if (this.answerLocked || this.isSubmitting) return;

    this.textInput = value.slice(0, 2000);
    this.japaneseAnswer = toKana(this.textInput);
  }

  setJapaneseAnswer(value: string) {
    if (!this.answerLocked && !this.isSubmitting) this.japaneseAnswer = value.slice(0, 2000);
  }

  selectOption(id: string) {
    const q = this.currentQuestion;

    if (
      !this.answerLocked &&
      !this.isSubmitting &&
      q?.questionType === 'SLOT_FILL' &&
      q.promptPayload.options.some((o) => o.id === id)
    )
      this.selectedOptionId = id;
  }

  toggleToken(id: string) {
    const q = this.currentQuestion;

    if (
      this.answerLocked ||
      this.isSubmitting ||
      q?.questionType !== 'ARRANGE_TOKEN' ||
      !q.promptPayload.arrangeTokens.some((t) => t.id === id)
    )
      return;

    this.arrangedTokenIds = this.arrangedTokenIds.includes(id)
      ? this.arrangedTokenIds.filter((t) => t !== id)
      : [...this.arrangedTokenIds, id];
  }

  private userAnswer(): PracticeUserAnswer {
    const q = this.currentQuestion;

    if (q?.questionType === 'SLOT_FILL') return { selectedOptionId: this.selectedOptionId! };

    if (q?.questionType === 'ARRANGE_TOKEN')
      return { arrangedTokenIds: [...this.arrangedTokenIds] };

    return {
      rawInputRomaji: this.textInput,
      normalizedKana: this.japaneseAnswer,
      ...(/[\u3400-\u9fff]/.test(this.japaneseAnswer)
        ? { normalizedKanji: this.japaneseAnswer }
        : {}),
    };
  }

  async submitAnswer() {
    const q = this.currentQuestion;

    if (!this.canSubmit || !q) return;

    // A lost response can follow a committed write; retain timing, payload and receipt key until confirmed.
    if (!this.pending) {
      const request = {
        questionId: q.id,
        userAnswer: this.userAnswer(),
        responseTimeMs: Math.min(2147483647, Math.max(0, Date.now() - this.turnStartedAt)),
      };

      this.pending = { request };

      if (this.mode === 'lesson' && this.lessonSlug)
        this.pending = {
          request,
          lessonRequest: {
            ...request,
            lessonSlug: this.lessonSlug,
            userAnswer: request.userAnswer as LessonAnswerRequest['userAnswer'],
          },
          key: crypto.randomUUID(),
        };
    }

    const pending = this.pending;
    const controller = new AbortController();

    this.controller = controller;
    this.isSubmitting = true;
    this.error = null;

    try {
      if (this.mode === 'lesson' && pending.lessonRequest && pending.key) {
        const result = await this.service.submitLessonAnswer(
          pending.lessonRequest,
          pending.key,
          controller.signal,
        );

        runInAction(() => {
          if (this.isCurrent(controller)) {
            if (
              result.understandingProgress.targetDifficultyLevel !==
              this.lessonQuiz?.targetDifficultyLevel
            )
              throw new ClientException(
                'contract',
                'The answer result could not be read. Retry the same answer.',
              );

            this.lessonResult = result;
            this.stage = 'feedback';
          }
        });
      } else if (this.session) {
        const result = await this.service.submitAnswer(
          this.session.id,
          pending.request,
          controller.signal,
        );

        runInAction(() => {
          if (this.isCurrent(controller) && this.session) {
            const p = result.sessionProgress;
            const next = this.session.questions[this.currentIndex + 1]?.id ?? null;

            if (
              p.totalQuestions !== this.session.totalQuestions ||
              p.answeredQuestionsCount !== this.currentIndex + 1 ||
              p.isCompleted !== (next === null) ||
              result.nextQuestionId !== next
            )
              throw new ClientException(
                'contract',
                'The answer result could not be read. Retry the same answer.',
              );

            this.answerResult = result;
            this.results = [...this.results, result];
            this.session = {
              ...this.session,
              answeredQuestionsCount: p.answeredQuestionsCount,
              status: p.isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
            };
            this.stage = 'feedback';
          }
        });
      }
    } catch (error) {
      runInAction(() => {
        if (this.isCurrent(controller)) this.recordError(error);
      });
    } finally {
      runInAction(() => {
        if (this.controller === controller) {
          this.controller = null;
          this.isSubmitting = false;
        }
      });
    }
  }

  continueSession() {
    if (this.stage !== 'feedback' || !this.answerResult || this.mode !== 'random') return;

    if (this.answerResult.sessionProgress.isCompleted) this.stage = 'completed';
    else {
      this.currentIndex += 1;
      this.beginQuestion();
    }
  }

  resetSession() {
    if (this.isSubmitting) return;

    this.dispose();
    this.session = null;
    this.results = [];
    this.lessonQuiz = null;
    this.lessonResult = null;
    this.lessonSlug = null;
    this.mode = 'random';
    this.beginQuestion();
    this.stage = 'setup';
    this.error = null;
    this.accessIssue = null;
  }

  private beginQuestion() {
    this.stage = 'question';
    this.pending = null;
    this.answerResult = null;

    this.textInput = '';
    this.japaneseAnswer = '';
    this.selectedOptionId = null;
    this.arrangedTokenIds = [];

    this.error = null;
    this.turnStartedAt = Date.now();
  }

  private isCurrent(controller: AbortController) {
    return this.controller === controller && !controller.signal.aborted;
  }

  private recordError(error: unknown) {
    if (error instanceof ClientException && error.kind === 'cancelled') return;

    if (error instanceof ApiException) {
      if (error.failure.httpStatus === 401) this.accessIssue = 'session';
      else if (error.failure.httpStatus === 403 && error.failure.code === 140306001)
        this.accessIssue = 'onboarding';
    }

    this.error = presentError(error);
  }

  dispose() {
    this.controller?.abort();
    this.controller = null;

    this.isLoading = false;
    this.isGenerating = false;
    this.isSubmitting = false;
  }
}
