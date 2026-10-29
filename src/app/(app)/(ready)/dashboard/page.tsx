import type { Metadata } from 'next';
import { Dashboard } from '@/frontend/dashboard/features';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return <Dashboard />;
}
