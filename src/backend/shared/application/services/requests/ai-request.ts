export type { AiOperation } from '@/backend/shared/domain/repositories/ai-request-log.repository';

export type AiQuestionType =
  'SHORT_FREE_RESPONSE' | 'SLOT_FILL' | 'ARRANGE_TOKEN' | 'FREE_RESPONSE';

export type AiDifficultyBand = 'REMEDIAL' | 'STANDARD' | 'STRETCH';

export interface AiRuntimeConfig {
  provider: 'OPENAI';
  apiKey?: string;
  generationModel: string;
  lightweightModel: string;
  timeoutMs: number;
  maxRetries: number;
  maxOutputTokens: number;
  maxInputChars: number;
  retryDelayMs: number;
  modelCosts?: Record<
    string,
    {
      inputPerMillionUsd: number;
      cachedInputPerMillionUsd: number;
      outputPerMillionUsd: number;
    }
  >;
}

export interface AiCatalogSkill {
  skillCode: string;
  title: string;
  lessonSlug: string;
  unitSlug: string;
  trackSlug: string;
}

export interface AiContextBundle {
  targetLevel: string;
  currentLevel: string | null;
  currentUnitSlug: string | null;
  catalog: AiCatalogSkill[];
  weakSkillCodes: string[];
  masteredSkillCodes: string[];
  recentMistakes: { skillCode: string; summary: string }[];
  lessonUnderstanding: { lessonSlug: string; level: number }[];
  allowedQuestionTypes: AiQuestionType[];
}

export interface AiRequestMetadata {
  requestId: string;
  userId?: string;
  sourceEntityType?: 'PRACTICE_SESSION' | 'PRACTICE_ANSWER' | 'PERSONALIZATION_ASSESSMENT';
  sourceEntityId?: string;
}

export interface AiRequestBase {
  metadata: AiRequestMetadata;
  context: AiContextBundle;
}

export interface GeneratePracticeSessionInput extends AiRequestBase {
  questionCount: number;
  difficultyBand: AiDifficultyBand;
  questionMix?: { WEAK: number; REINFORCEMENT: number; STRETCH: number };
}

export interface GradePracticeAnswerInput extends AiRequestBase {
  question: {
    skillCode: string;
    questionType: 'FREE_RESPONSE';
    sourceSentence: string;
    referenceAnswer: string;
  };
  userAnswer: {
    rawInputRomaji: string;
    normalizedKana: string;
    normalizedKanji: string | null;
  };
}

export interface SummarizePlacementInput extends AiRequestBase {
  note: string;
}

export type GenerateStudyRecommendationInput = AiRequestBase;
