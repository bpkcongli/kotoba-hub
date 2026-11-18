import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { SyllabusMap } from '@/frontend/syllabus/features';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('SHARED:APP_NAVIGATION.SYLLABUS_LINK.LABEL');
}

export default function SyllabusPage() {
  return <SyllabusMap />;
}
