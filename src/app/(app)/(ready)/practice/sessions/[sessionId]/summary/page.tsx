import type { Metadata } from 'next';
import { PracticeSummaryScreen } from '@/frontend/practice/features';

export const metadata: Metadata = { title: 'Practice summary' };

export default async function PracticeSummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <PracticeSummaryScreen sessionId={sessionId} />;
}
