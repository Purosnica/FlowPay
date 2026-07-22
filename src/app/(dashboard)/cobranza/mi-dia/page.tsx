'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GestionRapidaModal } from '@/components/cobranza/gestion-rapida-modal';
import { PagoRapidaModal } from '@/components/cobranza/pago-rapida-modal';
import { SecuenciaLotePanel } from '@/components/cobranza/secuencia-lote-panel';
import { EstacionCasoPanel } from '@/components/cobranza/estacion-caso-panel';
import { HorarioAlerta } from '@/components/cobranza/horario-alerta';
import { OperacionHotkeysHelp } from '@/components/cobranza/operacion-hotkeys-help';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { AsyncPanel } from '@/components/ui/async-panel';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { usePuede } from '@/hooks/use-permisos';
import { useColaOperativa } from '@/hooks/use-cola-operativa';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  UX_PREF_KEYS,
  escribirBoolPref,
  leerBoolPref,
} from '@/lib/ux/ux-prefs';
import { notificationToast } from '@/lib/notifications/notification-toast';
import { mensajeAvanceOperativo } from '@/lib/logic/avance-operativo-feedback-logic';
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
import { cn } from '@/lib/utils';

const ATAJOS_MI_DIA = [
  { keys: 'J / K', descripcion: 'Caso anterior / siguiente' },
  { keys: 'P', descripcion: 'Pago rápido del caso seleccionado' },
  { keys: 'G', descripcion: 'Tipificar el caso seleccionado' },
  { keys: 'N', descripcion: 'Abrir detalle del caso seleccionado' },
  { keys: 'B', descripcion: 'Ir a bandeja' },
  { keys: '?', descripcion: 'Mostrar esta ayuda' },
];

function construirMetricasMiDia(r: MiDiaResumen): DashboardMetric[] {
  return [
    {
      label: 'Casos prioritarios',
      value: String(r.casosPrioritarios),
      href: '/cobranza/bandeja',
      tone: r.casosPrioritarios > 0 ? 'primary' : 'default',
    },
    {
      label: 'Agenda hoy',
      value: String(r.agendaHoy),
      href: '/cobranza/bandeja?soloAgendaHoy=1',
    },
    {
      label: 'Promesas hoy',
      value: String(r.promesasHoy),
      tone: r.promesasHoy > 0 ? 'warning' : 'default',
    },
    {
      label: 'Promesas vencidas',
      value: String(r.promesasVencidas),
      href: '/cobranza/bandeja?soloPromesaVencida=1',
      tone: r.promesasVencidas > 0 ? 'danger' : 'default',
    },
    {
      label: 'Gestiones hoy',
      value: String(r.gestionesHoy),
    },
    {
      label: 'Pagos hoy',
      value: String(r.pagosHoy),
      tone: r.pagosHoy > 0 ? 'success' : 'default',
    },
    {
      label: 'Recuperado hoy',
      value: formatearMoneda(r.montoRecuperadoHoy),
      tone: r.montoRecuperadoHoy > 0 ? 'primary' : 'default',
    },
  ];
}

