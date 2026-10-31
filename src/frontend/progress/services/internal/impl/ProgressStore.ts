import {
  actionBound,
  computed,
  makeObservable,
  observable,
  observableRef,
  runInAction,
} from 'mobx';
import type {
  ProgressOverview,
  ProgressSession,
  ProgressEvent,
  ProgressPagination,
  ProgressSourceType,
  LessonProgress,
} from '@/frontend/progress/interfaces/entities';
import type { IProgressService } from '@/frontend/progress/services/external';
import type { IProgressStore } from '@/frontend/progress/services/internal/IProgressStore';
import { ApiException } from '@/frontend/shared/exceptions';
import { presentError } from '@/frontend/shared/helpers';
import type { StoreError } from '@/frontend/shared/interfaces';
import type { SyllabusTrack, SyllabusUnit } from '@/frontend/syllabus/interfaces/entities';
import type { ISyllabusService } from '@/frontend/syllabus/services/external';

type ReadSlot = 'overview' | 'catalog' | 'sessions' | 'timeline' | 'lessons';

export class ProgressStore implements IProgressStore {
  overview: ProgressOverview | null = null;
  tracks: SyllabusTrack[] = [];
  selectedTrackSlug = '';
  selectedUnit: SyllabusUnit | null = null;
  selectedUnitSlug = '';
  lessonStatuses: LessonProgress[] = [];
  sessions: ProgressSession[] = [];
  sessionsPagination: ProgressPagination | null = null;
  sessionsOffset = 0;
  timeline: ProgressEvent[] = [];
  timelinePagination: ProgressPagination | null = null;
  timelineOffset = 0;
  sourceType: ProgressSourceType | '' = '';
  readonly pageSize = 10;
  isLoading = false;
  isLoaded = false;
  sessionsLoading = false;
  timelineLoading = false;
  lessonsLoading = false;
  error: StoreError | null = null;
  catalogError: StoreError | null = null;
  sessionsError: StoreError | null = null;
  timelineError: StoreError | null = null;
  lessonsError: StoreError | null = null;
  accessIssue: 'session' | 'onboarding' | null = null;

  private readonly controllers = new Map<ReadSlot, AbortController>();

  constructor(
    private readonly service: IProgressService,
    private readonly syllabus: ISyllabusService,
  ) {
    makeObservable(this, {
      overview: observableRef,
      tracks: observableRef,
      selectedTrackSlug: observable,
      selectedUnit: observableRef,
      selectedUnitSlug: observable,
      lessonStatuses: observableRef,
      sessions: observableRef,
      sessionsPagination: observableRef,
      sessionsOffset: observable,
      timeline: observableRef,
      timelinePagination: observableRef,
      timelineOffset: observable,
      sourceType: observable,
      isLoading: observable,
      isLoaded: observable,
      sessionsLoading: observable,
      timelineLoading: observable,
      lessonsLoading: observable,
      error: observableRef,
      catalogError: observableRef,
      sessionsError: observableRef,
      timelineError: observableRef,
      lessonsError: observableRef,
      accessIssue: observable,
      selectedTrack: computed,
      load: actionBound,
      refresh: actionBound,
      selectTrack: actionBound,
      setSourceType: actionBound,
      loadSessions: actionBound,
      loadTimeline: actionBound,
      selectUnit: actionBound,
      dispose: actionBound,
    });
  }

  get selectedTrack() {
    return this.tracks.find((track) => track.slug === this.selectedTrackSlug) ?? null;
  }

  async load() {
    this.accessIssue = null;

    await this.refresh();
  }

  async refresh() {
    await Promise.all([
      this.readOverview(),
      this.readCatalog(),
      this.loadSessions(this.sessionsOffset),
      this.loadTimeline(this.timelineOffset),
      ...(this.selectedUnitSlug ? [this.selectUnit(this.selectedUnitSlug)] : []),
    ]);
  }

  async selectTrack(slug: string) {
    if (slug === this.selectedTrackSlug) return;

    this.selectedTrackSlug = slug;
    this.overview = null;

    this.sessions = [];
    this.sessionsPagination = null;
    this.sessionsOffset = 0;

    this.timeline = [];
    this.timelinePagination = null;
    this.timelineOffset = 0;

    this.clearLessons();

    await Promise.all([this.readOverview(), this.loadSessions(0), this.loadTimeline(0)]);
  }

  async setSourceType(sourceType: ProgressSourceType | '') {
    if (sourceType === this.sourceType) return;

    this.sourceType = sourceType;

    this.sessions = [];
    this.sessionsPagination = null;

    this.timeline = [];
    this.timelinePagination = null;

    this.sessionsOffset = 0;
    this.timelineOffset = 0;

    await Promise.all([this.loadSessions(0), this.loadTimeline(0)]);
  }

  private async readOverview() {
    this.isLoading = true;
    this.error = null;

    const trackSlug = this.selectedTrackSlug;

    await this.read(
      'overview',
      async (signal) => {
        const overview = await this.service.getOverview(trackSlug || undefined, signal);

        return () => {
          this.overview = overview;
          this.isLoaded = true;
        };
      },
      (error) => {
        this.error = error;
      },
      () => {
        this.isLoading = false;
      },
    );
  }

