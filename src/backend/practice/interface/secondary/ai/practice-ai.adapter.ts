import type { PracticeAiPort } from '@/backend/practice/application/ports/practice-ai.port';
import type { AiService } from '@/backend/shared/application/services/ai.service';
import type {
  GeneratePracticeSessionInput,
  GradePracticeAnswerInput,
} from '@/backend/shared/application/services/requests/ai-request';

export class PracticeAiAdapter implements PracticeAiPort {
  constructor(private readonly getService: () => AiService) {}

  generate(input: GeneratePracticeSessionInput) {
    return this.getService().generatePracticeSession(input);
  }

  grade(input: GradePracticeAnswerInput) {
    return this.getService().gradePracticeAnswer(input);
  }
}
