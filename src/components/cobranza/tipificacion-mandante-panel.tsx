'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_TIPIFICACIONES_MANDANTE,
  GET_CODIGOS_ACCION_MANDANTE,
  GET_CODIGOS_RESULTADO_MANDANTE,
  ADD_TIPIFICACION_MANDANTE,
  REMOVE_TIPIFICACION_MANDANTE,
} from '@/lib/graphql/queries/cobranza.queries';
import type {
  CodigoAccion,
  CodigoResultado,
  Mandante,
  MandanteTipificacion,
} from '@/types/cobranza';

interface TipificacionMandantePanelProps {
  mandante: Mandante;
}

export function TipificacionMandantePanel({
  mandante,
}: TipificacionMandantePanelProps) {
  const [idcodaccion, setIdcodaccion] = useState<number | ''>('');
  const [idcodresultado, setIdcodresultado] = useState<number | ''>('');

  const { data, refetch, isLoading } = useGraphQLQuery<{
    tipificacionesMandante: MandanteTipificacion[];
  }>(GET_TIPIFICACIONES_MANDANTE, { idmandante: mandante.idmandante });

  const { data: accionesData } = useGraphQLQuery<{
    codigosAccionPorMandante: CodigoAccion[];
  }>(GET_CODIGOS_ACCION_MANDANTE, { idmandante: mandante.idmandante });

  const { data: resultadosData } = useGraphQLQuery<{
    codigosResultadoPorMandante: CodigoResultado[];
  }>(GET_CODIGOS_RESULTADO_MANDANTE, { idmandante: mandante.idmandante });

  const addMutation = useGraphQLMutation(ADD_TIPIFICACION_MANDANTE, {
    onSuccess: () => {
      refetch();
      setIdcodaccion('');
      setIdcodresultado('');
    },
  });

  const removeMutation = useGraphQLMutation(REMOVE_TIPIFICACION_MANDANTE, {
    onSuccess: () => refetch(),
  });

  const tips = data?.tipificacionesMandante ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Códigos permitidos para gestiones de este mandante. Si no configura
        ninguno, se muestran todos los códigos globales.
      </p>
      <form
        className="grid gap-2 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!idcodaccion && !idcodresultado) {
            return;
          }
          addMutation.mutate({
            idmandante: mandante.idmandante,
            idcodaccion: idcodaccion || undefined,
            idcodresultado: idcodresultado || undefined,
          });
        }}
      >
        <select
          value={idcodaccion}
          onChange={(e) =>
            setIdcodaccion(e.target.value ? Number(e.target.value) : '')
          }
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">Acción...</option>
          {(accionesData?.codigosAccionPorMandante ?? []).map((a) => (
            <option key={a.idcodaccion} value={a.idcodaccion}>
              {a.codigo} — {a.descripcion}
            </option>
          ))}
        </select>
        <select
          value={idcodresultado}
          onChange={(e) =>
            setIdcodresultado(e.target.value ? Number(e.target.value) : '')
          }
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">Resultado...</option>
          {(resultadosData?.codigosResultadoPorMandante ?? []).map((r) => (
            <option key={r.idcodresultado} value={r.idcodresultado}>
              {r.codigo} — {r.descripcion}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={addMutation.isPending}>
          Agregar
        </Button>
      </form>
      {isLoading && <p className="text-sm text-gray-500">Cargando...</p>}
      <ul className="divide-y text-sm">
        {tips.map((t) => (
          <li
            key={t.idmt}
            className="flex items-center justify-between py-2"
          >
            <span>
              {t.codaccion
                ? `Acción: ${t.codaccion.codigo}`
                : t.codresult
                  ? `Resultado: ${t.codresult.codigo}`
                  : '-'}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => removeMutation.mutate({ idmt: t.idmt })}
            >
              Quitar
            </Button>
          </li>
        ))}
      </ul>
      {!isLoading && tips.length === 0 && (
        <p className="text-sm text-gray-500">Sin tipificación configurada.</p>
      )}
    </div>
  );
}
