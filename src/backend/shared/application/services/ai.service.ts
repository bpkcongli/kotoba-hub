import type {
  GeneratePracticeSessionInput,
  GradePracticeAnswerInput,
  SummarizePlacementInput,
  GenerateStudyRecommendationInput,
} from './requests/ai-request';
import type {
  GeneratedPracticeSession,
  GradedPracticeAnswer,
  PlacementSummary,
  StudyRecommendation,
} from './responses/ai-response';

export interface AiService {
  generatePracticeSession(input: GeneratePracticeSessionInput): Promise<GeneratedPracticeSession>;

  gradePracticeAnswer(input: GradePracticeAnswerInput): Promise<GradedPracticeAnswer>;

  summarizePlacement(input: SummarizePlacementInput): Promise<PlacementSummary>;

  generateStudyRecommendation(
    input: GenerateStudyRecommendationInput,
  ): Promise<StudyRecommendation>;
}
