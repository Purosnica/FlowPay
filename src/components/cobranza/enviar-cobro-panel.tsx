'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_PLANTILLAS_MENSAJE } from '@/lib/graphql/queries/cobranza.queries';
import {
  aplicarVariablesPlantilla,
  construirAsuntoCobroPlantilla,
  construirVariablesPlantilla,
  enlaceWhatsApp,
  PLANTILLA_VARIABLES_AYUDA,
  type PlantillaMensajeContext,
} from '@/lib/cobranza/plantilla-mensaje-utils';
import { csrfHeaders } from '@/lib/security/csrf';
import { LEY_787 } from '@/lib/compliance/ley-787-microcopy';
import type { PlantillaMensaje } from '@/types/cobranza';

interface EnviarCobroPanelProps {
  idmandante: number;
  idprestamo: number;
  idcliente?: number;
  context: PlantillaMensajeContext;
  telefonoOverride?: string;
  emailOverride?: string;
  compact?: boolean;
  onUseAsNota?: (texto: string) => void;
}

export function EnviarCobroPanel({
  idmandante,
  idprestamo,
  context,
  telefonoOverride,
  emailOverride,
  compact = false,
  onUseAsNota,
}: EnviarCobroPanelProps) {
  const [canalFiltro, setCanalFiltro] = useState<string>('TODOS');
  const [idplantillaSel, setIdplantillaSel] = useState<number | ''>('');
  const [mensajeEditado, setMensajeEditado] = useState('');
  const [asuntoEditado, setAsuntoEditado] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [enviandoSms, setEnviandoSms] = useState(false);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);

  const { data: plantillasData, isLoading } = useGraphQLQuery<{
    plantillasMensaje: {
      plantillas: PlantillaMensaje[];
    };
  }>(
    GET_PLANTILLAS_MENSAJE,
    { idmandante, page: 1, pageSize: 100 },
    { enabled: idmandante > 0 },
  );

  const plantillas = (plantillasData?.plantillasMensaje?.plantillas ?? []).filter(
    (p) => p.estado,
  );

  const canales = useMemo(() => {
    const set = new Set(plantillas.map((p) => p.canal));
    return ['TODOS', ...Array.from(set).sort()];
  }, [plantillas]);

  const plantillasFiltradas = useMemo(
    () =>
      canalFiltro === 'TODOS'
        ? plantillas
        : plantillas.filter((p) => p.canal === canalFiltro),
    [plantillas, canalFiltro],
  );

  const vars = useMemo(
    () => construirVariablesPlantilla(context),
    [context],
  );

  const telefono =
    telefonoOverride ??
    context.cliente?.celular ??
    context.cliente?.telefono ??
    '';

  const emailDeudor =
    emailOverride ?? context.cliente?.email ?? '';

  const plantillaActiva = plantillas.find(
    (p) => p.idplantilla === idplantillaSel,
  );

  const esCanalEmail = plantillaActiva?.canal === 'EMAIL';

  const mensajePreview = useMemo(() => {
    const base = mensajeEditado || plantillaActiva?.contenido || '';
    return aplicarVariablesPlantilla(base, vars);
  }, [mensajeEditado, plantillaActiva, vars]);

  const asuntoPreview = useMemo(() => {
    const base =
      asuntoEditado ||
      construirAsuntoCobroPlantilla(
        plantillaActiva?.nombre,
        context.prestamo.noPrestamo,
      );
    return aplicarVariablesPlantilla(base, vars);
  }, [
    asuntoEditado,
    plantillaActiva?.nombre,
    context.prestamo.noPrestamo,
    vars,
  ]);

  const seleccionarPlantilla = (p: PlantillaMensaje) => {
    setIdplantillaSel(p.idplantilla);
    setMensajeEditado(p.contenido);
    setAsuntoEditado(
      construirAsuntoCobroPlantilla(p.nombre, context.prestamo.noPrestamo),
    );
    setEmailStatus(null);
    setEmailError(null);
    setSmsStatus(null);
    setSmsError(null);
  };

  const copiarMensaje = async () => {
    if (!mensajePreview.trim()) {
      return;
    }
    await navigator.clipboard.writeText(mensajePreview);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const enviarPorSms = async () => {
    if (!telefono.trim() || !mensajePreview.trim()) {
      return;
    }
    setEnviandoSms(true);
    setSmsStatus(null);
    setSmsError(null);
    try {
      const res = await fetch('/api/cobranza/enviar-sms', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          telefono: telefono.trim(),
          mensaje: mensajePreview,
          idprestamo,
          idplantilla:
            typeof idplantillaSel === 'number' ? idplantillaSel : undefined,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'No se pudo encolar el SMS');
      }
      setSmsStatus(
        'SMS encolado; el gateway lo enviará en breve.',
      );
    } catch (err) {
      setSmsError(
        err instanceof Error ? err.message : 'Error al encolar SMS',
      );
    } finally {
      setEnviandoSms(false);
    }
  };

  const enviarPorEmail = async () => {
    if (!emailDeudor.trim() || !mensajePreview.trim()) {
      return;
    }
    setEnviandoEmail(true);
    setEmailStatus(null);
    setEmailError(null);
    try {
      const res = await fetch('/api/cobranza/enviar-email', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          to: emailDeudor.trim(),
          subject: asuntoPreview.trim(),
          body: mensajePreview,
          idprestamo,
          idplantilla:
            typeof idplantillaSel === 'number' ? idplantillaSel : undefined,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'No se pudo enviar el correo');
      }
      setEmailStatus(`Correo enviado a ${emailDeudor.trim()}`);
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : 'Error al enviar correo',
      );
    } finally {
      setEnviandoEmail(false);
    }
  };

  if (isLoading) {
    return (
      <p className="text-sm text-gray-500">Cargando plantillas...</p>
    );
  }

  if (plantillas.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No hay plantillas de mensaje para este mandante.
      </p>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <p className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        {LEY_787.enviarCobroHint}
      </p>

      <div className="flex flex-wrap gap-2">
        {canales.map((c) => (
          <Button
            key={c}
            type="button"
            size="sm"
            variant={canalFiltro === c ? 'primary' : 'outline'}
            onClick={() => setCanalFiltro(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Plantilla</label>
        <div className="flex flex-wrap gap-2">
          {plantillasFiltradas.map((p) => (
            <Button
              key={p.idplantilla}
              type="button"
              size="sm"
              variant={
                idplantillaSel === p.idplantilla ? 'primary' : 'outline'
              }
              onClick={() => seleccionarPlantilla(p)}
            >
              {p.nombre}
            </Button>
          ))}
        </div>
      </div>

      {plantillaActiva && (
        <p className="text-xs text-gray-500">
          {plantillaActiva.canal}
          {plantillaActiva.etapa ? ` · ${plantillaActiva.etapa}` : ''}
        </p>
      )}

      {(esCanalEmail || emailDeudor) && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            Asunto del correo
          </label>
          <input
            type="text"
            value={asuntoEditado}
            onChange={(e) => setAsuntoEditado(e.target.value)}
            placeholder="Asunto..."
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">
          Mensaje {plantillaActiva ? '(editable)' : ''}
        </label>
        <textarea
          rows={compact ? 6 : 10}
          value={mensajeEditado}
          onChange={(e) => setMensajeEditado(e.target.value)}
          placeholder="Seleccione una plantilla para previsualizar..."
          className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      </div>

      {!compact && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Variables disponibles</summary>
          <p className="mt-1">{PLANTILLA_VARIABLES_AYUDA.join(', ')}</p>
        </details>
      )}

      <div className="rounded-lg border border-stroke bg-gray-50 p-3 text-sm dark:border-dark-3 dark:bg-dark-2">
        <p className="mb-1 text-xs font-medium text-gray-500">Vista previa</p>
        {(esCanalEmail || emailDeudor) && asuntoPreview && (
          <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
            Asunto: {asuntoPreview}
          </p>
        )}
        <p className="whitespace-pre-wrap">{mensajePreview || '—'}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!mensajePreview.trim()}
          onClick={() => void copiarMensaje()}
        >
          {copiado ? 'Copiado' : 'Copiar'}
        </Button>
        {telefono && mensajePreview && (
          <>
            <a
              href={enlaceWhatsApp(telefono, mensajePreview)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
            >
              WhatsApp
            </a>
            <PermissionGate permiso={PERMISO.GESTION_WRITE}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={enviandoSms}
                onClick={() => void enviarPorSms()}
              >
                {enviandoSms ? 'Encolando...' : 'SMS'}
              </Button>
            </PermissionGate>
          </>
        )}
        {emailDeudor && mensajePreview && (
          <PermissionGate permiso={PERMISO.GESTION_WRITE}>
            <Button
              type="button"
              size="sm"
              disabled={enviandoEmail || !asuntoPreview.trim()}
              onClick={() => void enviarPorEmail()}
            >
              {enviandoEmail ? 'Enviando...' : 'Enviar email'}
            </Button>
          </PermissionGate>
        )}
        {onUseAsNota && mensajePreview && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onUseAsNota(mensajePreview)}
          >
            Usar en gestión
          </Button>
        )}
      </div>

      {emailDeudor && (
        <p className="text-xs text-gray-500">
          Destinatario: {emailDeudor}
        </p>
      )}
      {emailStatus && (
        <p className="text-xs text-green-700 dark:text-green-400">
          {emailStatus}
        </p>
      )}
      {emailError && (
        <p className="text-xs text-red-600 dark:text-red-400">{emailError}</p>
      )}
      {smsStatus && (
        <p className="text-xs text-green-700 dark:text-green-400">
          {smsStatus}
        </p>
      )}
      {smsError && (
        <p className="text-xs text-red-600 dark:text-red-400">{smsError}</p>
      )}

      {!telefono && !emailDeudor && (
        <p className="text-xs text-amber-600">
          Sin teléfono ni email del deudor: puede copiar el mensaje
          manualmente.
        </p>
      )}
      {telefono && !emailDeudor && (
        <p className="text-xs text-amber-600">
          Sin email del deudor: no se puede enviar por correo.
        </p>
      )}
    </div>
  );
}
