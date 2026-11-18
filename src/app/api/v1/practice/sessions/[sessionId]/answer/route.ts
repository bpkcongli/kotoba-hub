import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { practiceController } from '@/backend/practice/interface/primary/rest/practice.controller';

export const POST = withLocalizedResponse(
  async (request: Request, context: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await context.params;

    return practiceController.submitAnswer(request, sessionId);
  },
);
