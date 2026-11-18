'use client';

import { observer } from 'mobx-react-lite';
import { useLocale } from 'next-intl';
import { formControlClass, levelLabel, weakFocusOptions } from '@/frontend/onboarding/helpers';
import { useOnboardingStore } from '@/frontend/onboarding/hooks';
import { Button } from '@/frontend/shared/components/atoms';
import { validationMessage } from '@/frontend/shared/helpers/error-message';
import { useUiTranslations } from '@/frontend/shared/hooks';

export const AssessmentForm = observer(function AssessmentForm() {
  const t = useUiTranslations();
  const uiLocale = useLocale() === 'id' ? 'id' : 'en';

  const store = useOnboardingStore();

  const form = store.formData;
  const errors = store.formErrors;
  const unavailableCurrentLevel =
    form.currentLevel !== 'BEGINNER' &&
    !store.tracks.some((track) => `JLPT_${track.curriculumLevel}` === form.currentLevel);
  const currentLevelError =
    errors.currentLevel ??
    (unavailableCurrentLevel
      ? t('ONBOARDING:ASSESSMENT_FORM.CURRENT_LEVEL_SELECT.UNAVAILABLE_MESSAGE')
      : undefined);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void store.submit();
      }}
      className="space-y-6">
      <fieldset disabled={store.isSubmitting} className="space-y-6">
        <legend className="sr-only">{t('ONBOARDING:ASSESSMENT_FORM.FORM.ARIA_LABEL')}</legend>

        <div className="space-y-2">
          <label htmlFor="current-level" className="text-body-sm font-semibold">
            {t('ONBOARDING:ASSESSMENT_FORM.CURRENT_LEVEL_SELECT.LABEL')}
          </label>

          <select
            id="current-level"
            className={formControlClass}
            value={form.currentLevel}
            onChange={(event) => store.setFormData({ currentLevel: event.target.value })}
            aria-invalid={Boolean(currentLevelError)}
            aria-describedby={currentLevelError ? 'current-level-error' : undefined}>
            <option value="BEGINNER">
              {t('ONBOARDING:ASSESSMENT_FORM.CURRENT_LEVEL_SELECT.BEGINNER_OPTION_LABEL')}
            </option>

            {unavailableCurrentLevel && (
              <option value={form.currentLevel} disabled>
                {levelLabel(form.currentLevel, uiLocale)}{' '}
                {t('ONBOARDING:ASSESSMENT_FORM.CURRENT_LEVEL_SELECT.UNAVAILABLE_SUFFIX')}
              </option>
            )}

            {store.tracks.map((track) => (
              <option key={track.id} value={`JLPT_${track.curriculumLevel}`}>
                {levelLabel(`JLPT_${track.curriculumLevel}`, uiLocale)}
              </option>
            ))}
          </select>

          {currentLevelError && (
            <p id="current-level-error" className="text-body-sm text-destructive">
              {validationMessage(currentLevelError, t)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="target-level" className="text-body-sm font-semibold">
            {t('ONBOARDING:ASSESSMENT_FORM.TARGET_LEVEL_SELECT.LABEL')}
          </label>

          <select
            id="target-level"
            className={formControlClass}
            value={form.targetLevel}
            onChange={(event) => store.setFormData({ targetLevel: event.target.value })}
            aria-invalid={Boolean(errors.targetLevel)}
            aria-describedby={`target-level-help${errors.targetLevel ? ' target-level-error' : ''}`}>
            <option value="">
              {t('ONBOARDING:ASSESSMENT_FORM.TARGET_LEVEL_SELECT.PLACEHOLDER')}
            </option>

            {store.tracks.map((track) => (
              <option key={track.id} value={`JLPT_${track.curriculumLevel}`}>
                {levelLabel(`JLPT_${track.curriculumLevel}`, uiLocale)}
              </option>
            ))}
          </select>

          <p id="target-level-help" className="text-body-sm text-muted-foreground">
            {t('ONBOARDING:ASSESSMENT_FORM.TARGET_LEVEL_SELECT.HELP_TEXT')}
          </p>

          {errors.targetLevel && (
            <p id="target-level-error" className="text-body-sm text-destructive">
              {validationMessage(errors.targetLevel, t)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="daily-goal" className="text-body-sm font-semibold">
            {t('ONBOARDING:ASSESSMENT_FORM.DAILY_GOAL_FIELD.LABEL')}
          </label>

          <input
            id="daily-goal"
            type="number"
            inputMode="numeric"
            min="1"
            max="2147483647"
            step="1"
            className={formControlClass}
            value={form.dailyGoalMinutes}
            onChange={(event) => store.setFormData({ dailyGoalMinutes: event.target.value })}
            aria-invalid={Boolean(errors.dailyGoalMinutes)}
            aria-describedby={errors.dailyGoalMinutes ? 'daily-goal-error' : undefined}
          />

          {errors.dailyGoalMinutes && (
            <p id="daily-goal-error" className="text-body-sm text-destructive">
              {validationMessage(errors.dailyGoalMinutes, t)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="preferred-script" className="text-body-sm font-semibold">
            {t('ONBOARDING:ASSESSMENT_FORM.PREFERRED_SCRIPT_SELECT.LABEL')}
          </label>

          <select
            id="preferred-script"
            className={formControlClass}
            value={form.preferredScript}
            onChange={(event) =>
              store.setFormData({
                preferredScript: event.target.value as typeof form.preferredScript,
              })
            }
            aria-invalid={Boolean(errors.preferredScript)}
            aria-describedby={`preferred-script-help${errors.preferredScript ? ' preferred-script-error' : ''}`}>
            <option value="ROMAJI">{t('SHARED:SCRIPT_OPTIONS.ROMAJI.LABEL')}</option>
            <option value="KANA">{t('SHARED:SCRIPT_OPTIONS.KANA.LABEL')}</option>
            <option value="MIXED">{t('SHARED:SCRIPT_OPTIONS.MIXED.LABEL')}</option>
          </select>

          <p id="preferred-script-help" className="text-body-sm text-muted-foreground">
            {t('ONBOARDING:ASSESSMENT_FORM.PREFERRED_SCRIPT_SELECT.HELP_TEXT')}
          </p>

          {errors.preferredScript && (
            <p id="preferred-script-error" className="text-body-sm text-destructive">
              {validationMessage(errors.preferredScript, t)}
            </p>
          )}
        </div>

        <fieldset aria-describedby={errors.weakSkillFocuses ? 'weak-focus-error' : undefined}>
          <legend className="mb-2 text-body-sm font-semibold">
            {t('ONBOARDING:ASSESSMENT_FORM.WEAK_FOCUS_GROUP.LABEL')}
          </legend>

          <div className="flex flex-wrap gap-2">
            {weakFocusOptions.map((focus) => (
              <label
                key={focus.value}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-body-sm ${form.weakSkillFocuses.includes(focus.value) ? 'border-primary bg-secondary' : 'border-muted-foreground bg-card'}`}>
                <input
                  type="checkbox"
                  className="size-5 shrink-0 accent-primary focus-visible:focus-ring"
                  checked={form.weakSkillFocuses.includes(focus.value)}
                  onChange={(event) =>
                    store.setFormData({
                      weakSkillFocuses: event.target.checked
                        ? [...form.weakSkillFocuses, focus.value]
                        : form.weakSkillFocuses.filter((value) => value !== focus.value),
                    })
                  }
                />
                {t(focus.label)}
              </label>
            ))}
          </div>

          {errors.weakSkillFocuses && (
            <p id="weak-focus-error" className="text-body-sm text-destructive">
              {validationMessage(errors.weakSkillFocuses, t)}
            </p>
          )}
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="learning-note" className="text-body-sm font-semibold">
            {t('ONBOARDING:ASSESSMENT_FORM.LEARNING_NOTE_FIELD.LABEL')}
          </label>

          <textarea
            id="learning-note"
            rows={4}
            maxLength={2000}
            className={formControlClass}
            value={form.note}
            onChange={(event) => store.setFormData({ note: event.target.value })}
            aria-invalid={Boolean(errors.note)}
            aria-describedby={`learning-note-help${errors.note ? ' learning-note-error' : ''}`}
          />

          <p id="learning-note-help" className="text-body-sm text-muted-foreground">
            {t('ONBOARDING:ASSESSMENT_FORM.LEARNING_NOTE_FIELD.HELP_TEXT')}
          </p>

          {errors.note && (
            <p id="learning-note-error" className="text-body-sm text-destructive">
              {validationMessage(errors.note, t)}
            </p>
          )}
        </div>
      </fieldset>

      <Button type="submit" disabled={store.isSubmitting} className="w-full sm:w-auto">
        {store.isSubmitting
          ? t('ONBOARDING:ASSESSMENT_FORM.REVIEW_STUDY_PLAN_BUTTON.LOADING_LABEL')
          : t('ONBOARDING:ASSESSMENT_FORM.REVIEW_STUDY_PLAN_BUTTON.LABEL')}
      </Button>

      {store.isSubmitting && (
        <p role="status" className="text-body-sm text-muted-foreground">
          {t('ONBOARDING:ASSESSMENT_FORM.DRAFT_STATUS.DESCRIPTION')}
        </p>
      )}
    </form>
  );
});
