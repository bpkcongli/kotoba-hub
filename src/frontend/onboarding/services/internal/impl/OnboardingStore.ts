import {
  actionBound,
  computed,
  makeObservable,
  observable,
  observableRef,
  runInAction,
} from 'mobx';
import type {
  AssessmentDraft,
  AssessmentProfile,
  OnboardingResult,
  SyllabusTrack,
} from '@/frontend/onboarding/interfaces/entities';
import type { IOnboardingService } from '@/frontend/onboarding/services/external';
import {
  assessmentFormDataSchema,
  type AssessmentFormData,
  type IOnboardingStore,
} from '@/frontend/onboarding/services/internal/IOnboardingStore';
import { ApiException, ClientException } from '@/frontend/shared/exceptions';
import { presentError } from '@/frontend/shared/helpers';
import type { StoreError } from '@/frontend/shared/interfaces';

export class OnboardingStore implements IOnboardingStore {
  formData: AssessmentFormData = {
    currentLevel: 'BEGINNER',
    targetLevel: '',
    dailyGoalMinutes: '20',
    preferredScript: 'MIXED',
    weakSkillFocuses: [],
    note: '',
  };
  formErrors: Partial<Record<keyof AssessmentFormData, string>> = {};
  result: AssessmentDraft | null = null;
  confirmation: OnboardingResult | null = null;
  tracks: SyllabusTrack[] = [];
  selectedKnownSkillClaims: string[] = [];
  isLoading = false;
  isLoaded = false;
  isSubmitting = false;
  isConfirming = false;
  sessionExpired = false;
  error: StoreError | null = null;

  private controller: AbortController | null = null;

  constructor(private readonly service: IOnboardingService) {
    makeObservable(this, {
      formData: observableRef,
      formErrors: observableRef,
      result: observableRef,
      confirmation: observableRef,
      tracks: observableRef,
      selectedKnownSkillClaims: observableRef,
      isLoading: observable,
      isLoaded: observable,
      isSubmitting: observable,
      isConfirming: observable,
      sessionExpired: observable,
      error: observableRef,
      step: computed,
      load: actionBound,
      setFormData: actionBound,
      validateFormData: actionBound,
      submit: actionBound,
      editAssessment: actionBound,
      setKnownSkillClaim: actionBound,
      confirm: actionBound,
      dispose: actionBound,
    });
  }

  get step(): 'assessment' | 'review' | 'complete' {
    return this.confirmation ? 'complete' : this.result ? 'review' : 'assessment';
  }

  async load(): Promise<void> {
    if (this.isSubmitting || this.isConfirming) return;

    this.controller?.abort();

    const controller = new AbortController();
    this.controller = controller;

    this.isLoading = true;
    this.error = null;
    this.sessionExpired = false;

    try {
      const [tracks, profile] = await Promise.all([
        this.service.getTracks(controller.signal),
        this.service.getProfile(controller.signal),
      ]);

      runInAction(() => {
        if (!this.isCurrent(controller)) return;

        this.tracks = tracks;

        const saved = profile.learnerProfile;

        if (!this.isLoaded && saved) {
          this.formData = {
            currentLevel: saved.currentLevel ?? 'BEGINNER',
            targetLevel: saved.targetLevel,
            dailyGoalMinutes: String(saved.dailyGoalMinutes),
            preferredScript: saved.preferredScript,
            weakSkillFocuses: [...saved.weakSkillFocuses],
            note: '',
          };
        }

        if (!this.formData.targetLevel && tracks[0]) {
          this.formData = { ...this.formData, targetLevel: `JLPT_${tracks[0].curriculumLevel}` };
        }

        this.isLoaded = true;
      });
    } catch (error: unknown) {
      runInAction(() => {
        if (this.isCurrent(controller)) this.recordError(error);
      });
    } finally {
      runInAction(() => {
        if (this.controller === controller) {
          this.controller = null;
          this.isLoading = false;
        }
      });
    }
  }

  setFormData(patch: Partial<AssessmentFormData>): void {
    if (this.isSubmitting || this.isConfirming || this.confirmation) return;

    this.formData = {
      ...this.formData,
      ...patch,
      weakSkillFocuses: [...(patch.weakSkillFocuses ?? this.formData.weakSkillFocuses)],
    };

    this.result = null;
    this.selectedKnownSkillClaims = [];
    this.formErrors = {};
    this.error = null;
  }

