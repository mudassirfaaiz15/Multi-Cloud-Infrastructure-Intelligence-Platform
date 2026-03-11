import { cn } from '@/app/components/ui/utils';

interface SkeletonProps {
  className?: string;
}

/** Base shimmer skeleton block */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} />
  );
}

/** Full stat card skeleton matching the StatCard layout */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/** Chart card skeleton */
export function ChartSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-6">
      {title && <Skeleton className="h-5 w-40 mb-6" />}
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

/** Table row skeleton */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${i === 0 ? 'w-32' : 'w-20'}`} />
        </td>
      ))}
    </tr>
  );
}

/** Full page skeleton for a dashboard-style page */
export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}

/** List page skeleton */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-20" />)}
        </div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: rows }).map((_, i) => <TableRowSkeleton key={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Inline sparkline placeholder */
export function SparklineSkeleton() {
  return <Skeleton className="h-8 w-20" />;
}
