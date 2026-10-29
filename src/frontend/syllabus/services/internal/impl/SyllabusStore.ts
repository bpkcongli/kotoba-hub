import {
  actionBound,
  computed,
  makeObservable,
  observable,
  observableRef,
  runInAction,
} from 'mobx';
import { ApiException, ClientException } from '@/frontend/shared/exceptions';
import { presentError } from '@/frontend/shared/helpers';
import type { StoreError } from '@/frontend/shared/interfaces';
import type {
  SyllabusTrack,
  SyllabusUnit,
  SyllabusLesson,
  LessonQuiz,
} from '@/frontend/syllabus/interfaces/entities';
import type { ISyllabusService } from '@/frontend/syllabus/services/external';
import type { ISyllabusStore } from '@/frontend/syllabus/services/internal/ISyllabusStore';

export class SyllabusStore implements ISyllabusStore {
  tracks: SyllabusTrack[] = [];
  selectedTrackSlug = '';
  unit: SyllabusUnit | null = null;
  lesson: SyllabusLesson | null = null;
  quiz: LessonQuiz | null = null;
  isLoading = false;
  isLoaded = false;
  error: StoreError | null = null;
  quizError: StoreError | null = null;
  accessIssue: 'session' | 'onboarding' | null = null;
  readingFinished = false;

  private controller: AbortController | null = null;
  private quizController: AbortController | null = null;

  constructor(private readonly service: ISyllabusService) {
    makeObservable(this, {
      tracks: observableRef,
      selectedTrackSlug: observable,
      unit: observableRef,
      lesson: observableRef,
      quiz: observableRef,
      isLoading: observable,
      isLoaded: observable,
      error: observableRef,
      quizError: observableRef,
      accessIssue: observable,
      readingFinished: observable,
      selectedTrack: computed,
      loadMap: actionBound,
      loadUnit: actionBound,
      loadLesson: actionBound,
      loadQuiz: actionBound,
      selectTrack: actionBound,
      finishReading: actionBound,
      dispose: actionBound,
    });
  }

  get selectedTrack() {
    return this.tracks.find((t) => t.slug === this.selectedTrackSlug) ?? null;
  }

  selectTrack(slug: string) {
    if (this.tracks.some((t) => t.slug === slug)) this.selectedTrackSlug = slug;
  }

  finishReading() {
    if (this.lesson && this.lesson.contentBlocks.length) this.readingFinished = true;
  }

  async loadMap() {
    await this.load(async (signal) => {
      const tracks = await this.service.getTracks(signal);

      return () => {
        this.tracks = tracks;

        if (!tracks.some((t) => t.slug === this.selectedTrackSlug))
          this.selectedTrackSlug = tracks[0]?.slug ?? '';
      };
    });
  }

  async loadUnit(slug: string) {
    this.unit = null;

    await this.load(async (signal) => {
      const unit = await this.service.getUnit(slug, signal);

      return () => {
        this.unit = unit;
      };
    });
  }

  async loadLesson(slug: string) {
    this.lesson = null;
    this.quiz = null;
    this.readingFinished = false;

    const loaded = await this.load(async (signal) => {
      const lesson = await this.service.getLesson(slug, signal);

      return () => {
        this.lesson = lesson;
      };
    });

    if (loaded) await this.loadQuiz(slug);
  }

  async loadQuiz(slug: string) {
    this.quizController?.abort();

    const controller = new AbortController();

    this.quizController = controller;
    this.quiz = null;
    this.quizError = null;
    this.accessIssue = null;

    try {
      const quiz = await this.service.getNextQuiz(slug, controller.signal);

      runInAction(() => {
        if (this.quizController === controller && !controller.signal.aborted) this.quiz = quiz;
      });
    } catch (error) {
      runInAction(() => {
        if (this.quizController === controller && !controller.signal.aborted) {
          this.recordAccess(error);
          this.quizError = presentError(error);
        }
      });
    } finally {
      if (this.quizController === controller) this.quizController = null;
    }
  }

  private async load(work: (signal: AbortSignal) => Promise<() => void>) {
    this.controller?.abort();
    this.quizController?.abort();
    this.quizController = null;

    const controller = new AbortController();

    this.controller = controller;
    this.isLoading = true;
    this.isLoaded = false;
    this.error = null;
    this.accessIssue = null;

    let applied = false;

    try {
      const apply = await work(controller.signal);

      runInAction(() => {
        if (this.controller === controller && !controller.signal.aborted) {
          apply();
          this.isLoaded = true;
          applied = true;
        }
      });
    } catch (error) {
      runInAction(() => {
        if (
          this.controller === controller &&
          !controller.signal.aborted &&
          !(error instanceof ClientException && error.kind === 'cancelled')
        ) {
          this.recordAccess(error);
          this.error = presentError(error);
        }
      });
    } finally {
      runInAction(() => {
        if (this.controller === controller) {
          this.controller = null;
          this.isLoading = false;
        }
      });
    }

    return applied;
  }

  private recordAccess(error: unknown) {
    if (error instanceof ApiException) {
      if (error.failure.httpStatus === 401) this.accessIssue = 'session';
      else if (
        error.failure.httpStatus === 403 &&
        [140304001, 140306001].includes(error.failure.code ?? 0)
      )
        this.accessIssue = 'onboarding';
    }
  }

  dispose() {
    this.controller?.abort();
    this.quizController?.abort();
    this.controller = null;
    this.quizController = null;
    this.isLoading = false;
  }
}
