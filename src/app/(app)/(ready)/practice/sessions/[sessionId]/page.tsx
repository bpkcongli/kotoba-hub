import type { Metadata } from 'next';
import { PracticeSessionScreen } from '@/frontend/practice/features';

export const metadata: Metadata = { title: 'Practice session' };

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <PracticeSessionScreen sessionId={sessionId} />;
}
