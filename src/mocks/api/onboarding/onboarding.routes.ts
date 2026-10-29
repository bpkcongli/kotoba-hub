import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import {
  assessmentDraftFixture,
  onboardingConfirmationFixture,
  onboardingProfileFixture,
  onboardingTracksFixture,
} from '@/mocks/fixtures/onboarding';
import { getMockOnboardingProfile, setMockOnboardingProfile } from '@/mocks/states/onboarding';
import { getMockSession, setMockSession } from '@/mocks/states/session';

function status(
  code: number,
  message = 'Success!',
  errorDetails: { field: string; message: string }[] = [],
) {
  return { traceId: crypto.randomUUID(), code, message, errorDetails };
}

const profileRequestSchema = z.object({
  currentLevel: z.string().min(1).max(50).nullable().optional(),
  targetLevel: z.string().min(1).max(50),
  dailyGoalMinutes: z.number().int().min(1).max(2147483647),
  preferredScript: z.enum(['ROMAJI', 'KANA', 'MIXED']),
  weakSkillFocuses: z.array(z.string().min(1).max(100)),
});

function unauthorized(code: number) {
  return HttpResponse.json(
    { status: status(code, 'Your session expired. Sign in again to continue.') },
    { status: 401 },
  );
}

function invalidTarget(targetLevel: string) {
  if (onboardingTracksFixture().some((track) => `JLPT_${track.curriculumLevel}` === targetLevel))
    return null;

  return HttpResponse.json(
    {
      status: status(142203002, 'Choose an available target level.', [
        {
          field: 'targetLevel',
          message: 'Target level is not available in the published syllabus.',
        },
      ]),
    },
    { status: 422 },
  );
}

function invalidCurrentLevel(currentLevel: string | null | undefined) {
  if (
    currentLevel == null ||
    currentLevel === 'BEGINNER' ||
    onboardingTracksFixture().some((track) => `JLPT_${track.curriculumLevel}` === currentLevel)
  )
    return null;

  return HttpResponse.json(
    {
      status: status(142203002, 'Choose an available current level.', [
        {
          field: 'currentLevel',
          message: 'Current level is not available in the published syllabus.',
        },
      ]),
    },
    { status: 422 },
  );
}

export const onboardingHandlers = [
  http.get('*/api/v1/user-profile/me', () => {
    const session = getMockSession();
    if (!session.user) return unauthorized(140102001);

    const saved = getMockOnboardingProfile();
    const profile =
      saved?.userId === session.user.id
        ? saved
        : {
            ...onboardingProfileFixture(),
            userId: session.user.id,
            email: session.user.email,
            displayName: session.user.displayName,
            avatarUrl: session.user.avatarUrl,
          };

    return HttpResponse.json({ status: status(120002000), data: profile });
  }),

  http.post('*/api/v1/personalization/assessment', async ({ request }) => {
    if (!getMockSession().isAuthenticated) return unauthorized(140103001);

    const parsed = profileRequestSchema
      .extend({ note: z.string().max(2000).nullable().optional() })
      .strict()
      .safeParse(await request.json());

    if (!parsed.success)
      return HttpResponse.json(
        { status: status(142203001, 'Check your assessment inputs.') },
        { status: 422 },
      );

    const invalid =
      invalidTarget(parsed.data.targetLevel) ?? invalidCurrentLevel(parsed.data.currentLevel);

    if (invalid) return invalid;

    return HttpResponse.json({
      status: status(120003000),
      data: assessmentDraftFixture({
        ...parsed.data,
        currentLevel: parsed.data.currentLevel ?? null,
      }),
    });
  }),

  http.post('*/api/v1/personalization/assessment/confirm', async ({ request }) => {
    const session = getMockSession();
    if (!session.user) return unauthorized(140103001);

    const parsed = profileRequestSchema
      .extend({ knownSkillClaims: z.array(z.string().min(1)) })
      .strict()
      .safeParse(await request.json());

    if (!parsed.success)
      return HttpResponse.json(
        { status: status(142203001, 'Check your confirmed assessment.') },
        { status: 422 },
      );

    const invalid =
      invalidTarget(parsed.data.targetLevel) ?? invalidCurrentLevel(parsed.data.currentLevel);

    if (invalid) return invalid;

    if (parsed.data.knownSkillClaims.some((claim) => claim !== 'hiragana_a_row'))
      return HttpResponse.json(
        {
          status: status(142203002, 'Review your known skills.', [
            {
              field: 'knownSkillClaims',
              message: 'One or more skills are not in the published syllabus.',
            },
          ]),
        },
        { status: 422 },
      );

    const result = onboardingConfirmationFixture({
      ...parsed.data,
      currentLevel: parsed.data.currentLevel ?? null,
    });

    result.userProfile = {
      ...result.userProfile,
      userId: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      avatarUrl: session.user.avatarUrl,
    };

    setMockOnboardingProfile(result.userProfile);
    setMockSession({
      ...session,
      authorization: { appAccess: 'APP_READY', onboardingCompleted: true },
    });

    return HttpResponse.json({ status: status(120003000), data: result });
  }),
];
