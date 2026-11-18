import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { FlashcardSummaryScreen } from '@/frontend/flashcards/features';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('FLASHCARDS:FLASHCARD_SUMMARY.PAGE.TITLE');
}

export default async function FlashcardSummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <FlashcardSummaryScreen sessionId={sessionId} />;
}
