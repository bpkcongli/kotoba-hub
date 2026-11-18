export interface GeneratePracticeRequest {
  questionCount: number;
  contentFormat?: 'localized';
  contentLocale?: 'en' | 'id';
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
  contentFormat?: 'localized';
  deliveryId?: string;
  lessonSlug: string;
  questionId: string;
  userAnswer: PracticeTextAnswer;
  responseTimeMs: number;
}
