import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/frontend/shared/components/atoms';

export interface StatePanelProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyStatePanel({ title, description, action }: StatePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      {action && <CardContent>{action}</CardContent>}
    </Card>
  );
}

export function ErrorStatePanel({ title, description, action }: StatePanelProps) {
  return (
    <Card role="alert">
      <CardHeader>
        <div className="flex items-center gap-3">
          <CircleAlert aria-hidden="true" className="size-5 shrink-0 text-destructive" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      {action && <CardContent>{action}</CardContent>}
    </Card>
  );
}

export function LoadingPanel({ label = 'Loading your study space…' }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">{label}</span>

      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3 max-w-sm" />
        <Skeleton className="h-5 w-full max-w-lg" />
      </div>

      <Card aria-hidden="true">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
