import type { Metadata } from 'next';
import { FlashcardSessionScreen } from '@/frontend/flashcards/features';

export const metadata: Metadata = { title: 'Flashcard session' };

export default async function FlashcardSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <FlashcardSessionScreen sessionId={sessionId} />;
}
