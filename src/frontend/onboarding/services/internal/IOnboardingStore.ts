import { z } from 'zod';
import type {
  AssessmentDraft,
  OnboardingResult,
  SyllabusTrack,
} from '@/frontend/onboarding/interfaces/entities';
import type { IDefaultFormStore, IDisposableStore } from '@/frontend/shared/interfaces/stores';

export const assessmentFormDataSchema = z.object({
  currentLevel: z
    .string({ error: 'Choose an available current level or New to Japanese.' })
    .min(1, 'Choose an available current level or New to Japanese.')
    .max(50, 'Choose an available current level or New to Japanese.'),

  targetLevel: z
    .string({ error: 'Choose an available target level.' })
    .min(1, 'Choose an available target level.')
    .max(50, 'Choose an available target level.'),

  dailyGoalMinutes: z
    .string({ error: 'Enter a whole number of minutes greater than zero.' })
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
      { message: 'Enter a whole number of minutes greater than zero.' },
    ),

  preferredScript: z.enum(['ROMAJI', 'KANA', 'MIXED'], {
    error: 'Choose a script preference.',
  }),

  weakSkillFocuses: z.array(
    z
      .string({ error: 'Each focus must contain between 1 and 100 characters.' })
      .max(100, 'Each focus must contain between 1 and 100 characters.')
      .refine((value) => value.trim().length > 0, {
        message: 'Each focus must contain between 1 and 100 characters.',
      }),
    { error: 'Each focus must contain between 1 and 100 characters.' },
  ),

  note: z
    .string({ error: 'Keep your note within 2,000 characters.' })
    .max(2000, 'Keep your note within 2,000 characters.'),
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
