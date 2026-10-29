import type { StoreError } from '@/frontend/shared/interfaces';
import type { IDisposableStore } from '@/frontend/shared/interfaces/stores';
import type {
  SyllabusTrack,
  SyllabusUnit,
  SyllabusLesson,
  LessonQuiz,
} from '@/frontend/syllabus/interfaces/entities';

export interface ISyllabusStore extends IDisposableStore {
  readonly tracks: SyllabusTrack[];

  readonly selectedTrackSlug: string;

  readonly selectedTrack: SyllabusTrack | null;

  readonly unit: SyllabusUnit | null;

  readonly lesson: SyllabusLesson | null;

  readonly quiz: LessonQuiz | null;

  readonly isLoading: boolean;

  readonly isLoaded: boolean;

  readonly error: StoreError | null;

  readonly quizError: StoreError | null;

  readonly accessIssue: 'session' | 'onboarding' | null;

  readonly readingFinished: boolean;

  loadMap(): Promise<void>;

  loadUnit(slug: string): Promise<void>;

  loadLesson(slug: string): Promise<void>;

  loadQuiz(slug: string): Promise<void>;

  selectTrack(slug: string): void;

  finishReading(): void;
}
