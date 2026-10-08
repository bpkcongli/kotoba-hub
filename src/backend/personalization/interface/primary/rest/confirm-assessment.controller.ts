import { AuthorizationService } from '@/backend/auth/application/services/guard';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { requireSameOrigin } from '@/backend/auth/interface/primary/rest/origin';
import { InvalidOnboardingCatalogReference } from '@/backend/personalization/domain/exceptions/invalid-onboarding-catalog-reference';
import { confirmAssessmentService } from '@/backend/personalization/infrastructure/di';
import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';
import { confirmAssessmentRequestSchema } from './dto/confirm-assessment.request.dto';
import { toConfirmAssessmentResponseDto } from './dto/confirm-assessment.response.dto';

const authorization = new AuthorizationService();

export async function confirmAssessment(request: Request): Promise<Response> {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const session = await getSessionSnapshot(request.headers.get('cookie'));
    if (authorization.authorize(session, 'AUTHENTICATED') || !session.user) {
      return apiResponse(ApplicationStatusCode.PERSONALIZATION_UNAUTHORIZED);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiResponse(ApplicationStatusCode.PERSONALIZATION_VALIDATION_ERROR, undefined, [
        { field: 'body', message: 'Request body must be valid JSON.' },
      ]);
    }

    const parsed = confirmAssessmentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse(
        ApplicationStatusCode.PERSONALIZATION_VALIDATION_ERROR,
        undefined,
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }

    const result = await confirmAssessmentService.confirm({
      userId: session.user.id,
      currentLevel: parsed.data.currentLevel ?? null,
      targetLevel: parsed.data.targetLevel,
      dailyGoalMinutes: parsed.data.dailyGoalMinutes,
      preferredScript: parsed.data.preferredScript,
      weakSkillFocuses: parsed.data.weakSkillFocuses,
      knownSkillClaims: parsed.data.knownSkillClaims,
    });

    return apiResponse(
      ApplicationStatusCode.PERSONALIZATION_SUCCESS,
      toConfirmAssessmentResponseDto(result),
    );
  } catch (error) {
    if (error instanceof InvalidOnboardingCatalogReference) {
      return apiResponse(
        ApplicationStatusCode.PERSONALIZATION_INVALID_REFERENCE,
        undefined,
        error.details,
      );
    }

    return apiResponse(ApplicationStatusCode.UNHANDLED_PERSONALIZATION_EXCEPTION);
  }
}
