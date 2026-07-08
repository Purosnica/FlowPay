'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export interface KpiCardProps {
  label: string;
  value: string;
  href?: string;
  alert?: boolean;
  compactValue?: boolean;
  sub?: string;
  className?: string;
  children?: ReactNode;
}

export function KpiCard({
  label,
  value,
  href,
  alert,
  compactValue = false,
  sub,
  className,
  children,
}: KpiCardProps) {
  const inner = (
    <div
      className={`min-w-0 rounded-lg border p-4 transition hover:border-primary dark:border-dark-3 ${
        alert
          ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
          : 'border-stroke'
      } ${className ?? ''}`}
    >
      <p className="truncate text-xs text-gray-500 sm:text-sm">{label}</p>
      <p
        className={`mt-1 font-bold tabular-nums leading-tight text-dark dark:text-white ${
          compactValue
            ? 'text-sm sm:text-base xl:text-lg'
            : 'text-lg sm:text-xl 2xl:text-2xl'
        }`}
        title={value}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      {children}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="min-w-0">
        {inner}
      </Link>
    );
  }

  return inner;
}
