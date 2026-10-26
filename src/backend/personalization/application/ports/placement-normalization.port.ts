import type { SummarizePlacementInput } from '@/backend/shared/application/services/requests/ai-request';
import type { PlacementSummary } from '@/backend/shared/application/services/responses/ai-response';

export interface PlacementNormalizationPort {
  summarize(input: SummarizePlacementInput): Promise<PlacementSummary>;
}
