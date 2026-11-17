'use client';

import { observer } from 'mobx-react-lite';
import { useLocaleStore } from '@/frontend/shared/hooks';

export const ContentLanguage = observer(function ContentLanguage() {
  const locale = useLocaleStore();
  if (!locale.localizedSyllabus) return null;

  return (
    <div className="space-y-2">
      <label className="flex flex-wrap items-center gap-3 text-body-sm">
        Content language
        <select
          className="min-h-11 rounded-md border border-border bg-card px-3 text-foreground outline-none focus-visible:focus-ring"
          value={locale.preferences.contentLocale}
          disabled={locale.isSaving}
          onChange={(event) =>
            void locale.setContentLocale(event.target.value === 'id' ? 'id' : 'en')
          }>
          <option value="en">English</option>
          <option value="id">Bahasa Indonesia</option>
        </select>
      </label>

      {locale.error && (
        <p role="alert" className="text-body-sm text-destructive">
          {locale.error.message}
        </p>
      )}
    </div>
  );
});
