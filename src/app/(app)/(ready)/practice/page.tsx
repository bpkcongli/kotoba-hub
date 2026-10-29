import type { Metadata } from 'next';
import { PracticeHub } from '@/frontend/practice/features';

export const metadata: Metadata = { title: 'Practice' };

export default function PracticePage() {
  return <PracticeHub />;
}
