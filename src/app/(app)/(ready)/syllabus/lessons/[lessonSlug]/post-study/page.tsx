import type { Metadata } from 'next';
import { LessonPostStudy } from '@/frontend/practice/features';

export const metadata: Metadata = { title: 'Post-study quiz' };

export default async function LessonQuizPage({
  params,
}: {
  params: Promise<{ lessonSlug: string }>;
}) {
  const { lessonSlug } = await params;

  return <LessonPostStudy lessonSlug={lessonSlug} />;
}
