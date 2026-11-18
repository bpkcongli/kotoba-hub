import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { PracticeSummaryScreen } from '@/frontend/practice/features';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('PRACTICE:PRACTICE_SUMMARY.PAGE.TITLE');
}

export default async function PracticeSummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <PracticeSummaryScreen sessionId={sessionId} />;
}
