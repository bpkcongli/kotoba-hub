import type { StoreError } from '@/frontend/shared/interfaces/StoreError';

export type FormErrors<TForm extends object> = Partial<Record<keyof TForm, string>>;

export interface IDefaultFormStore<TForm extends object, TResult> {
  readonly formData: Readonly<TForm>;

  readonly formErrors: FormErrors<TForm>;

  readonly isSubmitting: boolean;

  readonly error: StoreError | null;

  readonly result: TResult | null;

  setFormData(patch: Partial<TForm>): void;

  validateFormData(): boolean;

  submit(): Promise<void>;
}
