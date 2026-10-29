'use client';

import { observer } from 'mobx-react-lite';
import { formControlClass, levelLabel, weakFocusOptions } from '@/frontend/onboarding/helpers';
import { useOnboardingStore } from '@/frontend/onboarding/hooks';
import { Button } from '@/frontend/shared/components/atoms';

export const AssessmentForm = observer(function AssessmentForm() {
  const store = useOnboardingStore();

  const form = store.formData;
  const errors = store.formErrors;
  const unavailableCurrentLevel =
    form.currentLevel !== 'BEGINNER' &&
    !store.tracks.some((track) => `JLPT_${track.curriculumLevel}` === form.currentLevel);
  const currentLevelError =
    errors.currentLevel ??
    (unavailableCurrentLevel
      ? 'Your saved current level is no longer available. Choose an available level or New to Japanese.'
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
        <legend className="sr-only">Your learning preferences</legend>
        <div className="space-y-2">
          <label htmlFor="current-level" className="text-body-sm font-semibold">
            Current level
          </label>
          <select
            id="current-level"
            className={formControlClass}
            value={form.currentLevel}
            onChange={(event) => store.setFormData({ currentLevel: event.target.value })}
            aria-invalid={Boolean(currentLevelError)}
            aria-describedby={currentLevelError ? 'current-level-error' : undefined}>
            <option value="BEGINNER">New to Japanese</option>
            {unavailableCurrentLevel && (
              <option value={form.currentLevel} disabled>
                {levelLabel(form.currentLevel)} (unavailable)
              </option>
            )}

            {store.tracks.map((track) => (
              <option key={track.id} value={`JLPT_${track.curriculumLevel}`}>
                {levelLabel(`JLPT_${track.curriculumLevel}`)}
              </option>
            ))}
          </select>
          {currentLevelError && (
            <p id="current-level-error" className="text-body-sm text-destructive">
              {currentLevelError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="target-level" className="text-body-sm font-semibold">
            Target level
          </label>
          <select
            id="target-level"
            className={formControlClass}
            value={form.targetLevel}
            onChange={(event) => store.setFormData({ targetLevel: event.target.value })}
            aria-invalid={Boolean(errors.targetLevel)}
            aria-describedby={`target-level-help${errors.targetLevel ? ' target-level-error' : ''}`}>
            <option value="">Choose a target</option>
            {store.tracks.map((track) => (
              <option key={track.id} value={`JLPT_${track.curriculumLevel}`}>
                {levelLabel(`JLPT_${track.curriculumLevel}`)}
              </option>
            ))}
          </select>
          <p id="target-level-help" className="text-body-sm text-muted-foreground">
            Only levels with published lessons are available.
          </p>
          {errors.targetLevel && (
            <p id="target-level-error" className="text-body-sm text-destructive">
              {errors.targetLevel}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="daily-goal" className="text-body-sm font-semibold">
            Daily study goal (minutes)
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
              {errors.dailyGoalMinutes}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="preferred-script" className="text-body-sm font-semibold">
            Preferred script
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
            <option value="ROMAJI">Romaji</option>
            <option value="KANA">Kana</option>
            <option value="MIXED">Mixed scripts</option>
          </select>
          <p id="preferred-script-help" className="text-body-sm text-muted-foreground">
            This saves a preference. Activities may use their own script settings.
          </p>
          {errors.preferredScript && (
            <p id="preferred-script-error" className="text-body-sm text-destructive">
              {errors.preferredScript}
            </p>
          )}
        </div>

        <fieldset aria-describedby={errors.weakSkillFocuses ? 'weak-focus-error' : undefined}>
          <legend className="mb-2 text-body-sm font-semibold">Areas to focus on (optional)</legend>
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
                {focus.label}
              </label>
            ))}
          </div>

          {errors.weakSkillFocuses && (
            <p id="weak-focus-error" className="text-body-sm text-destructive">
              {errors.weakSkillFocuses}
            </p>
          )}
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="learning-note" className="text-body-sm font-semibold">
            What have you studied? (optional)
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
            A note uses AI to suggest skills for your review. Leave it blank to continue without AI.
            Maximum 2,000 characters.
          </p>
          {errors.note && (
            <p id="learning-note-error" className="text-body-sm text-destructive">
              {errors.note}
            </p>
          )}
        </div>
      </fieldset>

      <Button type="submit" disabled={store.isSubmitting} className="w-full sm:w-auto">
        {store.isSubmitting ? 'Preparing your draft…' : 'Review study plan'}
      </Button>
      {store.isSubmitting && (
        <p role="status" className="text-body-sm text-muted-foreground">
          Preparing a draft. Your profile has not been saved.
        </p>
      )}
    </form>
  );
});
