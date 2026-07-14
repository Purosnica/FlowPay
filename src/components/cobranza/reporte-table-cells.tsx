'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatearMoneda } from '@/types/cobranza';

export function cellMoneda(value: number | null | undefined): ReactNode {
  if (value == null) {
    return <span className="text-gray-5">—</span>;
  }
  return <span className="tabular-nums">{formatearMoneda(value)}</span>;
}

export function cellNumero(value: number | null | undefined): ReactNode {
  if (value == null) {
    return <span className="text-gray-5">—</span>;
  }
  return <span className="tabular-nums">{value}</span>;
}

export function cellPorcentaje(
  value: number | null | undefined,
  opts?: { tone?: boolean },
): ReactNode {
  if (value == null) {
    return <span className="text-gray-5">—</span>;
  }
  const toneClass =
    opts?.tone === true
      ? value >= 50
        ? 'text-green-dark dark:text-green'
        : value > 0
          ? 'text-amber-700 dark:text-amber-300'
          : 'text-gray-5'
      : undefined;
  return <span className={cn('tabular-nums', toneClass)}>{value}%</span>;
}

export function cellTexto(
  value: string | null | undefined,
  fallback = '—',
): ReactNode {
  if (value == null || value === '') {
    return <span className="text-gray-5">{fallback}</span>;
  }
  return value;
}

export function cellPrestamoLink(
  idprestamo: number | null | undefined,
  noPrestamo: string | null | undefined,
): ReactNode {
  if (idprestamo == null || !noPrestamo) {
    return cellTexto(noPrestamo);
  }
  return (
    <Link
      href={`/cobranza/prestamos/${idprestamo}`}
      className="font-medium text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {noPrestamo}
    </Link>
  );
}

export function cellEstadoBadge(
  estado: string | null | undefined,
): ReactNode {
  if (!estado) {
    return <span className="text-gray-5">—</span>;
  }
  const normalized = estado.toLowerCase();
  let variant: 'default' | 'success' | 'warning' | 'danger' | 'info' =
    'default';
  if (
    normalized.includes('cumpl') ||
    normalized.includes('pagad') ||
    normalized.includes('activo') ||
    normalized.includes('resuelt')
  ) {
    variant = 'success';
  } else if (
    normalized.includes('vencid') ||
    normalized.includes('mora') ||
    normalized.includes('fuera')
  ) {
    variant = 'danger';
  } else if (
    normalized.includes('pend') ||
    normalized.includes('proceso') ||
    normalized.includes('abiert')
  ) {
    variant = 'warning';
  } else if (normalized.includes('cancel')) {
    variant = 'info';
  }
  return (
    <Badge variant={variant} size="sm">
      {estado}
    </Badge>
  );
}

export function cellMoraDias(dias: number | null | undefined): ReactNode {
  if (dias == null) {
    return <span className="text-gray-5">—</span>;
  }
  const tone =
    dias >= 90
      ? 'text-red-700 dark:text-red-300'
      : dias >= 30
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-dark dark:text-white';
  return <span className={cn('tabular-nums font-medium', tone)}>{dias}</span>;
}
