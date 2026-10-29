import type { Metadata } from 'next';
import { FlashcardsHub } from '@/frontend/flashcards/features';

export const metadata: Metadata = { title: 'Flashcards' };

export default function FlashcardsPage() {
  return <FlashcardsHub />;
}
