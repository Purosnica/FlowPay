'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={
        className ??
        'rounded-lg border border-dashed border-stroke px-6 py-10 text-center dark:border-dark-3'
      }
    >
      <p className="text-sm text-gray-500">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
