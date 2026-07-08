'use client';

import { Suspense, type ReactNode } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SearchParamsBoundaryProps {
  children: ReactNode;
}

export function SearchParamsBoundary({
  children,
}: SearchParamsBoundaryProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[12rem] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
