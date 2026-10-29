export interface GeneratePracticeRequest {
  questionCount: number;
}

export interface PracticeTextAnswer {
  rawInputRomaji: string;
  normalizedKana: string;
  normalizedKanji?: string;
}

export type PracticeUserAnswer =
  PracticeTextAnswer | { selectedOptionId: string } | { arrangedTokenIds: string[] };

export interface PracticeAnswerRequest {
  questionId: string;
  userAnswer: PracticeUserAnswer;
  responseTimeMs: number;
}

export interface LessonAnswerRequest {
  lessonSlug: string;
  questionId: string;
  userAnswer: PracticeTextAnswer;
  responseTimeMs: number;
}
