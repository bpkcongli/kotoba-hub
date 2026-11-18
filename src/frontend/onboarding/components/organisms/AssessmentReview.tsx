'use client';

import { observer } from 'mobx-react-lite';
import { useLocale } from 'next-intl';
import { levelLabel, scriptLabel, weakFocusOptions } from '@/frontend/onboarding/helpers';
import { useOnboardingStore } from '@/frontend/onboarding/hooks';
import { Button } from '@/frontend/shared/components/atoms';
import { useUiTranslations } from '@/frontend/shared/hooks';

export const AssessmentReview = observer(function AssessmentReview({
  onConfirm,
}: {
  onConfirm: () => void;
}) {
  const t = useUiTranslations();
  const uiLocale = useLocale() === 'id' ? 'id' : 'en';

  const store = useOnboardingStore();
  if (!store.result) return null;

  const draft = store.result;
  const profile = draft.draftProfile;

  return (
    <div className="space-y-6">
      <dl className="divide-y divide-border-subtle">
        {[
          [
            t('ONBOARDING:ASSESSMENT_FORM.CURRENT_LEVEL_SELECT.LABEL'),
            levelLabel(profile.currentLevel, uiLocale),
          ],
          [
            t('ONBOARDING:ASSESSMENT_FORM.TARGET_LEVEL_SELECT.LABEL'),
            levelLabel(profile.targetLevel, uiLocale),
          ],
          [
            t('ONBOARDING:ASSESSMENT_REVIEW.DAILY_GOAL.LABEL'),
            t('ONBOARDING:ASSESSMENT_REVIEW.DAILY_GOAL.VALUE_LABEL', {
              count: profile.dailyGoalMinutes,
            }),
          ],
          [
            t('ONBOARDING:ASSESSMENT_FORM.PREFERRED_SCRIPT_SELECT.LABEL'),
            scriptLabel(profile.preferredScript, uiLocale),
          ],
          [
            t('ONBOARDING:ASSESSMENT_REVIEW.FOCUS_AREAS.LABEL'),
            profile.weakSkillFocuses
              .map((value) => {
                const focus = weakFocusOptions.find((focus) => focus.value === value);

                return focus ? t(focus.label) : value;
              })
              .join(', ') || t('ONBOARDING:ASSESSMENT_REVIEW.EMPTY_FOCUS_AREAS.LABEL'),
          ],
        ].map(([label, value]) => (
          <div key={label} className="space-y-1 py-3 first:pt-0">
            <dt className="text-body-sm text-muted-foreground">{label}</dt>
            <dd className="font-medium wrap-break-word">{value}</dd>
          </div>
        ))}
      </dl>

      <fieldset disabled={store.isConfirming} className="space-y-2">
        <legend className="text-body-sm font-semibold">
          {t('ONBOARDING:ASSESSMENT_REVIEW.KNOWN_SKILLS_GROUP.LABEL')}
        </legend>

        {draft.suggestedKnownSkillClaims.length > 0 ? (
          <>
            <p className="text-body-sm text-muted-foreground">
              {t('ONBOARDING:ASSESSMENT_REVIEW.KNOWN_SKILLS_GROUP.HELP_TEXT')}
            </p>

            {draft.suggestedKnownSkillClaims.map((claim) => (
              <label
                key={claim.skillCode}
                className="flex min-h-11 items-start gap-3 py-3 text-body-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:focus-ring"
                  checked={store.selectedKnownSkillClaims.includes(claim.skillCode)}
                  onChange={(event) =>
                    store.setKnownSkillClaim(claim.skillCode, event.target.checked)
                  }
                />
                <span className="min-w-0 wrap-break-word">
                  <span className="block font-medium">{claim.title}</span>
                  <span className="text-muted-foreground">
                    {claim.source === 'ai_note'
                      ? t('ONBOARDING:ASSESSMENT_REVIEW.KNOWN_SKILL_SOURCE.NOTE_LABEL')
                      : t('ONBOARDING:ASSESSMENT_REVIEW.KNOWN_SKILL_SOURCE.ASSESSMENT_LABEL')}
                  </span>
                </span>
              </label>
            ))}
          </>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            {t('ONBOARDING:ASSESSMENT_REVIEW.EMPTY_KNOWN_SKILLS.DESCRIPTION')}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button onClick={onConfirm} disabled={store.isConfirming}>
          {store.isConfirming
            ? t('ONBOARDING:ASSESSMENT_REVIEW.CONFIRM_STUDY_PLAN_BUTTON.LOADING_LABEL')
            : t('ONBOARDING:ASSESSMENT_REVIEW.CONFIRM_STUDY_PLAN_BUTTON.LABEL')}
        </Button>
        <Button variant="secondary" onClick={store.editAssessment} disabled={store.isConfirming}>
          {t('ONBOARDING:ASSESSMENT_REVIEW.EDIT_ASSESSMENT_BUTTON.LABEL')}
        </Button>
      </div>

      {store.isConfirming && (
        <p role="status" className="text-body-sm text-muted-foreground">
          {t('ONBOARDING:ASSESSMENT_REVIEW.CONFIRMATION_STATUS.DESCRIPTION')}
        </p>
      )}
    </div>
  );
});
