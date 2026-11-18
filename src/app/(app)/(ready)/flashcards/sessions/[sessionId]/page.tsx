import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { FlashcardSessionScreen } from '@/frontend/flashcards/features';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('FLASHCARDS:FLASHCARD_SESSION.PAGE.TITLE');
}

export default async function FlashcardSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <FlashcardSessionScreen sessionId={sessionId} />;
}
