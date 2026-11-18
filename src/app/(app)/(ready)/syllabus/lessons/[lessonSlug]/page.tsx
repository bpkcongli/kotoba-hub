import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { LessonOverview } from '@/frontend/syllabus/features';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('SHARED:CATALOG_ENTITIES.LESSON.LABEL');
}

export default async function LessonPage({ params }: { params: Promise<{ lessonSlug: string }> }) {
  const { lessonSlug } = await params;

  return <LessonOverview lessonSlug={lessonSlug} />;
}