export default function MiDiaPage() {
  const router = useRouter();
  const puedeGestion = usePuede(PERMISO.GESTION_WRITE);
  const puedePago = usePuede(PERMISO.PAGO_WRITE);
  const [gestionPrestamoId, setGestionPrestamoId] = useState<number | null>(
    null,
  );
  const [pagoPrestamoId, setPagoPrestamoId] = useState<number | null>(null);
  /** I187: quiet por defecto — sin vanity metrics en el flujo operativo. */
  const [gamifQuiet, setGamifQuiet] = useState(true);

  useEffect(() => {
    setGamifQuiet(leerBoolPref(UX_PREF_KEYS.gamificacionQuiet, true));
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

  const {
    data: casosData,
    isLoading: casosLoading,
    refetch: refetchCasos,
  } = useGraphQLQuery<{
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

  const metricas = useMemo(
    () => (r ? construirMetricasMiDia(r) : []),
    [r],
  );

  const {
    selectedIndex,
    setSelectedIndex,
    casoSeleccionado,
    avanzarTrasId,
    mover,
  } = useColaOperativa(casos);

  useEffect(() => {
    const el = document.querySelector(
      `[data-caso-id="${casoSeleccionado?.idprestamo ?? ''}"]`,
    );
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [casoSeleccionado?.idprestamo]);

  const notificarAvance = (
    accion: 'gestion' | 'pago',
    next: MiDiaCaso | null,
  ) => {
    const idx = next
      ? casos.findIndex((c) => c.idprestamo === next.idprestamo)
      : -1;
    notificationToast.success(
      mensajeAvanceOperativo({
        accion,
        haySiguiente: Boolean(next),
        posicionSiguiente: idx >= 0 ? idx + 1 : undefined,
        total: casos.length,
      }),
    );
  };

  const hotkeys = useMemo(
    () => [
      {
        key: 'j',
        handler: () => mover(1),
        enabled: casos.length > 0,
      },
      {
        key: 'k',
        handler: () => mover(-1),
        enabled: casos.length > 0,
      },
      {
        key: 'b',
        handler: () => router.push('/cobranza/bandeja'),
      },
      {
        key: 'p',
        enabled: puedePago && Boolean(casoSeleccionado),
        handler: () => {
          if (casoSeleccionado) {
            setPagoPrestamoId(casoSeleccionado.idprestamo);
          }
        },
      },
      {
        key: 'g',
        enabled: puedeGestion && Boolean(casoSeleccionado),
        handler: () => {
          if (casoSeleccionado) {
            setGestionPrestamoId(casoSeleccionado.idprestamo);
          }
        },
      },
      {
        key: 'n',
        enabled: Boolean(casoSeleccionado),
        handler: () => {
          if (casoSeleccionado) {
            router.push(`/cobranza/prestamos/${casoSeleccionado.idprestamo}`);
          }
        },
      },
    ],
    [router, puedeGestion, puedePago, casoSeleccionado, casos.length, mover],
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
    <div className="field-layout space-y-6" data-ux-id="mi-dia-page">
      <OperacionHotkeysHelp atajos={ATAJOS_MI_DIA} />
      <PageHeader
        title="Mi día"
        description="Prioridades y estación de trabajo para hoy."
        actions={
          <div className="field-sticky-actions flex flex-wrap gap-2">
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
        {r && <DashboardMetricStrip metrics={metricas} />}
      </AsyncPanel>

      {r && r.promesasVencidas > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">
              {r.promesasVencidas}{' '}
              {r.promesasVencidas === 1
                ? 'promesa vencida'
                : 'promesas vencidas'}
            </p>
            <p className="mt-0.5 text-sm text-amber-800/80 dark:text-amber-300/80">
              Priorice el seguimiento para recuperar el compromiso de pago.
            </p>
          </div>
          <Link href="/cobranza/bandeja?soloPromesaVencida=1">
            <Button size="sm" variant="outline">
              Ver en bandeja
            </Button>
          </Link>
        </div>
      )}

      <AsyncPanel
        isLoading={agendaLoading}
        isEmpty={agendaSecuencia.length === 0}
        emptyMessage="Sin contactos de secuencia programados para hoy."
      >
        {agendaSecuencia.length > 0 && (
          <section className="rounded-xl border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-dark dark:text-white">
                Secuencia de contacto — hoy
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Contactos programados por secuencia para esta jornada.
              </p>
            </div>
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
                    <tr className="border-b border-stroke bg-gray-2/50 text-left dark:border-dark-3 dark:bg-dark-2/40">
                      <th className="px-4 py-3 font-semibold text-dark dark:text-white">
                        Préstamo
                      </th>
                      <th className="px-4 py-3 font-semibold text-dark dark:text-white">
                        Cliente
                      </th>
                      <th className="px-4 py-3 font-semibold text-dark dark:text-white">
                        Canal
                      </th>
                      <th className="px-4 py-3 font-semibold text-dark dark:text-white">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendaSecuencia.map((item) => (
                      <tr
                        key={`${item.idprestamo}-${item.idpaso}`}
                        className="border-b border-stroke dark:border-dark-3"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/cobranza/prestamos/${item.idprestamo}`}
                            className="text-primary hover:underline"
                          >
                            {item.noPrestamo}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{item.nombreCliente}</td>
                        <td className="px-4 py-3">{item.canal}</td>
                        <td className="px-4 py-3">{item.accion ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
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
          <div
            className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]"
            data-ux-id="estacion-mi-dia"
          >
            <div
              className={cn(
                'overflow-hidden rounded-lg bg-white shadow-1 dark:bg-gray-dark',
                casoSeleccionado && 'ring-1 ring-primary/20',
              )}
            >
              <div className="border-b border-stroke px-4 py-3 dark:border-dark-3 sm:px-6">
                <h2 className="text-lg font-semibold text-dark dark:text-white">
                  Casos prioritarios
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Recuperar primero · use J/K para navegar
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2/50 text-left dark:border-dark-3 dark:bg-dark-2/40">
                      <th className="px-4 py-3 font-semibold text-dark dark:text-white">
                        Préstamo
                      </th>
                      <th className="px-4 py-3 font-semibold text-dark dark:text-white">
                        Cliente
                      </th>
                      <th className="px-4 py-3 font-semibold text-dark dark:text-white">
                        Prioridad
                      </th>
                      <th className="px-4 py-3 font-semibold text-dark dark:text-white">
                        Saldo
                      </th>
                      <th className="px-4 py-3 font-semibold text-dark dark:text-white">
                        Mora
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {casos.map((c, idx) => (
                      <tr
                        key={c.idprestamo}
                        data-caso-id={c.idprestamo}
                        aria-selected={idx === selectedIndex}
                        className={cn(
                          'cursor-pointer border-b border-stroke transition-colors dark:border-dark-3',
                          idx === selectedIndex
                            ? 'bg-primary/5 dark:bg-primary/10'
                            : 'hover:bg-gray-2/60 dark:hover:bg-dark-2/50',
                        )}
                        onClick={() => setSelectedIndex(idx)}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/cobranza/prestamos/${c.idprestamo}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.noPrestamo}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{c.nombreCliente}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium tabular-nums">
                            {Math.round(c.scorePrioridad)}
                          </span>
                          <p className="text-xs text-gray-500">
                            {c.motivoPrioridad}
                          </p>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatearMoneda(c.saldoTotal)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {c.diasMora}d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:sticky lg:top-4 lg:self-start">
              <EstacionCasoPanel
                caso={
                  casoSeleccionado
                    ? {
                        idprestamo: casoSeleccionado.idprestamo,
                        noPrestamo: casoSeleccionado.noPrestamo,
                        nombreCliente: casoSeleccionado.nombreCliente,
                        saldoTotal: casoSeleccionado.saldoTotal,
                        diasMora: casoSeleccionado.diasMora,
                        telefono: casoSeleccionado.telefono,
                        motivoPrioridad: casoSeleccionado.motivoPrioridad,
                        scorePrioridad: casoSeleccionado.scorePrioridad,
                      }
                    : null
                }
                posicion={selectedIndex + 1}
                total={casos.length}
                puedeGestion={puedeGestion}
                puedePago={puedePago}
                onTipificar={() => {
                  if (casoSeleccionado) {
                    setGestionPrestamoId(casoSeleccionado.idprestamo);
                  }
                }}
                onPago={() => {
                  if (casoSeleccionado) {
                    setPagoPrestamoId(casoSeleccionado.idprestamo);
                  }
                }}
              />
            </div>
          </div>
        )}
      </AsyncPanel>

      <section className="rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-dark dark:text-white">
              Progreso de recuperación
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Opcional · no interrumpe el flujo operativo
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            data-ux-id="mi-dia-gamif-quiet"
            onClick={toggleGamifQuiet}
          >
            {gamifQuiet ? 'Mostrar' : 'Ocultar'}
          </Button>
        </div>
        {!gamifQuiet && (
          <AsyncPanel
            isLoading={gamifLoading}
            isEmpty={!g}
            emptyMessage="Sin datos de recuperación para su usuario."
          >
            {g && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-5">
                    Recuperado (30d)
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-primary">
                    {formatearMoneda(g.montoRecuperado)}
                  </p>
                </div>
                <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-5">
                    Promesas cumplidas
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-dark dark:text-white">
                    {g.promesasCumplidas}
                  </p>
                </div>
                <Link
                  href="/cobranza/gamificacion"
                  className="text-sm text-primary hover:underline sm:col-span-2"
                >
                  Ver detalle de desempeño
                </Link>
              </div>
            )}
          </AsyncPanel>
        )}
      </section>

      {puedeGestion && gestionPrestamoId != null && (
        <GestionRapidaModal
          key={`ges-${gestionPrestamoId}`}
          idprestamo={gestionPrestamoId}
          onClose={() => setGestionPrestamoId(null)}
          onSuccess={() => {
            const actual = gestionPrestamoId;
            void refetchResumen();
            void refetchCasos();
            void refetchAgenda();
            const next = avanzarTrasId(actual);
            notificarAvance('gestion', next);
            if (!next) {
              return;
            }
            setGestionPrestamoId(next.idprestamo);
            return false;
          }}
        />
      )}
      {puedePago && pagoPrestamoId != null && (
        <PagoRapidaModal
          key={`pago-${pagoPrestamoId}`}
          idprestamo={pagoPrestamoId}
          onClose={() => setPagoPrestamoId(null)}
          onSuccess={() => {
            const actual = pagoPrestamoId;
            void refetchResumen();
            void refetchCasos();
            const next = avanzarTrasId(actual);
            notificarAvance('pago', next);
            if (!next) {
              return;
            }
            setPagoPrestamoId(next.idprestamo);
            return false;
          }}
        />
      )}
    </div>
  );
}
