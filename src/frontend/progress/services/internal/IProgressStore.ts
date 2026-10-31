import type {
  ProgressOverview,
  ProgressSession,
  ProgressEvent,
  ProgressPagination,
  ProgressSourceType,
  LessonProgress,
} from '@/frontend/progress/interfaces/entities';
import type { StoreError } from '@/frontend/shared/interfaces';
import type { IDisposableStore } from '@/frontend/shared/interfaces/stores';
import type { SyllabusTrack, SyllabusUnit } from '@/frontend/syllabus/interfaces/entities';

export interface IProgressStore extends IDisposableStore {
  overview: ProgressOverview | null;

  tracks: SyllabusTrack[];

  selectedTrackSlug: string;

  readonly selectedTrack: SyllabusTrack | null;

  selectedUnit: SyllabusUnit | null;

  selectedUnitSlug: string;

  lessonStatuses: LessonProgress[];

  sessions: ProgressSession[];

  sessionsPagination: ProgressPagination | null;

  sessionsOffset: number;

  timeline: ProgressEvent[];

  timelinePagination: ProgressPagination | null;

  timelineOffset: number;

  sourceType: ProgressSourceType | '';

  readonly pageSize: number;

  isLoading: boolean;

  isLoaded: boolean;

  sessionsLoading: boolean;

  timelineLoading: boolean;

  lessonsLoading: boolean;

  error: StoreError | null;

  catalogError: StoreError | null;

  sessionsError: StoreError | null;

  timelineError: StoreError | null;

  lessonsError: StoreError | null;

  accessIssue: 'session' | 'onboarding' | null;

  load(): Promise<void>;

  refresh(): Promise<void>;

  selectTrack(slug: string): Promise<void>;

  setSourceType(sourceType: ProgressSourceType | ''): Promise<void>;

  loadSessions(offset: number): Promise<void>;

  loadTimeline(offset: number): Promise<void>;

  selectUnit(slug: string): Promise<void>;
}
