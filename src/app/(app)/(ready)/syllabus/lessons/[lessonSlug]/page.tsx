import type { Metadata } from 'next';
import { LessonOverview } from '@/frontend/syllabus/features';

export const metadata: Metadata = { title: 'Lesson' };

export default async function LessonPage({ params }: { params: Promise<{ lessonSlug: string }> }) {
  const { lessonSlug } = await params;

  return <LessonOverview lessonSlug={lessonSlug} />;
}
