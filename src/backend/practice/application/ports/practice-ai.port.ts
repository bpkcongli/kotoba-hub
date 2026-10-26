import type {
  GeneratePracticeSessionInput,
  GradePracticeAnswerInput,
} from '@/backend/shared/application/services/requests/ai-request';
import type {
  GeneratedPracticeSession,
  GradedPracticeAnswer,
} from '@/backend/shared/application/services/responses/ai-response';

export interface PracticeAiPort {
  generate(input: GeneratePracticeSessionInput): Promise<GeneratedPracticeSession>;

  grade(input: GradePracticeAnswerInput): Promise<GradedPracticeAnswer>;
}
