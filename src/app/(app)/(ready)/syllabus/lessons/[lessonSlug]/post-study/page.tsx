import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { LessonPostStudy } from '@/frontend/practice/features';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('PRACTICE:LESSON_POST_STUDY.PAGE.QUIZ_TITLE');
}

export default async function LessonQuizPage({
  params,
}: {
  params: Promise<{ lessonSlug: string }>;
}) {
  const { lessonSlug } = await params;

  return <LessonPostStudy lessonSlug={lessonSlug} />;
}
