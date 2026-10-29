import type { Metadata } from 'next';
import { UnitDetail } from '@/frontend/syllabus/features';

export const metadata: Metadata = { title: 'Unit' };

export default async function UnitPage({ params }: { params: Promise<{ unitSlug: string }> }) {
  const { unitSlug } = await params;

  return <UnitDetail unitSlug={unitSlug} />;
}
