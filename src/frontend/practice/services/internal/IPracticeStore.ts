import type {
  PracticeSession,
  PracticeQuestion,
  PracticeAnswerResult,
  LessonQuiz,
  LessonQuizResult,
} from '@/frontend/practice/interfaces/entities';
import type { StoreError } from '@/frontend/shared/interfaces';
import type { IDisposableStore } from '@/frontend/shared/interfaces/stores';

export interface IPracticeStore extends IDisposableStore {
  questionCount: number;

  session: PracticeSession | null;

  currentQuestion: PracticeQuestion | LessonQuiz['question'] | null;

  results: PracticeAnswerResult[];

  answerResult: PracticeAnswerResult | null;

  lessonQuiz: LessonQuiz | null;

  lessonResult: LessonQuizResult | null;

  lessonSlug: string | null;

  mode: 'random' | 'lesson';

  stage: 'setup' | 'question' | 'feedback' | 'completed';

  isLoading: boolean;

  isGenerating: boolean;

  isSubmitting: boolean;

  error: StoreError | null;

  accessIssue: 'session' | 'onboarding' | null;

  readonly answerLocked: boolean;

  readonly canSubmit: boolean;

  textInput: string;

  japaneseAnswer: string;

  selectedOptionId: string | null;

  arrangedTokenIds: string[];

  setQuestionCount(value: number): void;

  generateSession(): Promise<PracticeSession | null>;

  loadLessonQuiz(lessonSlug: string): Promise<void>;

  setTextInput(value: string): void;

  setJapaneseAnswer(value: string): void;

  selectOption(id: string): void;

  toggleToken(id: string): void;

  submitAnswer(): Promise<void>;

  continueSession(): void;

  resetSession(): void;
}
