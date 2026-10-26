import type { PlacementNormalizationPort } from '@/backend/personalization/application/ports/placement-normalization.port';
import type { AiService } from '@/backend/shared/application/services/ai.service';
import type { SummarizePlacementInput } from '@/backend/shared/application/services/requests/ai-request';

export class PlacementNormalizationAdapter implements PlacementNormalizationPort {
  constructor(private readonly getService: () => AiService) {}

  summarize(input: SummarizePlacementInput) {
    return this.getService().summarizePlacement(input);
  }
}
