'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/cobranza/kpi-card';
import { GestionRapidaModal } from '@/components/cobranza/gestion-rapida-modal';
import { SecuenciaLotePanel } from '@/components/cobranza/secuencia-lote-panel';
import { AsyncPanel } from '@/components/ui/async-panel';
import { PageHeader } from '@/components/ui/page-header';
import { PermissionGate } from '@/components/auth/permission-gate';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { usePuede } from '@/hooks/use-permisos';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  GET_RESUMEN_MI_DIA,
  GET_MI_GAMIFICACION,
  GET_CASOS_PRIORITARIOS_MI_DIA,
  GET_AGENDA_SECUENCIA_HOY,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  type AgendaSecuenciaItem,
  type MiDiaCaso,
  type MiDiaResumen,
  type RankingCobrador,
  formatearMoneda,
} from '@/types/cobranza';

export default function MiDiaPage() {
  const puedeGestion = usePuede(PERMISO.GESTION_WRITE);
  const [gestionPrestamoId, setGestionPrestamoId] = useState<number | null>(
    null,
  );

  const {
    data,
    isLoading,
    error,
    refetch: refetchResumen,
  } = useGraphQLQuery<{ resumenMiDia: MiDiaResumen }>(GET_RESUMEN_MI_DIA);

  const { data: gamifData, isLoading: gamifLoading } = useGraphQLQuery<{
    miGamificacion: RankingCobrador | null;
  }>(GET_MI_GAMIFICACION);

  const { data: casosData, isLoading: casosLoading } = useGraphQLQuery<{
    casosPrioritariosMiDia: MiDiaCaso[];
  }>(GET_CASOS_PRIORITARIOS_MI_DIA, { limite: 10 });

  const {
    data: agendaData,
    isLoading: agendaLoading,
    refetch: refetchAgenda,
  } = useGraphQLQuery<{
    agendaSecuenciaHoy: AgendaSecuenciaItem[];
  }>(GET_AGENDA_SECUENCIA_HOY);

  const r = data?.resumenMiDia;
  const g = gamifData?.miGamificacion;
  const casos = casosData?.casosPrioritariosMiDia ?? [];
  const agendaSecuencia = agendaData?.agendaSecuenciaHoy ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mi día"
        description="Agenda operativa y prioridades para maximizar su recuperación hoy."
        actions={
          <>
            <Link href="/cobranza/bandeja">
              <Button>Ir a bandeja</Button>
            </Link>
            <Link href="/cobranza/gestiones">
              <Button variant="outline">Mis gestiones</Button>
            </Link>
          </>
        }
      />

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!r}
        emptyMessage="No hay resumen disponible para hoy."
      >
        {r && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <KpiCard
              label="Casos prioritarios"
              value={String(r.casosPrioritarios)}
              href="/cobranza/bandeja"
            />
            <KpiCard
              label="Agenda hoy"
              value={String(r.agendaHoy)}
              href="/cobranza/bandeja"
            />
            <KpiCard
              label="Promesas hoy"
              value={String(r.promesasHoy)}
              alert={r.promesasHoy > 0}
            />
            <KpiCard
              label="Promesas vencidas"
              value={String(r.promesasVencidas)}
              href="/cobranza/bandeja?soloPromesaVencida=1"
              alert={r.promesasVencidas > 0}
            />
            <KpiCard label="Gestiones hoy" value={String(r.gestionesHoy)} />
            <KpiCard label="Pagos hoy" value={String(r.pagosHoy)} />
            <KpiCard
              label="Recuperado hoy"
              value={formatearMoneda(r.montoRecuperadoHoy)}
            />
          </div>
        )}
      </AsyncPanel>

      <AsyncPanel
        isLoading={agendaLoading}
        isEmpty={agendaSecuencia.length === 0}
        emptyMessage="Sin contactos de secuencia programados para hoy."
      >
        {agendaSecuencia.length > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 dark:border-primary/40">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              Secuencia de contacto — hoy
            </h2>
            {puedeGestion ? (
              <SecuenciaLotePanel
                items={agendaSecuencia}
                onDone={() => {
                  void refetchAgenda();
                  void refetchResumen();
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-4">Préstamo</th>
                      <th className="pb-2 pr-4">Cliente</th>
                      <th className="pb-2 pr-4">Canal</th>
                      <th className="pb-2 pr-4">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendaSecuencia.map((item) => (
                      <tr
                        key={`${item.idprestamo}-${item.idpaso}`}
                        className="border-b border-stroke/50"
                      >
                        <td className="py-2 pr-4">
                          <Link
                            href={`/cobranza/prestamos/${item.idprestamo}`}
                            className="text-primary hover:underline"
                          >
                            {item.noPrestamo}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">{item.nombreCliente}</td>
                        <td className="py-2 pr-4">{item.canal}</td>
                        <td className="py-2 pr-4">{item.accion ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </AsyncPanel>

      <AsyncPanel
        isLoading={casosLoading}
        isEmpty={casos.length === 0}
        emptyMessage="No hay casos prioritarios pendientes."
      >
        {casos.length > 0 && (
          <div className="rounded-lg border border-stroke p-6 dark:border-dark-3">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              Top casos prioritarios
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Préstamo</th>
                    <th className="pb-2 pr-4">Deudor</th>
                    <th className="pb-2 pr-4">Prioridad</th>
                    <th className="pb-2 pr-4">Saldo</th>
                    <th className="pb-2 pr-4">Mora</th>
                    <th className="pb-2">Gestión</th>
                  </tr>
                </thead>
                <tbody>
                  {casos.map((c) => (
                    <tr key={c.idprestamo} className="border-b border-stroke/50">
                      <td className="py-2 pr-4">
                        <Link
                          href={`/cobranza/prestamos/${c.idprestamo}`}
                          className="text-primary hover:underline"
                        >
                          {c.noPrestamo}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{c.nombreCliente}</td>
                      <td className="py-2 pr-4">
                        <span className="font-medium">
                          {Math.round(c.scorePrioridad)}
                        </span>
                        <p className="text-xs text-gray-500">
                          {c.motivoPrioridad}
                        </p>
                      </td>
                      <td className="py-2 pr-4">
                        {formatearMoneda(c.saldoTotal)}
                      </td>
                      <td className="py-2 pr-4">{c.diasMora}d</td>
                      <td className="py-2">
                        <PermissionGate permiso={PERMISO.GESTION_WRITE}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setGestionPrestamoId(c.idprestamo)}
                          >
                            Gestionar
                          </Button>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AsyncPanel>

      <AsyncPanel
        isLoading={gamifLoading}
        isEmpty={!g}
        emptyMessage="Sin datos de gamificación para su usuario."
      >
        {g && (
          <div className="rounded-lg border border-stroke p-6 dark:border-dark-3">
            <h2 className="text-lg font-semibold text-dark dark:text-white">
              Mi progreso
            </h2>
            <div className="mt-4 flex flex-wrap gap-6">
              <div>
                <p className="text-sm text-gray-500">Nivel</p>
                <p className="text-xl font-bold text-primary">{g.nivel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">XP</p>
                <p className="text-xl font-bold">{g.xp}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Posición</p>
                <p className="text-xl font-bold">#{g.posicion}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Recuperado (30d)</p>
                <p className="text-xl font-bold">
                  {formatearMoneda(g.montoRecuperado)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Promesas cumplidas</p>
                <p className="text-xl font-bold">{g.promesasCumplidas}</p>
              </div>
            </div>
            {g.insignias.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {g.insignias.map((ins) => (
                  <span
                    key={ins}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {ins}
                  </span>
                ))}
              </div>
            )}
            <Link
              href="/cobranza/gamificacion"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              Ver ranking completo
            </Link>
          </div>
        )}
      </AsyncPanel>

      {puedeGestion && gestionPrestamoId != null && (
        <GestionRapidaModal
          idprestamo={gestionPrestamoId}
          onClose={() => setGestionPrestamoId(null)}
          onSuccess={() => {
            void refetchResumen();
            void refetchAgenda();
          }}
        />
      )}
    </div>
  );
}
