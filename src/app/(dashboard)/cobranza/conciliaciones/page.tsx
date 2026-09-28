'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/cobranza/kpi-card';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { PageHeader } from '@/components/ui/page-header';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_EXTRACTOS_BANCARIOS,
  GET_LINEAS_EXTRACTO_BANCARIO,
  GET_RESUMEN_CONCILIACION_BANCARIA,
  EJECUTAR_MATCHING_EXTRACTO,
  CONCILIAR_LINEA_MANUAL,
  DESCONCILIAR_LINEA_BANCARIA,
  EXCLUIR_LINEA_BANCARIA,
} from '@/lib/graphql/queries/cobranza.queries';
import { formatearMoneda } from '@/types/cobranza';

type Extracto = {
  idextracto: number;
  institucionFinanciera: string;
  cuenta: string;
  moneda: string;
  fechaDesde: string;
  fechaHasta: string;
  archivoNombre: string;
  totalLineas: number;
  pendientes: number;
  conciliadas: number;
  ambiguas: number;
};

type Linea = {
  idlinea: number;
  fechaOperacion: string;
  fechaValor: string | null;
  referenciaOriginal: string | null;
  descripcion: string | null;
  monto: string;
  moneda: string;
  estado: string;
  idpago: number | null;
  metodoMatch: string | null;
  confidence: string | null;
};

type Resumen = {
  total: number;
  pendientes: number;
  conciliadas: number;
  ambiguas: number;
  sinCoincidencia: number;
  duplicadas: number;
  excluidas: number;
};

const PAGE_SIZE = 25;

function badgeClass(estado: string): string {
  switch (estado) {
    case 'CONCILIADO':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30';
    case 'AMBIGUO':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30';
    case 'SIN_COINCIDENCIA':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30';
    case 'EXCLUIDO':
      return 'bg-gray-100 text-gray-700 dark:bg-dark-2';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30';
  }
}

