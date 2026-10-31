'use client';

import { useEffect } from 'react';
import type { IProgressStore } from '@/frontend/progress/services/internal';

export function useProgressRefresh(store: IProgressStore) {
  useEffect(() => {
    void store.load();

    const refresh = () => {
      if (document.visibilityState === 'visible' && !store.accessIssue) void store.refresh();
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);

      store.dispose();
    };
  }, [store]);
}
