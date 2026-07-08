'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import {
  GET_PLANTILLAS_MENSAJE,
  GET_CODIGOS_ACCION_MANDANTE,
  GET_CODIGOS_RESULTADO_MANDANTE,
  GET_CODIGOS_ACCION,
  GET_CODIGOS_RESULTADO,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  aplicarVariablesPlantilla,
  construirVariablesPlantilla,
  enlaceWhatsApp,
  type PlantillaMensajeContext,
} from '@/lib/cobranza/plantilla-mensaje-utils';
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
  onSubmit: (data: GestionFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
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
  onSubmit,
  onCancel,
  isLoading,
}: GestionFormProps) {
  const [form, setForm] = useState<GestionFormData>({
    contactoTercero: false,
    nota: initialNota ?? '',
    telefonoContacto: celularCliente ?? '',
  });
  const [capturandoGps, setCapturandoGps] = useState(false);

  useEffect(() => {
    if (initialNota) {
      setForm((prev) => ({ ...prev, nota: initialNota }));
    }
  }, [initialNota]);

  const { data: accionesMandante } = useGraphQLQuery<{
    codigosAccionPorMandante: CodigoAccion[];
  }>(
    GET_CODIGOS_ACCION_MANDANTE,
    { idmandante: idmandante ?? 0 },
    { enabled: !!idmandante },
  );

  const { data: accionesGlobal } = useGraphQLQuery<{
    codigosAccion: CodigoAccion[];
  }>(GET_CODIGOS_ACCION, undefined, { enabled: !idmandante });

  const { data: resultadosMandante } = useGraphQLQuery<{
    codigosResultadoPorMandante: CodigoResultado[];
  }>(
    GET_CODIGOS_RESULTADO_MANDANTE,
    { idmandante: idmandante ?? 0 },
    { enabled: !!idmandante },
  );

  const { data: resultadosGlobal } = useGraphQLQuery<{
    codigosResultado: CodigoResultado[];
  }>(GET_CODIGOS_RESULTADO, undefined, { enabled: !idmandante });

  const { data: plantillasData } = useGraphQLQuery<{
    plantillasMensaje: {
      plantillas: PlantillaMensaje[];
    };
  }>(
    GET_PLANTILLAS_MENSAJE,
    { idmandante: idmandante ?? 0, page: 1, pageSize: 100 },
    { enabled: !!idmandante },
  );

  const acciones =
    accionesMandante?.codigosAccionPorMandante ??
    accionesGlobal?.codigosAccion ??
    [];
  const resultados =
    resultadosMandante?.codigosResultadoPorMandante ??
    resultadosGlobal?.codigosResultado ??
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nota.trim()) {
      return;
    }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
                    const texto = aplicarVariablesPlantilla(p.contenido, varsPlantilla);
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            onChange={(e) =>
              setForm({
                ...form,
                idcodresultado: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
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

        <div>
          <label className="mb-1 block text-sm font-medium">Teléfono contacto</label>
          <input
            type="text"
            value={form.telefonoContacto ?? ''}
            onChange={(e) =>
              setForm({ ...form, telefonoContacto: e.target.value })
            }
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Monto promesa</label>
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
          <label className="mb-1 block text-sm font-medium">Fecha promesa</label>
          <input
            type="date"
            value={form.fechaPromesa ?? ''}
            onChange={(e) =>
              setForm({ ...form, fechaPromesa: e.target.value || undefined })
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

        <div className="flex items-center gap-2 pt-6">
          <input
            id="contactoTercero"
            type="checkbox"
            checked={form.contactoTercero}
            onChange={(e) =>
              setForm({ ...form, contactoTercero: e.target.checked })
            }
          />
          <label htmlFor="contactoTercero" className="text-sm">
            Contacto a tercero (Ley 787)
          </label>
        </div>

        <div className="flex flex-col gap-1 pt-4">
          {!modoRapido && (
            <>
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
            </>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Nota *</label>
        <textarea
          required
          rows={3}
          value={form.nota}
          onChange={(e) => setForm({ ...form, nota: e.target.value })}
          className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      </div>

      {form.contactoTercero && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            Justificación (requerida para tercero)
          </label>
          <textarea
            rows={2}
            value={form.comentario ?? ''}
            onChange={(e) =>
              setForm({ ...form, comentario: e.target.value })
            }
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Registrar gestión'}
        </Button>
      </div>
    </form>
  );
}
