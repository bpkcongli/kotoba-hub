import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { UnitDetail } from '@/frontend/syllabus/features';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('SHARED:CATALOG_ENTITIES.UNIT.LABEL');
}

export default async function UnitPage({ params }: { params: Promise<{ unitSlug: string }> }) {
  const { unitSlug } = await params;

  return <UnitDetail unitSlug={unitSlug} />;
}
