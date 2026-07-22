'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/cobranza/kpi-card';
import { GestionRapidaModal } from '@/components/cobranza/gestion-rapida-modal';
import { SecuenciaLotePanel } from '@/components/cobranza/secuencia-lote-panel';
import { HorarioAlerta } from '@/components/cobranza/horario-alerta';
import { OperacionHotkeysHelp } from '@/components/cobranza/operacion-hotkeys-help';
import { AsyncPanel } from '@/components/ui/async-panel';
import { PageHeader } from '@/components/ui/page-header';
import { PermissionGate } from '@/components/auth/permission-gate';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { usePuede } from '@/hooks/use-permisos';
import { useFocusMode } from '@/contexts/focus-mode-context';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  UX_PREF_KEYS,
  escribirBoolPref,
  leerBoolPref,
} from '@/lib/ux/ux-prefs';
import {
  GET_RESUMEN_MI_DIA,
  GET_MI_GAMIFICACION,
  GET_CASOS_PRIORITARIOS_MI_DIA,
  GET_AGENDA_SECUENCIA_HOY,
  VERIFICAR_HORARIO_COBRANZA,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  type AgendaSecuenciaItem,
  type MiDiaCaso,
  type MiDiaResumen,
  type RankingCobrador,
  formatearMoneda,
} from '@/types/cobranza';

const ATAJOS_MI_DIA = [
  { keys: 'B', descripcion: 'Ir a bandeja' },
  { keys: 'G', descripcion: 'Gestión rápida del 1.er caso prioritario' },
  { keys: 'N', descripcion: 'Abrir detalle del 1.er caso' },
  { keys: '?', descripcion: 'Mostrar esta ayuda' },
];