export default function ConciliacionesPage() {
  const queryClient = useQueryClient();
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [idextracto, setIdextracto] = useState<number | ''>('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);

  const mandanteId = idmandante === '' ? undefined : idmandante;
  const extractoId = idextracto === '' ? undefined : idextracto;

  const extractosQuery = useGraphQLQuery<{ extractosBancarios: Extracto[] }>(
    GET_EXTRACTOS_BANCARIOS,
    { idmandante: mandanteId },
    { enabled: mandanteId != null },
  );

  const lineasQuery = useGraphQLQuery<{ lineasExtractoBancario: Linea[] }>(
    GET_LINEAS_EXTRACTO_BANCARIO,
    { idextracto: extractoId, estado: estado || null },
    { enabled: extractoId != null },
  );

  const resumenQuery = useGraphQLQuery<{ resumenConciliacionBancaria: Resumen }>(
    GET_RESUMEN_CONCILIACION_BANCARIA,
    { idextracto: extractoId },
    { enabled: extractoId != null },
  );

  const invalidar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [GET_LINEAS_EXTRACTO_BANCARIO] }),
      queryClient.invalidateQueries({ queryKey: [GET_RESUMEN_CONCILIACION_BANCARIA] }),
      queryClient.invalidateQueries({ queryKey: [GET_EXTRACTOS_BANCARIOS] }),
    ]);
  };

  const matchingMutation = useGraphQLMutation(EJECUTAR_MATCHING_EXTRACTO, {
    successMessage: 'Matching bancario ejecutado',
    onSuccess: invalidar,
  });
  const manualMutation = useGraphQLMutation(CONCILIAR_LINEA_MANUAL, {
    successMessage: 'Línea conciliada manualmente',
    onSuccess: invalidar,
  });
  const desconciliarMutation = useGraphQLMutation(DESCONCILIAR_LINEA_BANCARIA, {
    successMessage: 'Línea desconciliada',
    onSuccess: invalidar,
  });
  const excluirMutation = useGraphQLMutation(EXCLUIR_LINEA_BANCARIA, {
    successMessage: 'Línea excluida',
    onSuccess: invalidar,
  });

  const extractos = extractosQuery.data?.extractosBancarios ?? [];
  const lineas = lineasQuery.data?.lineasExtractoBancario ?? [];
  const resumen = resumenQuery.data?.resumenConciliacionBancaria;
  const selected = extractos.find((e) => e.idextracto === idextracto);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return lineas.slice(start, start + PAGE_SIZE);
  }, [lineas, page]);

  const totalPages = Math.max(1, Math.ceil(lineas.length / PAGE_SIZE));

  const columns = useMemo<ColumnDef<Linea>[]>(
    () => [
      {
        accessorKey: 'fechaOperacion',
        header: 'Fecha',
        cell: ({ row }) =>
          new Date(row.original.fechaOperacion).toLocaleDateString('es-NI'),
      },
      {
        accessorKey: 'referenciaOriginal',
        header: 'Referencia',
        cell: ({ row }) => row.original.referenciaOriginal ?? '—',
      },
      {
        accessorKey: 'descripcion',
        header: 'Descripción',
        cell: ({ row }) => row.original.descripcion ?? '—',
      },
      {
        accessorKey: 'monto',
        header: 'Monto',
        cell: ({ row }) =>
          formatearMoneda(Number(row.original.monto), row.original.moneda),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (
          <span className={`rounded-full px-2 py-0.5 text-xs ${badgeClass(row.original.estado)}`}>
            {row.original.estado.replaceAll('_', ' ')}
          </span>
        ),
      },
      {
        accessorKey: 'idpago',
        header: 'Pago',
        cell: ({ row }) =>
          row.original.idpago
            ? `#${row.original.idpago} · ${row.original.metodoMatch ?? '—'}`
            : '—',
      },
      {
        accessorKey: 'confidence',
        header: 'Conf.',
        cell: ({ row }) =>
          row.original.confidence ? `${row.original.confidence}%` : '—',
      },
    ],
    [],
  );

  function conciliarManual(linea: Linea) {
    const pagoRaw = window.prompt('ID del pago a relacionar:');
    if (!pagoRaw) return;
    const idpago = Number(pagoRaw);
    if (!Number.isInteger(idpago) || idpago <= 0) {
      window.alert('El ID de pago no es válido.');
      return;
    }
    const motivo = window.prompt('Motivo de conciliación manual:')?.trim();
    if (!motivo) return;
    manualMutation.mutate({ idlinea: linea.idlinea, idpago, motivo });
  }

  function desconciliar(linea: Linea) {
    const motivo = window.prompt('Motivo de la desconciliación:')?.trim();
    if (!motivo) return;
    desconciliarMutation.mutate({ idlinea: linea.idlinea, motivo });
  }

  function excluir(linea: Linea) {
    const motivo = window.prompt('Motivo de exclusión:')?.trim();
    if (!motivo) return;
    excluirMutation.mutate({ idlinea: linea.idlinea, motivo });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conciliación bancaria"
        description="Conciliación persistente de líneas de extracto contra pagos registrados, con trazabilidad de excepciones."
        actions={
          extractoId ? (
            <PermissionGate permiso={PERMISO.CONCILIACION_EXECUTE}>
              <Button
                disabled={matchingMutation.isPending}
                onClick={() => matchingMutation.mutate({ idextracto: extractoId })}
              >
                Ejecutar matching
              </Button>
            </PermissionGate>
          ) : null
        }
      />

      <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MandanteSelect
            value={idmandante}
            onChange={(value) => {
              setIdmandante(value);
              setIdextracto('');
              setPage(1);
            }}
            allowAll={false}
            label="Mandante"
            selectClassName="w-full rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
          />
          <label className="space-y-1 text-sm">
            <span className="block font-medium">Extracto</span>
            <select
              className="w-full rounded border px-3 py-2 dark:border-dark-3 dark:bg-dark-2"
              value={idextracto}
              disabled={!mandanteId || extractosQuery.isLoading}
              onChange={(e) => {
                setIdextracto(e.target.value ? Number(e.target.value) : '');
                setPage(1);
              }}
            >
              <option value="">Seleccione extracto</option>
              {extractos.map((e) => (
                <option key={e.idextracto} value={e.idextracto}>
                  #{e.idextracto} · {e.institucionFinanciera} · {e.cuenta} · {e.archivoNombre}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="block font-medium">Estado</span>
            <select
              className="w-full rounded border px-3 py-2 dark:border-dark-3 dark:bg-dark-2"
              value={estado}
              disabled={!extractoId}
              onChange={(e) => {
                setEstado(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="CONCILIADO">Conciliado</option>
              <option value="AMBIGUO">Ambiguo</option>
              <option value="SIN_COINCIDENCIA">Sin coincidencia</option>
              <option value="EXCLUIDO">Excluido</option>
            </select>
          </label>
        </div>
        {selected && (
          <p className="mt-3 text-xs text-body-color">
            {selected.institucionFinanciera} · {selected.cuenta} · {selected.moneda} ·
            {' '}{new Date(selected.fechaDesde).toLocaleDateString('es-NI')} –{' '}
            {new Date(selected.fechaHasta).toLocaleDateString('es-NI')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Total" value={String(resumen?.total ?? '—')} />
        <KpiCard label="Pendientes" value={String(resumen?.pendientes ?? '—')} alert={(resumen?.pendientes ?? 0) > 0} />
        <KpiCard label="Conciliadas" value={String(resumen?.conciliadas ?? '—')} />
        <KpiCard label="Ambiguas" value={String(resumen?.ambiguas ?? '—')} alert={(resumen?.ambiguas ?? 0) > 0} />
        <KpiCard label="Sin coincidencia" value={String(resumen?.sinCoincidencia ?? '—')} alert={(resumen?.sinCoincidencia ?? 0) > 0} />
        <KpiCard label="Duplicadas" value={String(resumen?.duplicadas ?? '—')} alert={(resumen?.duplicadas ?? 0) > 0} />
        <KpiCard label="Excluidas" value={String(resumen?.excluidas ?? '—')} />
      </div>

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        {(lineasQuery.error || resumenQuery.error || extractosQuery.error) && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20">
            {(lineasQuery.error ?? resumenQuery.error ?? extractosQuery.error)?.message}
          </div>
        )}
        <PaginatedDataTable
          data={paginated}
          columns={columns}
          pagination={{
            total: lineas.length,
            page,
            pageSize: PAGE_SIZE,
            totalPages,
          }}
          isLoading={lineasQuery.isLoading}
          emptyMessage={extractoId ? 'No hay líneas para los filtros seleccionados.' : 'Seleccione un extracto.'}
          onPageChange={setPage}
          onPageSizeChange={() => undefined}
          itemLabel="líneas"
          rowActions={(linea) => (
            <div className="flex flex-wrap justify-end gap-2">
              <PermissionGate permiso={PERMISO.CONCILIACION_OVERRIDE}>
                {linea.estado !== 'CONCILIADO' && linea.estado !== 'EXCLUIDO' && (
                  <Button size="sm" variant="outline" onClick={() => conciliarManual(linea)}>
                    Conciliar manual
                  </Button>
                )}
                {linea.estado === 'CONCILIADO' && (
                  <Button size="sm" variant="outline" onClick={() => desconciliar(linea)}>
                    Desconciliar
                  </Button>
                )}
                {linea.estado !== 'CONCILIADO' && linea.estado !== 'EXCLUIDO' && (
                  <Button size="sm" variant="outline" onClick={() => excluir(linea)}>
                    Excluir
                  </Button>
                )}
              </PermissionGate>
            </div>
          )}
        />
      </div>
    </div>
  );
}
