import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { PracticeHub } from '@/frontend/practice/features';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('SHARED:APP_NAVIGATION.PRACTICE_LINK.LABEL');
}

export default function PracticePage() {
  return <PracticeHub />;
}
