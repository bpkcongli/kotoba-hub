import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { toSessionResponseDto } from '@/backend/auth/interface/primary/rest/dto/session.response.dto';
import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';

export const GET = withLocalizedResponse(async (request: Request) => {
  const session = await getSessionSnapshot(request.headers.get('cookie'));

  return apiResponse(ApplicationStatusCode.AUTH_SUCCESS, toSessionResponseDto(session));
});
