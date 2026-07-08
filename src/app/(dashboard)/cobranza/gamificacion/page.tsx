'use client';

import { useState } from 'react';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { PageHeader } from '@/components/ui/page-header';
import {
  GET_RANKING_COBRADORES,
  GET_MI_GAMIFICACION,
  GET_METAS_GAMIFICACION,
} from '@/lib/graphql/queries/cobranza.queries';
import { type MetasGamificacion, type RankingCobrador , formatearMoneda } from '@/types/cobranza';


export default function GamificacionPage() {
  const [periodoDias, setPeriodoDias] = useState(30);

  const { data, isLoading } = useGraphQLQuery<{
    rankingCobradores: RankingCobrador[];
  }>(GET_RANKING_COBRADORES, { periodoDias });

  const { data: miData } = useGraphQLQuery<{
    miGamificacion: RankingCobrador | null;
  }>(GET_MI_GAMIFICACION);

  const { data: metasData } = useGraphQLQuery<{
    metasGamificacion: MetasGamificacion;
  }>(GET_METAS_GAMIFICACION);

  const ranking = data?.rankingCobradores ?? [];
  const yo = miData?.miGamificacion;
  const metas = metasData?.metasGamificacion;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gamificación"
        description="Rankings, niveles e insignias por desempeño de recuperación."
        actions={
          <select
            aria-label="Periodo del ranking"
            className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
            value={periodoDias}
            onChange={(e) => setPeriodoDias(Number(e.target.value))}
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        }
      />

      {metas && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4 dark:border-dark-3">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium">Meta gestiones semana</span>
              <span>
                {metas.gestionesSemana} / {metas.metaGestionesSemana}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
              <div
                className={`h-full rounded-full ${
                  metas.metaGestionesCumplida ? 'bg-green-500' : 'bg-primary'
                }`}
                style={{ width: `${metas.pctGestiones}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg border p-4 dark:border-dark-3">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium">Meta recuperación semana</span>
              <span>
                {formatearMoneda(metas.recuperacionSemana)} /{' '}
                {formatearMoneda(metas.metaRecuperacionSemana)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
              <div
                className={`h-full rounded-full ${
                  metas.metaRecuperacionCumplida ? 'bg-green-500' : 'bg-primary'
                }`}
                style={{ width: `${metas.pctRecuperacion}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {yo && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-semibold text-primary">Tu posición</h2>
          <div className="mt-3 flex flex-wrap gap-6">
            <div>
              <p className="text-sm text-gray-500">Puesto</p>
              <p className="text-3xl font-bold">#{yo.posicion}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Nivel</p>
              <p className="text-3xl font-bold">{yo.nivel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">XP</p>
              <p className="text-3xl font-bold">{yo.xp}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Recuperado</p>
              <p className="text-2xl font-bold">
                {formatearMoneda(yo.montoRecuperado)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Promesas cumplidas</p>
              <p className="text-2xl font-bold">{yo.promesasCumplidas}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-gray-500">Cargando ranking...</p>
      )}

      <div className="overflow-x-auto rounded-lg border dark:border-dark-3">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-dark-2">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Cobrador</th>
              <th className="px-4 py-3 text-left">Nivel</th>
              <th className="px-4 py-3 text-right">XP</th>
              <th className="px-4 py-3 text-right">Gestiones</th>
              <th className="px-4 py-3 text-right">Promesas</th>
              <th className="px-4 py-3 text-right">Recuperado</th>
              <th className="px-4 py-3 text-left">Insignias</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row) => (
              <tr key={row.idgestor} className="border-t dark:border-dark-3">
                <td className="px-4 py-3 font-bold text-primary">
                  {row.posicion}
                </td>
                <td className="px-4 py-3 font-medium">{row.nombre}</td>
                <td className="px-4 py-3">{row.nivel}</td>
                <td className="px-4 py-3 text-right">{row.xp}</td>
                <td className="px-4 py-3 text-right">{row.gestiones}</td>
                <td className="px-4 py-3 text-right">{row.promesasCumplidas}</td>
                <td className="px-4 py-3 text-right">
                  {formatearMoneda(row.montoRecuperado)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.insignias.map((ins) => (
                      <span
                        key={ins}
                        className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-dark-2"
                      >
                        {ins}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
