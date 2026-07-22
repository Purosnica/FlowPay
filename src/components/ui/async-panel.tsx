'use client';

import type { ReactNode } from 'react';
import { LoadingSpinner } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';

interface AsyncPanelProps {
  isLoading?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  /** CTA accionable cuando está vacío (I038 / I045). */
  emptyAction?: ReactNode;
  loadingMessage?: string;
  errorMessage?: string;
  children: ReactNode;
}

export function AsyncPanel({
  isLoading = false,
  error = null,
  isEmpty = false,
  emptyMessage = 'Sin datos para mostrar.',
  emptyAction,
  loadingMessage = 'Cargando...',
  errorMessage = 'No se pudo cargar la información.',
  children,
}: AsyncPanelProps) {
  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 py-6 text-sm text-gray-500"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <LoadingSpinner size="sm" />
        {loadingMessage}
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-4 text-sm text-red-600" role="alert">
        {errorMessage}
      </p>
    );
  }

  if (isEmpty) {
    return <EmptyState message={emptyMessage} action={emptyAction} />;
  }

  return <>{children}</>;
}
