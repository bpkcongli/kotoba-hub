'use client';

import { observer } from 'mobx-react-lite';
import { Select } from '@/frontend/shared/components/atoms';
import { errorMessage } from '@/frontend/shared/helpers/error-message';
import { useLocaleStore, useUiTranslations } from '@/frontend/shared/hooks';

export const ContentLanguage = observer(function ContentLanguage() {
  const t = useUiTranslations();

  const locale = useLocaleStore();
  if (!locale.localizedSyllabus) return null;

  return (
    <div className="space-y-2">
      <label className="flex flex-wrap items-center gap-3 text-body-sm">
        {t('SYLLABUS:CONTENT_LANGUAGE.LANGUAGE_SELECT.LABEL')}
        <Select
          containerClassName="w-auto max-w-full"
          className="border-muted-foreground text-body-sm"
          value={locale.preferences.contentLocale}
          disabled={locale.isSaving}
          onChange={(event) =>
            void locale.setContentLocale(event.target.value === 'id' ? 'id' : 'en')
          }>
          <option value="en">{t('SHARED:LANGUAGE_OPTIONS.ENGLISH.LABEL')}</option>
          <option value="id">{t('SHARED:LANGUAGE_OPTIONS.INDONESIAN.NATIVE_LABEL')}</option>
        </Select>
      </label>

      {locale.error && (
        <p role="alert" className="text-body-sm text-destructive">
          {errorMessage(locale.error, t)}
        </p>
      )}
    </div>
  );
});
