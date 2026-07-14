'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { ClientPaginatedDataTable } from '@/components/cobranza/client-paginated-data-table';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

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
}: ReporteTableSectionProps<T>) {
  return (
    <Card className="rounded-xl" padding="md">
      <CardHeader className="mb-3">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? (
            <p className="mt-1 text-xs text-gray-5">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="shrink-0">{actions}</div>
        ) : null}
      </CardHeader>
      <ClientPaginatedDataTable
        columns={columns}
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
