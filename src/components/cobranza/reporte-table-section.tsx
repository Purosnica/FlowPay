'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, type ReactNode } from 'react';
import { ClientPaginatedDataTable } from '@/components/cobranza/client-paginated-data-table';
import {
  ReporteColumnasPicker,
  type ColumnaOpcion,
} from '@/components/cobranza/reporte-columnas-picker';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useReporteColumnas } from '@/hooks/use-reporte-columnas';

interface ReporteTableSectionProps<T> {
  title: string;
  description?: string;
  columns: ColumnDef<T>[];
  data: T[];
  emptyMessage: string;
  itemLabel: string;
  initialPageSize?: number;
  isLoading?: boolean;
  actions?: ReactNode;
  resetKey?: string | number;
  /** Id estable para persistir columnas visibles (I183). */
  reporteId?: string;
}

function columnId<T>(col: ColumnDef<T>, index: number): string {
  if ('id' in col && typeof col.id === 'string' && col.id) {
    return col.id;
  }
  if ('accessorKey' in col && typeof col.accessorKey === 'string') {
    return col.accessorKey;
  }
  return `col_${index}`;
}

function columnLabel<T>(col: ColumnDef<T>, id: string): string {
  if (typeof col.header === 'string') {
    return col.header;
  }
  return id;
}

export function ReporteTableSection<T>({
  title,
  description,
  columns,
  data,
  emptyMessage,
  itemLabel,
  initialPageSize = 20,
  isLoading = false,
  actions,
  resetKey,
  reporteId,
}: ReporteTableSectionProps<T>) {
  const { usuario } = useAuth();
  const allIds = useMemo(
    () => columns.map((c, i) => columnId(c, i)),
    [columns],
  );
  const opciones: ColumnaOpcion[] = useMemo(
    () =>
      columns.map((c, i) => {
        const id = columnId(c, i);
        return { id, label: columnLabel(c, id) };
      }),
    [columns],
  );

  const { visibleIds, toggle, reset } = useReporteColumnas(
    usuario?.idusuario ?? null,
    reporteId ?? title,
    allIds,
  );

  const visibleColumns = useMemo(
    () =>
      columns.filter((c, i) => visibleIds.includes(columnId(c, i))),
    [columns, visibleIds],
  );

  return (
    <Card className="rounded-xl" padding="md">
      <CardHeader className="mb-3">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? (
            <p className="mt-1 text-xs text-gray-5">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ReporteColumnasPicker
            columnas={opciones}
            visibleIds={visibleIds}
            onToggle={toggle}
            onReset={reset}
          />
          {actions ? <div>{actions}</div> : null}
        </div>
      </CardHeader>
      <ClientPaginatedDataTable
        columns={visibleColumns}
        data={data}
        emptyMessage={emptyMessage}
        itemLabel={itemLabel}
        initialPageSize={initialPageSize}
        isLoading={isLoading}
        resetKey={resetKey}
      />
    </Card>
  );
}
