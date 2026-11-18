import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { PracticeSessionScreen } from '@/frontend/practice/features';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('PRACTICE:PRACTICE_SESSION.PAGE.TITLE');
}

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <PracticeSessionScreen sessionId={sessionId} />;
}
