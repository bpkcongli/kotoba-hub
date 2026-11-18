import {
  BookOpen,
  ChartNoAxesCombined,
  Layers,
  LayoutDashboard,
  PencilLine,
  type LucideIcon,
} from 'lucide-react';
import type { UiMessageKey } from '@/shared/i18n';

export interface AppNavigationItem {
  href: '/dashboard' | '/syllabus' | '/flashcards' | '/practice' | '/progress';
  label: string;
  messageKey?: UiMessageKey;
  icon: LucideIcon;
  available: boolean;
}

export const APP_NAVIGATION: readonly AppNavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    messageKey: 'SHARED:APP_NAVIGATION.DASHBOARD_LINK.LABEL',
    icon: LayoutDashboard,
    available: true,
  },
  {
    href: '/syllabus',
    label: 'Syllabus',
    messageKey: 'SHARED:APP_NAVIGATION.SYLLABUS_LINK.LABEL',
    icon: BookOpen,
    available: true,
  },
  {
    href: '/flashcards',
    label: 'Flashcards',
    messageKey: 'SHARED:APP_NAVIGATION.FLASHCARDS_LINK.LABEL',
    icon: Layers,
    available: true,
  },
  {
    href: '/practice',
    label: 'Practice',
    messageKey: 'SHARED:APP_NAVIGATION.PRACTICE_LINK.LABEL',
    icon: PencilLine,
    available: true,
  },
  {
    href: '/progress',
    label: 'Progress',
    messageKey: 'SHARED:APP_NAVIGATION.PROGRESS_LINK.LABEL',
    icon: ChartNoAxesCombined,
    available: true,
  },
];

export function isNavigationActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
