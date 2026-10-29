import type { Metadata } from 'next';
import { SyllabusMap } from '@/frontend/syllabus/features';

export const metadata: Metadata = { title: 'Syllabus' };

export default function SyllabusPage() {
  return <SyllabusMap />;
}
