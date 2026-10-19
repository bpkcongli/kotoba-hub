import { progressController } from '@/backend/progress/interface/primary/rest/progress.controller';

export const runtime = 'nodejs';

export function GET(request: Request): Promise<Response> {
  return progressController.getTimeline(request);
}
