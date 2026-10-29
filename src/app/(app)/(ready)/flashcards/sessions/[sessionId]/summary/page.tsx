import type { Metadata } from 'next';
import { FlashcardSummaryScreen } from '@/frontend/flashcards/features';

export const metadata: Metadata = { title: 'Flashcard summary' };

export default async function FlashcardSummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <FlashcardSummaryScreen sessionId={sessionId} />;
}
