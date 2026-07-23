'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useCatalogosTipificaciones } from '@/hooks/use-catalogos-tipificaciones';
import {
  GET_PLANTILLAS_MENSAJE,
  GET_CODIGOS_ACCION_MANDANTE,
  GET_CODIGOS_RESULTADO_MANDANTE,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  aplicarVariablesPlantilla,
  construirVariablesPlantilla,
  enlaceWhatsApp,
  type PlantillaMensajeContext,
} from '@/lib/cobranza/plantilla-mensaje-utils';
import {
  LEY_787,
  scriptConfirmacionVerbal,
} from '@/lib/compliance/ley-787-microcopy';
import {
  resultadoRequierePromesa,
  resultadoRequiereProximaGestion,
} from '@/lib/logic/resultado-tipificacion-logic';
import type { CodigoAccion, CodigoResultado, PlantillaMensaje } from '@/types/cobranza';

export interface GestionFormData {
  idcodaccion?: number;
  idcodresultado?: number;
  telefonoContacto?: string;
  contactoTercero: boolean;
  nota: string;
  razonMora?: string;
  montoPromesa?: number;
  fechaPromesa?: string;
  fechaProximaGestion?: string;
  comentario?: string;
  latitud?: number;
  longitud?: number;
}

interface GestionFormProps {
  idmandante?: number;
  plantillaContext?: PlantillaMensajeContext;
  noPrestamo?: string;
  nombreCliente?: string;
  saldoTotal?: number;
  celularCliente?: string | null;
  initialNota?: string;
  modoRapido?: boolean;
  /**
   * En modoRapido, un clic en chip tipifica y envía (1 clic).
   * Doble control: el usuario puede expandir catálogo completo.
   */
  tipificarUnClic?: boolean;
  onSubmit: (data: GestionFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  /** Bloquea el submit (p. ej. fuera de horario Ley 787). */
  submitDisabled?: boolean;
}

export function GestionForm({
  idmandante,
  plantillaContext,
  noPrestamo,
  nombreCliente,
  saldoTotal,
  celularCliente,
  initialNota,
  modoRapido = false,
  tipificarUnClic = true,
  onSubmit,
  onCancel,
  isLoading,
  submitDisabled = false,
}: GestionFormProps) {
  const [form, setForm] = useState<GestionFormData>({
    contactoTercero: false,
    nota: initialNota ?? '',
    telefonoContacto: celularCliente ?? '',
  });
  const [capturandoGps, setCapturandoGps] = useState(false);
  const [mostrarMas, setMostrarMas] = useState(!modoRapido);
  const [mostrarCatalogo, setMostrarCatalogo] = useState(!modoRapido);
  /** En modo rápido el script se muestra para usarlo en la llamada. */
  const [scriptVisible, setScriptVisible] = useState(modoRapido);
  const [avisoCamposExtra, setAvisoCamposExtra] = useState<string | null>(null);

  useEffect(() => {
    if (initialNota) {
      setForm((prev) => ({ ...prev, nota: initialNota }));
    }
  }, [initialNota]);

  useEffect(() => {
    if (celularCliente) {
      setForm((prev) => ({
        ...prev,
        telefonoContacto: prev.telefonoContacto || celularCliente,
      }));
    }
  }, [celularCliente]);

  const { data: accionesMandante } = useGraphQLQuery<{
    codigosAccionPorMandante: CodigoAccion[];
  }>(
    GET_CODIGOS_ACCION_MANDANTE,
    { idmandante: idmandante ?? 0 },
    { enabled: !!idmandante },
  );

  const { data: catalogoGlobal } = useCatalogosTipificaciones(!idmandante);

  const { data: resultadosMandante } = useGraphQLQuery<{
    codigosResultadoPorMandante: CodigoResultado[];
  }>(
    GET_CODIGOS_RESULTADO_MANDANTE,
    { idmandante: idmandante ?? 0 },
    { enabled: !!idmandante },
  );

  const { data: plantillasData } = useGraphQLQuery<{
    plantillasMensaje: {
      plantillas: PlantillaMensaje[];
    };
  }>(
    GET_PLANTILLAS_MENSAJE,
    { idmandante: idmandante ?? 0, page: 1, pageSize: 100 },
    { enabled: !!idmandante && !modoRapido },
  );

  const acciones =
    accionesMandante?.codigosAccionPorMandante ??
    catalogoGlobal?.acciones ??
    [];
  const resultados =
    resultadosMandante?.codigosResultadoPorMandante ??
    catalogoGlobal?.resultados ??
    [];
  const plantillas = plantillasData?.plantillasMensaje?.plantillas ?? [];

  const varsPlantilla = plantillaContext
    ? construirVariablesPlantilla(plantillaContext)
    : {
        nombre: nombreCliente ?? '',
        prestamo: noPrestamo ?? '',
        saldo: saldoTotal != null ? String(saldoTotal) : '',
        telefono: celularCliente ?? '',
      };

  const scriptVerbal = scriptConfirmacionVerbal({
    nombre: nombreCliente,
  });

  const notaVacia = !form.nota.trim();
  const motivoSubmitBloqueado = submitDisabled
    ? 'Fuera de horario de cobranza: no se puede registrar ahora.'
    : notaVacia
      ? 'Escriba una nota o tipifique un resultado para habilitar el registro.'
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled || notaVacia) {
      setAvisoCamposExtra(
        motivoSubmitBloqueado ??
          'Complete la nota antes de registrar la gestión.',
      );
      return;
    }
    const seleccionado = resultados.find(
      (r) => r.idcodresultado === form.idcodresultado,
    );
    if (seleccionado && resultadoRequierePromesa(seleccionado)) {
      if (!form.montoPromesa || !form.fechaPromesa) {
        setMostrarMas(true);
        setAvisoCamposExtra(
          'Complete monto y fecha de promesa antes de guardar.',
        );
        return;
      }
    }
    if (
      seleccionado &&
      resultadoRequiereProximaGestion(seleccionado) &&
      !form.fechaProximaGestion
    ) {
      setMostrarMas(true);
      setAvisoCamposExtra('Indique la fecha de próxima gestión.');
      return;
    }
    setAvisoCamposExtra(null);
    onSubmit(form);
  };

  const capturarUbicacion = () => {
    if (!navigator.geolocation) {
      return;
    }
    setCapturandoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm({
          ...form,
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
        });
        setCapturandoGps(false);
      },
      () => setCapturandoGps(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  /**
   * Tipificar: 1 clic guarda salvo promesa/agenda/tercero (pide campos extra).
   */
  const tipificarRapido = (resultado: CodigoResultado) => {
    if (submitDisabled || isLoading) {
      return;
    }
    const next: GestionFormData = {
      ...form,
      idcodresultado: resultado.idcodresultado,
      nota:
        form.nota.trim() && form.idcodresultado === resultado.idcodresultado
          ? form.nota
          : `${resultado.codigo} — ${resultado.descripcion}`,
    };
    setForm(next);

    const pidePromesa = resultadoRequierePromesa(resultado);
    const pideAgenda = resultadoRequiereProximaGestion(resultado);
    if (pidePromesa || pideAgenda) {
      setMostrarMas(true);
      setAvisoCamposExtra(
        pidePromesa
          ? 'Promesa: complete monto y fecha, luego Registrar gestión.'
          : 'Agenda: indique próxima gestión, luego Registrar gestión.',
      );
      return;
    }

    if (
      modoRapido &&
      tipificarUnClic &&
      next.nota.trim() &&
      !(next.contactoTercero && !next.comentario?.trim())
    ) {
      setAvisoCamposExtra(null);
      onSubmit(next);
    }
  };

  const resultadosRapidos = resultados.slice(0, 6);
  const mostrarSelects = !modoRapido || mostrarCatalogo;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-ux-id="gestion-form"
    >
      {/* I184 — Script confirmación verbal (visible en modo rápido) */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-blue-950 dark:text-blue-100">
            {LEY_787.scriptVerbalTitulo}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-ux-id="gestion-script-toggle"
            onClick={() => setScriptVisible((v) => !v)}
          >
            {scriptVisible ? 'Ocultar' : 'Ver script'}
          </Button>
        </div>
        <p className="mt-1 text-xs text-blue-900/80 dark:text-blue-200/80">
          {LEY_787.scriptVerbalHint}
        </p>
        {scriptVisible && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-blue-950 dark:text-blue-50">
            {scriptVerbal}
          </p>
        )}
      </div>

      {plantillas.length > 0 && !modoRapido && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            Plantilla de mensaje
          </label>
          <div className="flex flex-wrap gap-2">
            {plantillas
              .filter((p) => p.estado)
              .map((p) => (
                <Button
                  key={p.idplantilla}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const texto = aplicarVariablesPlantilla(
                      p.contenido,
                      varsPlantilla,
                    );
                    setForm({ ...form, nota: texto });
                  }}
                >
                  {p.nombre}
                </Button>
              ))}
            {celularCliente && form.nota && (
              <a
                href={enlaceWhatsApp(celularCliente, form.nota)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-dark-2"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {/* I176 — Tipificación en ≤3 clics / 1 clic en modoRapido */}
      {modoRapido && resultadosRapidos.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            Tipificar (1 clic = guardar)
          </label>
          <p className="mb-2 text-xs text-gray-500">
            Excepciones: promesa, agenda o contacto a tercero piden datos
            extra antes de guardar.
          </p>
          {avisoCamposExtra && (
            <p className="mb-2 text-xs text-amber-700 dark:text-amber-300" role="status">
              {avisoCamposExtra}
            </p>
          )}
          {submitDisabled && (
            <p className="mb-2 text-xs text-red-600" role="alert">
              Fuera de horario de cobranza: no se puede tipificar ahora.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {resultadosRapidos.map((r) => {
              const descCorta =
                r.descripcion.length > 28
                  ? `${r.descripcion.slice(0, 28)}…`
                  : r.descripcion;
              return (
                <Button
                  key={r.idcodresultado}
                  type="button"
                  size="sm"
                  variant={
                    form.idcodresultado === r.idcodresultado
                      ? 'primary'
                      : 'outline'
                  }
                  disabled={isLoading || submitDisabled}
                  title={`${r.codigo} — ${r.descripcion}`}
                  aria-label={`Tipificar ${r.codigo}: ${r.descripcion}`}
                  data-ux-id={`tipificar-rapido-${r.codigo}`}
                  onClick={() => tipificarRapido(r)}
                >
                  <span className="font-semibold">{r.codigo}</span>
                  <span className="ml-1 font-normal opacity-80">
                    {descCorta}
                  </span>
                </Button>
              );
            })}
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-primary hover:underline"
            onClick={() => setMostrarCatalogo((v) => !v)}
          >
            {mostrarCatalogo
              ? 'Ocultar catálogo completo'
              : 'Más códigos (acción / resultado)'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {mostrarSelects && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Acción</label>
              <select
                value={form.idcodaccion ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    idcodaccion: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              >
                <option value="">Seleccione...</option>
                {acciones.map((a) => (
                  <option key={a.idcodaccion} value={a.idcodaccion}>
                    {a.codigo} — {a.descripcion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Resultado</label>
              <select
                value={form.idcodresultado ?? ''}
                onChange={(e) => {
                  const id = e.target.value
                    ? Number(e.target.value)
                    : undefined;
                  const seleccionado = resultados.find(
                    (r) => r.idcodresultado === id,
                  );
                  const notaAuto = seleccionado
                    ? `${seleccionado.codigo} — ${seleccionado.descripcion}`
                    : '';
                  setForm({
                    ...form,
                    idcodresultado: id,
                    nota:
                      form.nota.trim() &&
                      form.idcodresultado === id
                        ? form.nota
                        : notaAuto || form.nota,
                  });
                  if (seleccionado && resultadoRequierePromesa(seleccionado)) {
                    setMostrarMas(true);
                    setAvisoCamposExtra(
                      'Promesa: complete monto y fecha, luego Registrar gestión.',
                    );
                  } else if (
                    seleccionado &&
                    resultadoRequiereProximaGestion(seleccionado)
                  ) {
                    setMostrarMas(true);
                    setAvisoCamposExtra(
                      'Agenda: indique próxima gestión, luego Registrar gestión.',
                    );
                  } else {
                    setAvisoCamposExtra(null);
                  }
                }}
                className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              >
                <option value="">Seleccione...</option>
                {resultados.map((r) => (
                  <option key={r.idcodresultado} value={r.idcodresultado}>
                    {r.codigo} — {r.descripcion}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {(mostrarMas || !modoRapido) && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Teléfono contacto
              </label>
              <input
                type="text"
                value={form.telefonoContacto ?? ''}
                onChange={(e) =>
                  setForm({ ...form, telefonoContacto: e.target.value })
                }
                className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500">
                {LEY_787.contactoAutorizado}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Monto promesa
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.montoPromesa ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    montoPromesa: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Fecha promesa
              </label>
              <input
                type="date"
                value={form.fechaPromesa ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    fechaPromesa: e.target.value || undefined,
                  })
                }
                className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Próxima gestión
              </label>
              <input
                type="date"
                value={form.fechaProximaGestion ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    fechaProximaGestion: e.target.value || undefined,
                  })
                }
                className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1 pt-2 md:col-span-2">
          <div className="flex items-center gap-2">
            <input
              id="contactoTercero"
              type="checkbox"
              checked={form.contactoTercero}
              onChange={(e) =>
                setForm({ ...form, contactoTercero: e.target.checked })
              }
            />
            <label htmlFor="contactoTercero" className="text-sm">
              {LEY_787.contactoTerceroLabel}
            </label>
          </div>
          <p className="text-xs text-gray-500">{LEY_787.contactoTerceroHint}</p>
        </div>

        {!modoRapido && (
          <div className="flex flex-col gap-1 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={capturandoGps}
              onClick={capturarUbicacion}
            >
              {capturandoGps ? 'Obteniendo GPS...' : 'Capturar ubicación'}
            </Button>
            {form.latitud != null && form.longitud != null && (
              <span className="text-xs text-gray-500">
                {form.latitud.toFixed(5)}, {form.longitud.toFixed(5)}
              </span>
            )}
          </div>
        )}
      </div>

      {modoRapido && (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setMostrarMas((v) => !v)}
        >
          {mostrarMas ? 'Ocultar campos extra' : 'Más opciones (promesa, fechas)'}
        </button>
      )}

      {(!modoRapido || !tipificarUnClic || mostrarCatalogo || form.nota) && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            Nota{modoRapido && tipificarUnClic ? '' : ' *'}
          </label>
          <textarea
            required={!modoRapido || !tipificarUnClic}
            rows={modoRapido ? 2 : 3}
            value={form.nota}
            onChange={(e) => setForm({ ...form, nota: e.target.value })}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
      )}

      {form.contactoTercero && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            {LEY_787.contactoTerceroJustificacionLabel}
          </label>
          <textarea
            rows={2}
            required
            value={form.comentario ?? ''}
            onChange={(e) =>
              setForm({ ...form, comentario: e.target.value })
            }
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
      )}

      {(avisoCamposExtra || motivoSubmitBloqueado) && (
        <p
          className="text-sm text-amber-700 dark:text-amber-300"
          role="status"
        >
          {avisoCamposExtra ?? motivoSubmitBloqueado}
        </p>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <PermissionGate
          permiso={PERMISO.GESTION_WRITE}
          fallback={
            <p className="text-sm text-red-600" role="alert">
              No tiene permiso para registrar gestiones.
            </p>
          }
        >
          <Button
            type="submit"
            disabled={isLoading || submitDisabled || notaVacia}
            data-ux-id="gestion-submit"
            title={motivoSubmitBloqueado ?? undefined}
          >
            {isLoading ? 'Guardando...' : 'Registrar gestión'}
          </Button>
        </PermissionGate>
      </div>
    </form>
  );
}