  private async readCatalog() {
    runInAction(() => {
      this.catalogError = null;
    });

    await this.read(
      'catalog',
      async (signal) => {
        const tracks = await this.syllabus.getTracks(signal);

        return () => {
          this.tracks = tracks;
        };
      },
      (error) => {
        this.catalogError = error;
      },
    );
  }

  async loadSessions(offset: number) {
    this.sessionsLoading = true;
    this.sessionsError = null;

    const query = this.query(offset);

    await this.read(
      'sessions',
      async (signal) => {
        const result = await this.service.getSessions(query, signal);

        return () => {
          this.sessions = result.items;
          this.sessionsPagination = result.pagination;
          this.sessionsOffset = offset;
        };
      },
      (error) => {
        this.sessionsError = error;
      },
      () => {
        this.sessionsLoading = false;
      },
    );
  }

  async loadTimeline(offset: number) {
    this.timelineLoading = true;
    this.timelineError = null;

    const query = this.query(offset);

    await this.read(
      'timeline',
      async (signal) => {
        const result = await this.service.getTimeline(query, signal);

        return () => {
          this.timeline = result.items;
          this.timelinePagination = result.pagination;
          this.timelineOffset = offset;
        };
      },
      (error) => {
        this.timelineError = error;
      },
      () => {
        this.timelineLoading = false;
      },
    );
  }

  async selectUnit(slug: string) {
    const sameUnit = this.selectedUnitSlug === slug;

    if (!sameUnit) this.clearLessons();

    this.selectedUnitSlug = slug;

    if (!slug) return;

    this.lessonsLoading = true;
    this.lessonsError = null;

    await this.read(
      'lessons',
      async (signal) => {
        const unit = await this.syllabus.getUnit(slug, signal);
        const lessonStatuses: LessonProgress[] = [];

        // Limit concurrent quiz reads to the selected unit; no quiz attempt is created here.
        for (let index = 0; index < unit.lessons.length; index += 3) {
          if (signal.aborted) return () => {};

          const batch = await Promise.all(
            unit.lessons.slice(index, index + 3).map(async (lesson) => {
              const quiz = await this.syllabus.getNextQuiz(lesson.slug, signal);

              return {
                lessonSlug: lesson.slug,
                title: lesson.title,
                currentUnderstandingLevel: quiz.currentUnderstandingLevel,
                targetDifficultyLevel: quiz.targetDifficultyLevel,
                isReview: quiz.isReview,
              };
            }),
          );

          lessonStatuses.push(...batch);
        }

        return () => {
          this.selectedUnit = unit;
          this.lessonStatuses = lessonStatuses;
        };
      },
      (error) => {
        this.lessonsError = error;
      },
      () => {
        this.lessonsLoading = false;
      },
    );
  }

  private query(offset: number) {
    return {
      offset,
      limit: this.pageSize,
      trackSlug: this.selectedTrackSlug || undefined,
      sourceTypes: this.sourceType ? [this.sourceType] : undefined,
    };
  }

  private async read(
    slot: ReadSlot,
    work: (signal: AbortSignal) => Promise<() => void>,
    fail: (error: StoreError) => void,
    finish: () => void = () => {},
  ) {
    this.controllers.get(slot)?.abort();

    const controller = new AbortController();

    this.controllers.set(slot, controller);

    try {
      const apply = await work(controller.signal);

      runInAction(() => {
        if (
          this.controllers.get(slot) === controller &&
          !controller.signal.aborted &&
          !this.accessIssue
        )
          apply();
      });
    } catch (error) {
      runInAction(() => {
        if (this.controllers.get(slot) !== controller || controller.signal.aborted) return;

        if (error instanceof ApiException && error.failure.httpStatus === 401)
          this.accessIssue = 'session';

        if (
          error instanceof ApiException &&
          error.failure.httpStatus === 403 &&
          [140307001, 140304001, 140306001].includes(error.failure.code ?? 0)
        )
          this.accessIssue = 'onboarding';

        if (this.accessIssue) {
          this.overview = null;
          this.sessions = [];
          this.timeline = [];
          this.lessonStatuses = [];
        }

        fail(presentError(error));
      });
    } finally {
      runInAction(() => {
        if (this.controllers.get(slot) === controller) {
          this.controllers.delete(slot);

          finish();
        }
      });
    }
  }

  private clearLessons() {
    this.controllers.get('lessons')?.abort();
    this.controllers.delete('lessons');

    this.selectedUnit = null;
    this.selectedUnitSlug = '';
    this.lessonStatuses = [];

    this.lessonsError = null;
    this.lessonsLoading = false;
  }

  dispose() {
    for (const controller of this.controllers.values()) controller.abort();

    this.controllers.clear();

    this.isLoading = false;
    this.sessionsLoading = false;
    this.timelineLoading = false;
    this.lessonsLoading = false;
  }
}
