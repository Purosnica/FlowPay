'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  /** Título opcional encima del mensaje (I045). */
  title?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  message,
  title,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={
        className ??
        'rounded-lg border border-dashed border-stroke px-6 py-10 text-center dark:border-dark-3'
      }
      role="status"
    >
      {title ? (
        <p className="text-sm font-semibold text-dark dark:text-white">
          {title}
        </p>
      ) : null}
      <p
        className={
          title
            ? 'mt-1 text-sm text-gray-500 dark:text-gray-400'
            : 'text-sm text-gray-500 dark:text-gray-400'
        }
      >
        {message}
      </p>
      {action ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}
