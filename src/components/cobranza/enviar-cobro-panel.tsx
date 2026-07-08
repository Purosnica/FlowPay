'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_PLANTILLAS_MENSAJE } from '@/lib/graphql/queries/cobranza.queries';
import {
  aplicarVariablesPlantilla,
  construirVariablesPlantilla,
  enlaceSms,
  enlaceWhatsApp,
  PLANTILLA_VARIABLES_AYUDA,
  type PlantillaMensajeContext,
} from '@/lib/cobranza/plantilla-mensaje-utils';
import type { PlantillaMensaje } from '@/types/cobranza';

interface EnviarCobroPanelProps {
  idmandante: number;
  idcliente?: number;
  context: PlantillaMensajeContext;
  telefonoOverride?: string;
  compact?: boolean;
  onUseAsNota?: (texto: string) => void;
}

export function EnviarCobroPanel({
  idmandante,
  context,
  telefonoOverride,
  compact = false,
  onUseAsNota,
}: EnviarCobroPanelProps) {
  const [canalFiltro, setCanalFiltro] = useState<string>('TODOS');
  const [idplantillaSel, setIdplantillaSel] = useState<number | ''>('');
  const [mensajeEditado, setMensajeEditado] = useState('');
  const [copiado, setCopiado] = useState(false);

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

  const plantillaActiva = plantillas.find(
    (p) => p.idplantilla === idplantillaSel,
  );

  const mensajePreview = useMemo(() => {
    const base = mensajeEditado || plantillaActiva?.contenido || '';
    return aplicarVariablesPlantilla(base, vars);
  }, [mensajeEditado, plantillaActiva, vars]);

  const seleccionarPlantilla = (p: PlantillaMensaje) => {
    setIdplantillaSel(p.idplantilla);
    setMensajeEditado(p.contenido);
  };

  const copiarMensaje = async () => {
    if (!mensajePreview.trim()) {
      return;
    }
    await navigator.clipboard.writeText(mensajePreview);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
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
        Antes de contactar verifique autorización del deudor, límite diario y
        horarios permitidos (Ley 787). La validación se aplica al registrar la
        gestión.
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
            <a
              href={enlaceSms(telefono, mensajePreview)}
              className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-dark-2"
            >
              SMS
            </a>
          </>
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

      {!telefono && (
        <p className="text-xs text-amber-600">
          Sin teléfono del deudor: puede copiar el mensaje manualmente.
        </p>
      )}
    </div>
  );
}