export default function MiDiaPage() {
  const router = useRouter();
  const puedeGestion = usePuede(PERMISO.GESTION_WRITE);
  const { focusMode, toggleFocusMode } = useFocusMode();
  const [gestionPrestamoId, setGestionPrestamoId] = useState<number | null>(
    null,
  );
  const [gamifQuiet, setGamifQuiet] = useState(false);

  useEffect(() => {
    setGamifQuiet(leerBoolPref(UX_PREF_KEYS.gamificacionQuiet, false));
  }, []);

  const {
    data,
    isLoading,
    error,
    refetch: refetchResumen,
  } = useGraphQLQuery<{ resumenMiDia: MiDiaResumen }>(GET_RESUMEN_MI_DIA);

  const { data: gamifData, isLoading: gamifLoading } = useGraphQLQuery<{
    miGamificacion: RankingCobrador | null;
  }>(GET_MI_GAMIFICACION, undefined, { enabled: !gamifQuiet });

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

  const { data: horarioData } = useGraphQLQuery<{
    verificarHorarioCobranza: { permitido: boolean; motivo?: string | null };
  }>(VERIFICAR_HORARIO_COBRANZA, {});

  const r = data?.resumenMiDia;
  const g = gamifData?.miGamificacion;
  const casos = casosData?.casosPrioritariosMiDia ?? [];
  const agendaSecuencia = agendaData?.agendaSecuenciaHoy ?? [];
  const primerCaso = casos[0];

  const hotkeys = useMemo(
    () => [
      {
        key: 'b',
        handler: () => router.push('/cobranza/bandeja'),
      },
      {
        key: 'g',
        enabled: puedeGestion && Boolean(primerCaso),
        handler: () => {
          if (primerCaso) {
            setGestionPrestamoId(primerCaso.idprestamo);
          }
        },
      },
      {
        key: 'n',
        enabled: Boolean(primerCaso),
        handler: () => {
          if (primerCaso) {
            router.push(`/cobranza/prestamos/${primerCaso.idprestamo}`);
          }
        },
      },
    ],
    [router, puedeGestion, primerCaso],
  );

  useHotkeys(hotkeys);

  const toggleGamifQuiet = () => {
    setGamifQuiet((prev) => {
      const next = !prev;
      escribirBoolPref(UX_PREF_KEYS.gamificacionQuiet, next);
      return next;
    });
  };

  return (
    <div className="field-layout space-y-8" data-ux-id="mi-dia-page">
      <OperacionHotkeysHelp atajos={ATAJOS_MI_DIA} />
      <PageHeader
        title="Mi día"
        description={
          focusMode
            ? 'Modo foco: solo prioridades de recuperación. Atajos: B · G · N · ?'
            : 'Agenda operativa y prioridades. Atajos: B bandeja · G gestión · N detalle · ? ayuda.'
        }
        actions={
          <div className="field-sticky-actions flex flex-wrap gap-2">
            <Button
              variant={focusMode ? 'primary' : 'outline'}
              className="field-touch-target"
              data-ux-id="mi-dia-modo-foco"
              onClick={toggleFocusMode}
            >
              {focusMode ? 'Salir modo foco' : 'Modo foco'}
            </Button>
            {!focusMode && (
              <>
                <Link href="/cobranza/bandeja">
                  <Button
                    className="field-touch-target"
                    data-ux-id="mi-dia-ir-bandeja"
                  >
                    Ir a bandeja
                  </Button>
                </Link>
                <Link href="/cobranza/gestiones">
                  <Button variant="outline" className="field-touch-target">
                    Mis gestiones
                  </Button>
                </Link>
              </>
            )}
          </div>
        }
      />

      {horarioData?.verificarHorarioCobranza && (
        <HorarioAlerta
          permitido={horarioData.verificarHorarioCobranza.permitido}
          motivo={horarioData.verificarHorarioCobranza.motivo}
        />
      )}

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
                        className="border-b border-stroke dark:border-dark-3"
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
        emptyMessage="Sin casos prioritarios. Revise su bandeja o pida asignación."
        emptyAction={
          <Link href="/cobranza/bandeja">
            <Button size="sm">Abrir bandeja</Button>
          </Link>
        }
      >
        {casos.length > 0 && (
          <div className="rounded-lg border border-stroke p-6 dark:border-dark-3">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              Casos prioritarios — recuperar primero
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Préstamo</th>
                    <th className="pb-2 pr-4">Cliente</th>
                    <th className="pb-2 pr-4">Prioridad</th>
                    <th className="pb-2 pr-4">Saldo</th>
                    <th className="pb-2 pr-4">Mora</th>
                    <th className="pb-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {casos.map((c) => (
                    <tr
                      key={c.idprestamo}
                      className="border-b border-stroke dark:border-dark-3"
                    >
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
                        <div className="flex flex-wrap gap-2">
                          <PermissionGate permiso={PERMISO.GESTION_WRITE}>
                            <Button
                              size="sm"
                              data-ux-id="mi-dia-gestionar"
                              onClick={() => setGestionPrestamoId(c.idprestamo)}
                            >
                              Gestionar
                            </Button>
                          </PermissionGate>
                          <Link href={`/cobranza/prestamos/${c.idprestamo}`}>
                            <Button size="sm" variant="outline">
                              Recuperar
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AsyncPanel>

      {!focusMode && (
        <div className="rounded-lg border border-dashed border-stroke p-4 dark:border-dark-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-500">
              Gamificación (opcional — no interrumpe el trabajo)
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-ux-id="mi-dia-gamif-quiet"
              onClick={toggleGamifQuiet}
            >
              {gamifQuiet ? 'Mostrar progreso' : 'Ocultar progreso'}
            </Button>
          </div>
          {!gamifQuiet && (
            <AsyncPanel
              isLoading={gamifLoading}
              isEmpty={!g}
              emptyMessage="Sin datos de gamificación para su usuario."
            >
              {g && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Nivel</p>
                      <p className="text-lg font-semibold text-primary">
                        {g.nivel}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">XP</p>
                      <p className="text-lg font-semibold">{g.xp}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Recuperado (30d)</p>
                      <p className="text-lg font-semibold">
                        {formatearMoneda(g.montoRecuperado)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/cobranza/gamificacion"
                    className="mt-3 inline-block text-sm text-primary hover:underline"
                  >
                    Ver ranking completo
                  </Link>
                </div>
              )}
            </AsyncPanel>
          )}
        </div>
      )}

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
