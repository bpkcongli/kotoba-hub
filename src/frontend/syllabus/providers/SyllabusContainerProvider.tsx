'use client';

import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';
import { useLocaleStore } from '@/frontend/shared/hooks';
import { FeatureContainerProvider } from '@/frontend/shared/providers';
import { ContentLanguage } from '@/frontend/syllabus/components/organisms';
import { createSyllabusContainer } from '@/frontend/syllabus/services';

export const SyllabusContainerProvider = observer(function SyllabusContainerProvider({
  children,
  scopeKey = 'syllabus',
}: {
  children: ReactNode;
  scopeKey?: string;
}) {
  const locale = useLocaleStore();

  return (
    <FeatureContainerProvider
      scopeKey={`${scopeKey}:${locale.localizedSyllabus}:${locale.preferences.contentLocale}`}
      createContainer={createSyllabusContainer}>
      <div className="space-y-6">
        <ContentLanguage />

        {children}
      </div>
    </FeatureContainerProvider>
  );
});
