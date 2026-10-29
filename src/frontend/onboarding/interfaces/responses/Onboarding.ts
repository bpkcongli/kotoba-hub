import { z } from 'zod';
import { apiStatusSchema } from '@/frontend/shared/interfaces/responses';

const profileSchema = z.object({
  currentLevel: z.string().min(1).max(50).nullable(),
  targetLevel: z.string().min(1).max(50),
  dailyGoalMinutes: z.number().int().min(1).max(2147483647),
  preferredScript: z.enum(['ROMAJI', 'KANA', 'MIXED']),
  weakSkillFocuses: z.array(z.string().min(1).max(100)),
});

const recommendationSchema = z.object({
  recommendedTrackSlug: z.string().min(1),
  recommendedUnitSlug: z.string().min(1),
  nextLessonSlug: z.string().min(1),
});

const userProfileSchema = z.object({
  userId: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  avatarUrl: z.url().nullable(),
  onboardingCompleted: z.boolean(),
  appAccess: z.enum(['ONBOARDING_REQUIRED', 'APP_READY']),
  learnerProfile: profileSchema
    .extend({
      knownSkillClaims: z.array(z.string().min(1)),
      onboardingCompletedAt: z.iso.datetime({ offset: true }).nullable(),
    })
    .nullable(),
});

export const userProfileResponseSchema = z.object({
  status: apiStatusSchema.extend({ code: z.literal(120002000) }),
  data: userProfileSchema,
});

export const assessmentResponseSchema = z.object({
  status: apiStatusSchema.extend({ code: z.literal(120003000) }),
  data: z.object({
    draftProfile: profileSchema,
    suggestedKnownSkillClaims: z.array(
      z.object({
        skillCode: z.string().min(1),
        title: z.string().min(1),
        source: z.enum(['ai_note', 'structured_input']),
        confidence: z.number().min(0).max(1),
      }),
    ),
    recommendation: recommendationSchema,
    aiNormalizationUsed: z.boolean(),
  }),
});

export const confirmationResponseSchema = z.object({
  status: apiStatusSchema.extend({ code: z.literal(120003000) }),
  data: z.object({
    userProfile: userProfileSchema.refine(
      (profile) =>
        profile.onboardingCompleted &&
        profile.appAccess === 'APP_READY' &&
        profile.learnerProfile !== null,
    ),
    recommendation: recommendationSchema,
  }),
});

export const syllabusTracksResponseSchema = z.object({
  status: apiStatusSchema.extend({ code: z.literal(120004000) }),
  data: z.object({
    tracks: z.array(
      z.object({
        id: z.uuid(),
        slug: z.string().min(1),
        curriculumLevel: z.string().min(1),
        title: z.string().min(1),
        description: z.string().nullable(),
        sortOrder: z.number().int(),
        unitCount: z.number().int().nonnegative(),
        foundationUnitSlug: z.string().nullable(),
      }),
    ),
  }),
  metadata: z.object({
    pagination: z.object({
      pageNumber: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      totalRecords: z.number().int().nonnegative(),
    }),
  }),
});