  validateFormData(): boolean {
    const parsed = this.createAssessmentFormDataSchema().safeParse(this.formData);
    const errors: typeof this.formErrors = {};

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (typeof field === 'string' && Object.hasOwn(this.formData, field)) {
          const formField = field as keyof AssessmentFormData;

          errors[formField] ??= issue.message;
        }
      }
    }

    this.formErrors = errors;

    return parsed.success;
  }

  async submit(): Promise<void> {
    if (
      !this.isLoaded ||
      this.isLoading ||
      this.isSubmitting ||
      this.isConfirming ||
      this.confirmation ||
      !this.validateFormData()
    )
      return;

    const controller = new AbortController();
    this.controller = controller;

    this.isSubmitting = true;
    this.error = null;
    this.result = null;
    this.sessionExpired = false;

    const { note, ...form } = this.formData;
    const input = {
      ...form,
      dailyGoalMinutes: Number(form.dailyGoalMinutes),
      weakSkillFocuses: [...form.weakSkillFocuses],
      note,
    };

    try {
      const draft = await this.service.assess(input, controller.signal);

      runInAction(() => {
        if (!this.isCurrent(controller)) return;

        this.result = draft;
        this.selectedKnownSkillClaims = draft.suggestedKnownSkillClaims.map(
          (claim) => claim.skillCode,
        );
      });
    } catch (error: unknown) {
      runInAction(() => {
        if (this.isCurrent(controller)) this.recordError(error);
      });
    } finally {
      runInAction(() => {
        if (this.controller === controller) {
          this.controller = null;
          this.isSubmitting = false;
        }
      });
    }
  }

  editAssessment(): void {
    if (this.isConfirming || this.confirmation) return;

    this.result = null;
    this.selectedKnownSkillClaims = [];
    this.error = null;
    this.formErrors = {};
  }

  setKnownSkillClaim(skillCode: string, selected: boolean): void {
    if (
      this.isConfirming ||
      !this.result?.suggestedKnownSkillClaims.some((claim) => claim.skillCode === skillCode)
    )
      return;

    this.selectedKnownSkillClaims = selected
      ? [...new Set([...this.selectedKnownSkillClaims, skillCode])]
      : this.selectedKnownSkillClaims.filter((code) => code !== skillCode);
  }

  async confirm(): Promise<boolean> {
    if (!this.result || this.isSubmitting || this.isConfirming || this.confirmation) return false;

    const controller = new AbortController();
    this.controller = controller;

    this.isConfirming = true;
    this.error = null;
    this.sessionExpired = false;

    const profile: AssessmentProfile = this.result.draftProfile;
    const input = {
      ...profile,
      weakSkillFocuses: [...profile.weakSkillFocuses],
      knownSkillClaims: [...this.selectedKnownSkillClaims],
    };

    try {
      const confirmation = await this.service.confirm(input, controller.signal);
      let applied = false;

      runInAction(() => {
        if (this.isCurrent(controller)) {
          this.confirmation = confirmation;
          applied = true;
        }
      });

      return applied;
    } catch (error: unknown) {
      runInAction(() => {
        if (this.isCurrent(controller)) this.recordError(error);
      });

      return false;
    } finally {
      runInAction(() => {
        if (this.controller === controller) {
          this.controller = null;
          this.isConfirming = false;
        }
      });
    }
  }

  dispose(): void {
    this.controller?.abort();
    this.controller = null;

    this.isLoading = false;
    this.isSubmitting = false;
    this.isConfirming = false;
  }

  private createAssessmentFormDataSchema() {
    const publishedLevels = new Set(this.tracks.map((track) => `JLPT_${track.curriculumLevel}`));

    return assessmentFormDataSchema.extend({
      currentLevel: assessmentFormDataSchema.shape.currentLevel.refine(
        (level) => level === 'BEGINNER' || publishedLevels.has(level),
        { message: 'Choose an available current level or New to Japanese.' },
      ),

      targetLevel: assessmentFormDataSchema.shape.targetLevel.refine(
        (level) => publishedLevels.has(level),
        { message: 'Choose an available target level.' },
      ),
    });
  }

  private isCurrent(controller: AbortController): boolean {
    return this.controller === controller && !controller.signal.aborted;
  }

  private recordError(error: unknown): void {
    if (error instanceof ClientException && error.kind === 'cancelled') return;

    this.sessionExpired = error instanceof ApiException && error.failure.httpStatus === 401;
    this.error = presentError(error);

    const fields: typeof this.formErrors = {};

    for (const detail of this.error.fieldErrors) {
      if (Object.hasOwn(this.formData, detail.field))
        fields[detail.field as keyof AssessmentFormData] = detail.message;
    }

    this.formErrors = fields;
  }
}
