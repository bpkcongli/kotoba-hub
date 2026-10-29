'use client';

import { observer } from 'mobx-react-lite';
import { levelLabel, scriptLabel } from '@/frontend/onboarding/helpers';
import { useOnboardingStore } from '@/frontend/onboarding/hooks';
import { Button } from '@/frontend/shared/components/atoms';

export const AssessmentReview = observer(function AssessmentReview({
  onConfirm,
}: {
  onConfirm: () => void;
}) {
  const store = useOnboardingStore();
  if (!store.result) return null;

  const draft = store.result;
  const profile = draft.draftProfile;

  return (
    <div className="space-y-6">
      <dl className="divide-y divide-border-subtle">
        {[
          ['Current level', levelLabel(profile.currentLevel)],
          ['Target level', levelLabel(profile.targetLevel)],
          ['Daily goal', `${profile.dailyGoalMinutes} minutes`],
          ['Preferred script', scriptLabel(profile.preferredScript)],
          ['Focus areas', profile.weakSkillFocuses.join(', ') || 'No focus areas selected'],
        ].map(([label, value]) => (
          <div key={label} className="space-y-1 py-3 first:pt-0">
            <dt className="text-body-sm text-muted-foreground">{label}</dt>
            <dd className="font-medium wrap-break-word">{value}</dd>
          </div>
        ))}
      </dl>

      <fieldset disabled={store.isConfirming} className="space-y-2">
        <legend className="text-body-sm font-semibold">Skills you already know</legend>
        {draft.suggestedKnownSkillClaims.length > 0 ? (
          <>
            <p className="text-body-sm text-muted-foreground">
              Keep only the skills you recognize. These claims do not mark lessons complete or
              increase measured mastery.
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
                      ? 'Suggested from your note'
                      : 'Suggested from your assessment'}
                  </span>
                </span>
              </label>
            ))}
          </>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            No known skills were suggested. You can confirm your preferences as they are.
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button onClick={onConfirm} disabled={store.isConfirming}>
          {store.isConfirming ? 'Saving profile…' : 'Confirm study plan'}
        </Button>
        <Button variant="secondary" onClick={store.editAssessment} disabled={store.isConfirming}>
          Edit assessment
        </Button>
      </div>

      {store.isConfirming && (
        <p role="status" className="text-body-sm text-muted-foreground">
          Saving your confirmed learning preferences…
        </p>
      )}
    </div>
  );
});
