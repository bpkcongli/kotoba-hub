'use client';

import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel } from '@/frontend/shared/components/organisms';

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <ErrorStatePanel
      title="Your study space could not be loaded"
      description="Please try again to load this page."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
