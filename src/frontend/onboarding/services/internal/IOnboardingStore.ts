import { z } from 'zod';
import type {
  AssessmentDraft,
  OnboardingResult,
  SyllabusTrack,
} from '@/frontend/onboarding/interfaces/entities';
import type { IDefaultFormStore, IDisposableStore } from '@/frontend/shared/interfaces/stores';

export const assessmentFormDataSchema = z.object({
  currentLevel: z
    .string({ error: 'ONBOARDING:ASSESSMENT_FORM.CURRENT_LEVEL_SELECT.VALIDATION_MESSAGE' })
    .min(1, 'ONBOARDING:ASSESSMENT_FORM.CURRENT_LEVEL_SELECT.VALIDATION_MESSAGE')
    .max(50, 'ONBOARDING:ASSESSMENT_FORM.CURRENT_LEVEL_SELECT.VALIDATION_MESSAGE'),
  targetLevel: z
    .string({ error: 'ONBOARDING:ASSESSMENT_FORM.TARGET_LEVEL_SELECT.VALIDATION_MESSAGE' })
    .min(1, 'ONBOARDING:ASSESSMENT_FORM.TARGET_LEVEL_SELECT.VALIDATION_MESSAGE')
    .max(50, 'ONBOARDING:ASSESSMENT_FORM.TARGET_LEVEL_SELECT.VALIDATION_MESSAGE'),
  dailyGoalMinutes: z
    .string({ error: 'ONBOARDING:ASSESSMENT_FORM.DAILY_GOAL_FIELD.VALIDATION_MESSAGE' })
    .refine(
      (value) => {
        const minutes = Number(value);

        return (
          value.trim().length > 0 &&
          Number.isInteger(minutes) &&
          minutes >= 1 &&
          minutes <= 2147483647
        );
      },
      { message: 'ONBOARDING:ASSESSMENT_FORM.DAILY_GOAL_FIELD.VALIDATION_MESSAGE' },
    ),
  preferredScript: z.enum(['ROMAJI', 'KANA', 'MIXED'], {
    error: 'ONBOARDING:ASSESSMENT_FORM.PREFERRED_SCRIPT_SELECT.VALIDATION_MESSAGE',
  }),
  weakSkillFocuses: z.array(
    z
      .string({ error: 'ONBOARDING:ASSESSMENT_FORM.WEAK_FOCUS_GROUP.VALIDATION_MESSAGE' })
      .max(100, 'ONBOARDING:ASSESSMENT_FORM.WEAK_FOCUS_GROUP.VALIDATION_MESSAGE')
      .refine((value) => value.trim().length > 0, {
        message: 'ONBOARDING:ASSESSMENT_FORM.WEAK_FOCUS_GROUP.VALIDATION_MESSAGE',
      }),
    { error: 'ONBOARDING:ASSESSMENT_FORM.WEAK_FOCUS_GROUP.VALIDATION_MESSAGE' },
  ),
  note: z
    .string({ error: 'ONBOARDING:ASSESSMENT_FORM.LEARNING_NOTE_FIELD.VALIDATION_MESSAGE' })
    .max(2000, 'ONBOARDING:ASSESSMENT_FORM.LEARNING_NOTE_FIELD.VALIDATION_MESSAGE'),
});

export type AssessmentFormData = z.infer<typeof assessmentFormDataSchema>;

export interface IOnboardingStore
  extends IDefaultFormStore<AssessmentFormData, AssessmentDraft>, IDisposableStore {
  readonly tracks: readonly SyllabusTrack[];

  readonly isLoading: boolean;

  readonly isLoaded: boolean;

  readonly isConfirming: boolean;

  readonly step: 'assessment' | 'review' | 'complete';

  readonly selectedKnownSkillClaims: readonly string[];

  readonly confirmation: OnboardingResult | null;

  readonly sessionExpired: boolean;

  load(): Promise<void>;

  editAssessment(): void;

  setKnownSkillClaim(skillCode: string, selected: boolean): void;

  confirm(): Promise<boolean>;
}
