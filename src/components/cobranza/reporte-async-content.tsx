'use client';

import type { ReactNode } from 'react';
import { AsyncPanel } from '@/components/ui/async-panel';
import { EmptyState } from '@/components/ui/empty-state';

interface ReporteAsyncContentProps {
  isLoading: boolean;
  error: Error | null | undefined;
  hasData: boolean;
  children: ReactNode;
  emptyMessage?: string;
}

/**
 * Carga/error via AsyncPanel. Si la query terminó sin payload,
 * muestra empty — no lo trata como fallo de carga.
 */
export function ReporteAsyncContent({
  isLoading,
  error,
  hasData,
  children,
  emptyMessage = 'Sin datos para los filtros seleccionados.',
}: ReporteAsyncContentProps) {
  const errorMessage =
    error?.message?.trim() ||
    'No se pudo cargar la información.';

  return (
    <AsyncPanel
      isLoading={isLoading}
      error={error ?? null}
      errorMessage={errorMessage}
    >
      {hasData ? (
        children
      ) : (
        <EmptyState message={emptyMessage} className="py-12" />
      )}
    </AsyncPanel>
  );
}
