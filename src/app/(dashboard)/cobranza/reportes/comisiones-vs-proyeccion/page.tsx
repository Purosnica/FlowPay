'use client';

import { useMemo, useState } from 'react';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { AsyncPanel } from '@/components/ui/async-panel';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_REPORTE_COMISIONES_VS_PROYECCION } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteComisionesVsProyeccion,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  
  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteComisionesVsProyeccion: ReporteComisionesVsProyeccion;
  }>(
    GET_REPORTE_COMISIONES_VS_PROYECCION,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteComisionesVsProyeccion;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const r = reporte;
    return [
      { label: 'Proyectado', value: formatearMoneda(r.proyectadoComision), sub: `${r.proyectadoPagos} pagos` },
      { label: 'Liquidado', value: formatearMoneda(r.liquidadoComision), sub: r.liquidacionEstado ?? "Sin liquidación" },
      { label: 'Diferencial', value: formatearMoneda(r.diferencialComision), tone: 'warning' },
      { label: '% liquidado', value: `${r.pctLiquidadoVsProyectado}%`, tone: 'primary' },
    ];
  }, [reporte]);

  return (
    <div className="space-y-4">
      <PageHeader title="Comisiones vs proyección" description="Contrasta comisión proyectada vs liquidación persistida." />
      <div className="space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-end gap-3">
          <MandanteSelect
            value={idmandante}
            onChange={(v) => setIdmandante(v)}
            required
          />
          <div>
            <label htmlFor="periodo-comisiones-vs-proyeccion" className="mb-1 block text-sm font-medium">Periodo</label>
            <input
              id="periodo-comisiones-vs-proyeccion"
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!reporte || isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </Button>
        </div>
      </div>
      {mandanteId === 0 ? (
        <p className="text-sm text-dark-5 dark:text-dark-6">
          Seleccione un mandante.
        </p>
      ) : (
        <AsyncPanel
          isLoading={isLoading}
          error={error}
          isEmpty={!reporte}
          emptyMessage="No se pudo cargar el reporte."
        >
          {reporte ? (
            <div className="space-y-4">
              <DashboardMetricStrip metrics={metrics} />

              <div className="space-y-1 rounded-lg border border-stroke bg-white p-4 text-sm dark:border-dark-3 dark:bg-gray-dark">
                <p>Recuperado proyectado: {formatearMoneda(reporte.proyectadoRecuperado)}</p>
                <p>Recuperado liquidado: {formatearMoneda(reporte.liquidadoRecuperado)}</p>
                <p>Ingreso proyectado: {formatearMoneda(reporte.proyectadoIngresoEmpresa)}</p>
                <p>
                  Liquidación: {reporte.idliquidacion ?? '—'} (
                  {reporte.liquidacionEstado ?? 'N/A'})
                </p>
              </div>
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
