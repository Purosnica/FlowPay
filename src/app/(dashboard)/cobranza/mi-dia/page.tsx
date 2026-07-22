'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/cobranza/kpi-card';
import { GestionRapidaModal } from '@/components/cobranza/gestion-rapida-modal';
import { PagoRapidaModal } from '@/components/cobranza/pago-rapida-modal';
import { SecuenciaLotePanel } from '@/components/cobranza/secuencia-lote-panel';
import { EstacionCasoPanel } from '@/components/cobranza/estacion-caso-panel';
import { HorarioAlerta } from '@/components/cobranza/horario-alerta';
import { OperacionHotkeysHelp } from '@/components/cobranza/operacion-hotkeys-help';
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
    <div className="field-layout space-y-8" data-ux-id="mi-dia-page">
      <OperacionHotkeysHelp atajos={ATAJOS_MI_DIA} />
      <PageHeader
        title="Mi día"
        description="Agenda operativa y prioridades. Atajos: J/K · P · G · N · B · ?"
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
          <div
            className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]"
            data-ux-id="estacion-mi-dia"
          >
            <div className="rounded-lg border border-stroke p-4 dark:border-dark-3 sm:p-6">
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
                      <th className="pb-2">Mora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {casos.map((c, idx) => (
                      <tr
                        key={c.idprestamo}
                        data-caso-id={c.idprestamo}
                        aria-selected={idx === selectedIndex}
                        className={cn(
                          'cursor-pointer border-b border-stroke dark:border-dark-3',
                          idx === selectedIndex &&
                            'bg-primary/5 dark:bg-primary/10',
                        )}
                        onClick={() => setSelectedIndex(idx)}
                      >
                        <td className="py-2 pr-4">
                          <Link
                            href={`/cobranza/prestamos/${c.idprestamo}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
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
                        <td className="py-2">{c.diasMora}d</td>
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

      <div className="rounded-lg border border-dashed border-stroke p-4 dark:border-dark-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            Progreso de recuperación (opcional)
          </p>
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
              <div className="mt-3">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Recuperado (30d)</p>
                    <p className="text-lg font-semibold text-primary">
                      {formatearMoneda(g.montoRecuperado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Promesas cumplidas</p>
                    <p className="text-lg font-semibold">
                      {g.promesasCumplidas}
                    </p>
                  </div>
                </div>
                <Link
                  href="/cobranza/gamificacion"
                  className="mt-3 inline-block text-sm text-primary hover:underline"
                >
                  Ver detalle de desempeño
                </Link>
              </div>
            )}
          </AsyncPanel>
        )}
      </div>

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
