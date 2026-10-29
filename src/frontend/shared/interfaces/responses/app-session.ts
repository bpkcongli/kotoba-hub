import { z } from 'zod';
import type { AppSession } from '@/frontend/shared/interfaces/entities';
import { authSuccessStatusSchema } from './api-status';

const userSchema = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  avatarUrl: z.url().nullable(),
  emailVerified: z.boolean(),
});

export const appSessionSchema: z.ZodType<AppSession> = z
  .discriminatedUnion('isAuthenticated', [
    z.strictObject({
      isAuthenticated: z.literal(false),
      sessionId: z.null(),
      expiresAt: z.null(),
      user: z.null(),
      authorization: z.strictObject({
        appAccess: z.literal('ANONYMOUS'),
        onboardingCompleted: z.null(),
      }),
    }),
    z.strictObject({
      isAuthenticated: z.literal(true),
      sessionId: z.uuid(),
      expiresAt: z.iso.datetime({ offset: true }),
      user: userSchema,
      authorization: z.strictObject({
        appAccess: z.enum(['ONBOARDING_REQUIRED', 'APP_READY']),
        onboardingCompleted: z.boolean(),
      }),
    }),
  ])
  .refine(
    (session) =>
      !session.isAuthenticated ||
      (session.authorization.appAccess === 'APP_READY') ===
        session.authorization.onboardingCompleted,
    { message: 'Session access and onboarding state must agree.' },
  );

export const appSessionResponseSchema = z.strictObject({
  status: authSuccessStatusSchema,
  data: appSessionSchema,
});

export const signOutResponseSchema = z.strictObject({ status: authSuccessStatusSchema });
