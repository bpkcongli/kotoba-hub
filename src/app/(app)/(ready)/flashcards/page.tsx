import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { FlashcardsHub } from '@/frontend/flashcards/features';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('SHARED:APP_NAVIGATION.FLASHCARDS_LINK.LABEL');
}

export default function FlashcardsPage() {
  return <FlashcardsHub />;
}
