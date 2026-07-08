'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_SECUENCIAS_MANDANTE } from '@/lib/graphql/queries/cobranza.queries';
import type { Mandante } from '@/types/cobranza';

interface SecuenciaMandanteRow {
  idsecuencia: number;
  idcampana: number;
  nombre: string;
  estado: string;
  campanaNombre: string;
  pasos: Array<{
    orden: number;
    diasDesdeInicio: number;
    canal: string;
    accion: string | null;
    plantillaNombre: string | null;
  }>;
}

interface SecuenciasMandantePanelProps {
  mandante: Mandante;
}

export function SecuenciasMandantePanel({ mandante }: SecuenciasMandantePanelProps) {
  const { data, isLoading, error } = useGraphQLQuery<{
    secuenciasPorMandante: SecuenciaMandanteRow[];
  }>(GET_SECUENCIAS_MANDANTE, { idmandante: mandante.idmandante });

  const secuencias = data?.secuenciasPorMandante ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Secuencias de contacto</h2>
          <p className="text-sm text-gray-500">
            Flujos omnicanal asociados a campañas del mandante.
          </p>
        </div>
        <Link href={`/cobranza/campanas/wizard?idmandante=${mandante.idmandante}`}>
          <Button size="sm">Nueva secuencia (wizard)</Button>
        </Link>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500">Cargando secuencias...</p>
      )}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {secuencias.length === 0 && !isLoading && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500 dark:border-dark-3">
          No hay secuencias para este mandante. Cree una desde el wizard de
          campañas.
        </p>
      )}

      <div className="space-y-3">
        {secuencias.map((sec) => (
          <div
            key={sec.idsecuencia}
            className="rounded-lg border p-4 dark:border-dark-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{sec.nombre}</p>
                <p className="text-xs text-gray-500">
                  Campaña: {sec.campanaNombre} · {sec.estado}
                </p>
              </div>
              <Link href={`/cobranza/campanas?idmandante=${mandante.idmandante}`}>
                <Button size="sm" variant="outline">
                  Ver campaña
                </Button>
              </Link>
            </div>
            <ol className="mt-3 space-y-1 text-sm">
              {sec.pasos.map((paso) => (
                <li key={paso.orden} className="flex gap-2 text-gray-600 dark:text-gray-300">
                  <span className="font-mono text-xs text-gray-400">
                    D+{paso.diasDesdeInicio}
                  </span>
                  <span>
                    {paso.canal}
                    {paso.accion ? ` — ${paso.accion}` : ''}
                    {paso.plantillaNombre ? ` (${paso.plantillaNombre})` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
