'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { AsyncPanel } from '@/components/ui/async-panel';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BulkImpactPreview } from '@/components/cobranza/bulk-impact-preview';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { usePagination } from '@/hooks/use-pagination';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  ASIGNAR_GESTOR_MASIVO,
  ASIGNAR_GESTOR_POR_REFERENCIAS,
  GET_PRESTAMOS,
  GET_USUARIOS_MANDANTE,
} from '@/lib/graphql/queries/cobranza.queries';
import { parseReferenciasPrestamo } from '@/lib/cobranza/parse-referencias-prestamo';
import {
  type Prestamo,
  type PrestamoFilters,
  type UsuarioBasico,
  formatearMoneda,
  nombreCompletoCliente,
} from '@/types/cobranza';

export function AsignacionManualPanel() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [sinAsignar, setSinAsignar] = useState(true);
  const [search, setSearch] = useState('');
  const [listaPegada, setListaPegada] = useState('');
  const [idgestor, setIdgestor] = useState<number | ''>('');
  const [motivo, setMotivo] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  /** Metadatos de selección (sobreviven al cambio de página). */
  const [seleccionMeta, setSeleccionMeta] = useState<
    Map<number, { saldoTotal: number; moneda: string; idgestor?: number }>
  >(new Map());
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [confirmarAsignacion, setConfirmarAsignacion] = useState(false);
  const buscarId = useId();
  const listaId = useId();
  const cobradorId = useId();
  const motivoId = useId();

  const {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  } = usePagination({ initialPageSize: 20 });

  const filters = useMemo((): PrestamoFilters | undefined => {
    if (typeof idmandante !== 'number') {
      return undefined;
    }
    const next: PrestamoFilters = { idmandante };
    if (sinAsignar) {
      next.sinAsignar = true;
    }
    if (search.trim()) {
      next.search = search.trim();
    }
    return next;
  }, [idmandante, sinAsignar, search]);

  const {
    data: usuariosData,
    isLoading: gestoresLoading,
    error: gestoresError,
  } = useGraphQLQuery<{
    usuariosMandante: UsuarioBasico[];
  }>(
    GET_USUARIOS_MANDANTE,
    { idmandante: idmandante as number },
    { enabled: typeof idmandante === 'number' },
  );

  const {
    data: prestamosData,
    isLoading: prestamosLoading,
    error: prestamosError,
    refetch: refetchPrestamos,
  } = useGraphQLQuery<{
    prestamos: {
      prestamos: Prestamo[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(
    GET_PRESTAMOS,
    { ...queryVars, filters },
    { enabled: typeof idmandante === 'number' && !!filters },
  );

  const asignarMutation = useGraphQLMutation<
    { asignarGestorMasivo: number },
    { idprestamos: number[]; idgestor: number; motivo?: string }
  >(ASIGNAR_GESTOR_MASIVO, {
    successMessage: (data) =>
      `${data.asignarGestorMasivo} préstamo(s) asignado(s) correctamente`,
    requestOptions: { timeout: 180_000 },
    onSuccess: (data) => {
      const asignados = data.asignarGestorMasivo;
      setSeleccionados(new Set());
      setSeleccionMeta(new Map());
      setError(null);
      setExito(`${asignados} préstamo(s) asignado(s) correctamente.`);
      void refetchPrestamos();
    },
    onError: (err: Error) => {
      setExito(null);
      setError(err.message);
    },
  });

  const asignarListaMutation = useGraphQLMutation<
    {
      asignarGestorPorReferencias: {
        asignados: number;
        encontrados: number;
        omitidosYaAsignados: number;
        noEncontrados: string[];
      };
    },
    {
      idmandante: number;
      referenciasTexto: string;
      idgestor: number;
      motivo?: string;
    }
  >(ASIGNAR_GESTOR_POR_REFERENCIAS, {
    successMessage: (data) => {
      const result = data.asignarGestorPorReferencias;
      const partes = [
        `${result.asignados} préstamo(s) asignado(s)`,
        `de ${result.encontrados} encontrado(s)`,
      ];
      if (result.omitidosYaAsignados > 0) {
        partes.push(
          `${result.omitidosYaAsignados} ya estaban con ese cobrador (omitidos)`,
        );
      }
      if (result.noEncontrados.length > 0) {
        const muestra = result.noEncontrados.slice(0, 10).join(', ');
        const resto =
          result.noEncontrados.length > 10
            ? ` (+${result.noEncontrados.length - 10} más)`
            : '';
        partes.push(`No encontrados: ${muestra}${resto}`);
      }
      return `${partes.join('. ')}.`;
    },
    requestOptions: { timeout: 180_000 },
    onSuccess: (data) => {
      const result = data.asignarGestorPorReferencias;
      setError(null);
      const partes = [
        `${result.asignados} préstamo(s) asignado(s)`,
        `de ${result.encontrados} encontrado(s)`,
      ];
      if (result.omitidosYaAsignados > 0) {
        partes.push(
          `${result.omitidosYaAsignados} ya estaban con ese cobrador (omitidos)`,
        );
      }
      if (result.noEncontrados.length > 0) {
        const muestra = result.noEncontrados.slice(0, 10).join(', ');
        const resto =
          result.noEncontrados.length > 10
            ? ` (+${result.noEncontrados.length - 10} más)`
            : '';
        partes.push(`No encontrados: ${muestra}${resto}`);
      }
      setExito(partes.join('. ') + '.');
      if (result.asignados > 0 || result.omitidosYaAsignados > 0) {
        setListaPegada('');
        void refetchPrestamos();
      }
    },
    onError: (err: Error) => {
      setExito(null);
      setError(err.message);
    },
  });

  const referenciasPegadas = useMemo(
    () => parseReferenciasPrestamo(listaPegada),
    [listaPegada],
  );

  const gestores = usuariosData?.usuariosMandante ?? [];
  const listaPrestamos = prestamosData?.prestamos.prestamos ?? [];
  const pageIds = useMemo(
    () =>
      (prestamosData?.prestamos.prestamos ?? []).map((p) => p.idprestamo),
    [prestamosData?.prestamos.prestamos],
  );
  const todosPaginaSeleccionados =
    pageIds.length > 0 && pageIds.every((id) => seleccionados.has(id));

  const syncMeta = useCallback(
    (ids: Set<number>, fuente: Prestamo[]) => {
      setSeleccionMeta((prev) => {
        const next = new Map(prev);
        for (const id of [...next.keys()]) {
          if (!ids.has(id)) {
            next.delete(id);
          }
        }
        for (const p of fuente) {
          if (ids.has(p.idprestamo)) {
            next.set(p.idprestamo, {
              saldoTotal: p.saldoTotal,
              moneda: p.moneda,
              idgestor: p.gestor?.idusuario,
            });
          }
        }
        return next;
      });
    },
    [],
  );

  const togglePrestamo = useCallback(
    (prestamo: Prestamo) => {
      setSeleccionados((prev) => {
        const next = new Set(prev);
        if (next.has(prestamo.idprestamo)) {
          next.delete(prestamo.idprestamo);
        } else {
          next.add(prestamo.idprestamo);
        }
        syncMeta(next, [prestamo]);
        return next;
      });
    },
    [syncMeta],
  );

  const togglePagina = useCallback(() => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      const allSelected =
        pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      syncMeta(next, listaPrestamos);
      return next;
    });
  }, [pageIds, listaPrestamos, syncMeta]);

  const columns = useMemo<ColumnDef<Prestamo>[]>(
    () => [
      {
        id: 'seleccion',
        header: () => (
          <input
            type="checkbox"
            checked={todosPaginaSeleccionados}
            onChange={togglePagina}
            aria-label="Seleccionar página"
            disabled={pageIds.length === 0}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={seleccionados.has(row.original.idprestamo)}
            onChange={() => togglePrestamo(row.original)}
            aria-label={`Seleccionar préstamo ${row.original.noPrestamo}`}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        accessorKey: 'noPrestamo',
        header: 'No. Préstamo',
      },
      {
        id: 'cliente',
        header: 'Deudor',
        cell: ({ row }) =>
          row.original.cliente
            ? nombreCompletoCliente(row.original.cliente)
            : '-',
      },
      {
        id: 'cedula',
        header: 'Cédula',
        cell: ({ row }) => row.original.cliente?.numerodocumento ?? '-',
      },
      {
        accessorKey: 'diasMora',
        header: 'Días mora',
        cell: ({ row }) => {
          const dias = row.original.diasMora;
          return (
            <span
              className={
                dias > 90
                  ? 'font-medium text-red-600'
                  : dias > 30
                    ? 'text-amber-600'
                    : ''
              }
            >
              {dias}
            </span>
          );
        },
      },
      {
        accessorKey: 'saldoTotal',
        header: 'Saldo',
        cell: ({ row }) =>
          formatearMoneda(row.original.saldoTotal, row.original.moneda),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
      },
      {
        id: 'gestor',
        header: 'Gestor actual',
        cell: ({ row }) => row.original.gestor?.nombre ?? 'Sin asignar',
      },
    ],
    [
      pageIds.length,
      seleccionados,
      todosPaginaSeleccionados,
      togglePagina,
      togglePrestamo,
    ],
  );

  const handleMandanteChange = (value: number | '') => {
    setIdmandante(value);
    setIdgestor('');
    setSeleccionados(new Set());
    setSeleccionMeta(new Map());
    setListaPegada('');
    setError(null);
    setExito(null);
    resetPage();
  };

  const handleAsignar = () => {
    if (typeof idmandante !== 'number') {
      setError('Seleccione un mandante.');
      return;
    }
    if (typeof idgestor !== 'number') {
      setError('Seleccione un cobrador.');
      return;
    }
    if (seleccionados.size === 0) {
      setError('Seleccione al menos un préstamo.');
      return;
    }
    setError(null);
    setConfirmarAsignacion(true);
  };

  const ejecutarAsignacion = () => {
    if (typeof idgestor !== 'number') {
      return;
    }
    setExito(null);
    asignarMutation.mutate(
      {
        idprestamos: [...seleccionados],
        idgestor,
        motivo: motivo.trim() || undefined,
      },
      { onSuccess: () => setConfirmarAsignacion(false) },
    );
  };

  const handleAsignarLista = () => {
    if (typeof idmandante !== 'number') {
      setError('Seleccione un mandante.');
      return;
    }
    if (typeof idgestor !== 'number') {
      setError('Seleccione un cobrador.');
      return;
    }
    if (referenciasPegadas.length === 0) {
      setError('Pegue al menos un No. préstamo o código único.');
      return;
    }
    setExito(null);
    asignarListaMutation.mutate({
      idmandante,
      referenciasTexto: listaPegada,
      idgestor,
      motivo: motivo.trim() || undefined,
    });
  };

  const asignando =
    asignarMutation.isPending || asignarListaMutation.isPending;

  const puedeAsignarSeleccion =
    typeof idgestor === 'number' && seleccionados.size > 0 && !asignando;

  const puedeAsignarLista =
    typeof idgestor === 'number' &&
    referenciasPegadas.length > 0 &&
    !asignando;

  const impactoSeleccion = useMemo(() => {
    const metas = [...seleccionMeta.values()];
    const saldoTotal = metas.reduce((acc, m) => acc + m.saldoTotal, 0);
    const gestoresPrevios = new Set(
      metas
        .map((m) => m.idgestor)
        .filter((id): id is number => typeof id === 'number'),
    );
    return {
      cantidad: seleccionados.size,
      saldoTotal,
      moneda: metas[0]?.moneda ?? 'NIO',
      gestoresAfectados:
        gestoresPrevios.size + (typeof idgestor === 'number' ? 1 : 0),
      etiquetaEntidad: 'préstamos',
    };
  }, [seleccionMeta, seleccionados, idgestor]);

  const nombreGestor =
    gestores.find((g) => g.idusuario === idgestor)?.nombre ?? 'cobrador';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MandanteSelect
          value={idmandante}
          onChange={handleMandanteChange}
          label="Mandante"
          required
        />

        <div>
          <label htmlFor={buscarId} className="mb-1 block text-sm font-medium">
            Buscar
          </label>
          <input
            id={buscarId}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="No. préstamo o código único..."
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={sinAsignar}
              onChange={(e) => {
                setSinAsignar(e.target.checked);
                setSeleccionados(new Set());
                resetPage();
              }}
            />
            Solo préstamos sin asignar
          </label>
        </div>
      </div>

      {typeof idmandante !== 'number' && (
        <p className="text-sm text-dark-5 dark:text-dark-6">
          Seleccione un mandante para ver los préstamos disponibles.
        </p>
      )}

      {typeof idmandante === 'number' && (
        <>
          <AsyncPanel
            isLoading={gestoresLoading}
            error={gestoresError}
            isEmpty={gestores.length === 0}
            loadingMessage="Cargando cobradores..."
            emptyMessage="No hay cobradores asignados a este mandante. Asigne usuarios en Cobranza → Mandantes."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label
                    htmlFor={cobradorId}
                    className="mb-1 block text-sm font-medium"
                  >
                    Cobrador *
                  </label>
                  <select
                    id={cobradorId}
                    value={idgestor === '' ? '' : String(idgestor)}
                    onChange={(e) =>
                      setIdgestor(
                        e.target.value === '' ? '' : Number(e.target.value),
                      )
                    }
                    className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  >
                    <option value="">Seleccione cobrador</option>
                    {gestores.map((g) => (
                      <option key={g.idusuario} value={g.idusuario}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={motivoId}
                    className="mb-1 block text-sm font-medium"
                  >
                    Motivo (opcional)
                  </label>
                  <input
                    id={motivoId}
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo de la asignación"
                    className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={listaId}
                  className="mb-1 block text-sm font-medium"
                >
                  Pegar lista de créditos
                </label>
                <textarea
                  id={listaId}
                  value={listaPegada}
                  onChange={(e) => setListaPegada(e.target.value)}
                  rows={6}
                  placeholder={
                    'Uno por línea, o separados por coma:\nPREST-001\nPREST-002\nCOD-UNICO-123'
                  }
                  className="w-full rounded-lg border border-stroke px-3 py-2 font-mono text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                />
                <p className="mt-1 text-xs text-dark-5 dark:text-dark-6">
                  Acepta No. préstamo o código único.
                  {referenciasPegadas.length > 0
                    ? ` ${referenciasPegadas.length} referencia(s) detectada(s).`
                    : ''}
                </p>
                <div className="mt-2">
                  <Button
                    onClick={handleAsignarLista}
                    disabled={!puedeAsignarLista}
                  >
                    {asignarListaMutation.isPending
                      ? 'Asignando lista...'
                      : `Asignar lista (${referenciasPegadas.length})`}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-stroke pt-4 dark:border-dark-3">
                <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
                  <Button
                    onClick={handleAsignar}
                    disabled={!puedeAsignarSeleccion}
                  >
                    {asignarMutation.isPending
                      ? 'Asignando...'
                      : `Asignar selección (${seleccionados.size})`}
                  </Button>
                </PermissionGate>
                {seleccionados.size > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSeleccionados(new Set());
                      setSeleccionMeta(new Map());
                    }}
                  >
                    Limpiar selección
                  </Button>
                )}
                <span className="text-xs text-dark-5 dark:text-dark-6">
                  O marque préstamos en la tabla de abajo.
                </span>
              </div>
              {seleccionados.size > 0 && typeof idgestor === 'number' ? (
                <BulkImpactPreview
                  stats={impactoSeleccion}
                  accionResumen={`Se asignarán a ${nombreGestor}.`}
                />
              ) : null}
            </div>
          </AsyncPanel>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20">
              {error}
            </div>
          )}

          {exito && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20">
              {exito}
            </div>
          )}

          <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
            {prestamosError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20">
                {prestamosError.message}
              </div>
            )}
            <PaginatedDataTable
              data={listaPrestamos}
              columns={columns}
              pagination={prestamosData?.prestamos}
              isLoading={prestamosLoading}
              emptyMessage="No hay préstamos para asignar con estos filtros."
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              itemLabel="préstamos"
            />
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={confirmarAsignacion}
        onClose={() => setConfirmarAsignacion(false)}
        title="Confirmar asignación masiva"
        description={`Se reasignarán ${seleccionados.size} préstamo(s) a ${nombreGestor}.`}
        confirmLabel="Confirmar asignación"
        variant="warning"
        isLoading={asignarMutation.isPending}
        onConfirm={ejecutarAsignacion}
      >
        <BulkImpactPreview
          stats={impactoSeleccion}
          accionResumen={`Destino: ${nombreGestor}.`}
        />
      </ConfirmDialog>
    </div>
  );
}
