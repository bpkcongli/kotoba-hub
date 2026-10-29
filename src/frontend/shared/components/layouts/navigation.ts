import {
  BookOpen,
  ChartNoAxesCombined,
  Layers,
  LayoutDashboard,
  PencilLine,
  type LucideIcon,
} from 'lucide-react';

export interface AppNavigationItem {
  href: '/dashboard' | '/syllabus' | '/flashcards' | '/practice' | '/progress';
  label: string;
  icon: LucideIcon;
  available: boolean;
}

export const APP_NAVIGATION: readonly AppNavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, available: true },
  { href: '/syllabus', label: 'Syllabus', icon: BookOpen, available: true },
  { href: '/flashcards', label: 'Flashcards', icon: Layers, available: false },
  { href: '/practice', label: 'Practice', icon: PencilLine, available: false },
  { href: '/progress', label: 'Progress', icon: ChartNoAxesCombined, available: false },
];

export function isNavigationActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
