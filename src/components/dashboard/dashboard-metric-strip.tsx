'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface DashboardMetric {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  tone?: 'default' | 'warning' | 'danger' | 'success' | 'primary';
}

interface DashboardMetricStripProps {
  metrics: DashboardMetric[];
  className?: string;
}

const TONE_CLASS: Record<NonNullable<DashboardMetric['tone']>, string> = {
  default: 'bg-white dark:bg-gray-dark',
  warning: 'bg-amber-50 dark:bg-amber-950/25',
  danger: 'bg-red-50 dark:bg-red-950/25',
  success: 'bg-green-light-7 dark:bg-green/20',
  primary: 'bg-primary/[0.06] dark:bg-primary/10',
};

const VALUE_TONE: Record<NonNullable<DashboardMetric['tone']>, string> = {
  default: 'text-dark dark:text-white',
  warning: 'text-amber-800 dark:text-amber-300',
  danger: 'text-red-700 dark:text-red-300',
  success: 'text-green-dark dark:text-green',
  primary: 'text-primary',
};

function MetricCell({ metric }: { metric: DashboardMetric }) {
  const tone = metric.tone ?? 'default';
  const content = (
    <div
      className={cn(
        'flex h-full min-w-0 flex-col justify-center px-4 py-3 transition-colors',
        TONE_CLASS[tone],
        metric.href && 'hover:bg-primary/[0.08] dark:hover:bg-primary/15',
      )}
    >
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-5">
        {metric.label}
      </p>
      <p
        className={cn(
          'mt-1 truncate text-xl font-bold tabular-nums leading-none',
          VALUE_TONE[tone],
        )}
        title={metric.value}
      >
        {metric.value}
      </p>
      {metric.sub ? (
        <p className="mt-1 truncate text-xs text-gray-5">{metric.sub}</p>
      ) : null}
    </div>
  );

  if (metric.href) {
    return (
      <Link href={metric.href} className="min-w-0">
        {content}
      </Link>
    );
  }

  return content;
}

export function DashboardMetricStrip({
  metrics,
  className,
}: DashboardMetricStripProps) {
  if (metrics.length === 0) {
    return null;
  }

  const cols =
    metrics.length <= 3
      ? 'sm:grid-cols-3'
      : metrics.length === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : metrics.length === 5
          ? 'sm:grid-cols-3 lg:grid-cols-5'
          : metrics.length === 6
            ? 'sm:grid-cols-3 lg:grid-cols-6'
            : metrics.length === 7
              ? 'sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7'
              : 'sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark',
        className,
      )}
    >
      <div
        className={cn(
          'grid grid-cols-2 divide-x divide-y divide-stroke dark:divide-dark-3',
          cols,
        )}
      >
        {metrics.map((metric) => (
          <MetricCell key={`${metric.label}-${metric.value}`} metric={metric} />
        ))}
      </div>
    </div>
  );
}
