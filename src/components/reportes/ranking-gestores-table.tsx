"use client";

import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { RANKING_GESTORES } from "@/lib/graphql/queries/finanzas.queries";

type RankingItem = {
  idusuario: number;
  nombre: string;
  email: string;
  cantidadPrestamos: number;
  montoTotal: number;
  montoRecuperado: number;
  porcentajeRecuperacion: number;
  moraPromedio: number;
  posicion: number;
};

type RankingResponse = {
  rankingGestores: {
    items: RankingItem[];
    periodo: string;
  };
};

interface RankingGestoresTableProps {
  filters?: any;
}

const PosicionBadge: React.FC<{ posicion: number }> = ({ posicion }) => {
  const color =
    posicion === 1
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      : posicion === 2
      ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      : posicion === 3
      ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      #{posicion}
    </span>
  );
};

export function RankingGestoresTable({ filters }: RankingGestoresTableProps) {
  const { data, isLoading, isError } = useGraphQLQuery<RankingResponse>(
    RANKING_GESTORES,
    { filters }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (isError || !data?.rankingGestores) {
    return (
      <div className="flex items-center justify-center h-96 text-red-500">
        Error al cargar ranking de gestores
      </div>
    );
  }

  const { items, periodo } = data.rankingGestores;

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white">
          Ranking de Gestores
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Período: {periodo}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-3 text-sm">
          <thead className="bg-gray-50 dark:bg-dark-3">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">
                Posición
              </th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">
                Gestor
              </th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">
                Préstamos
              </th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">
                Monto Total
              </th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">
                Recuperado
              </th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">
                % Recuperación
              </th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">
                Mora Promedio
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-gray-600 dark:text-gray-300">
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.idusuario}
                  className="hover:bg-gray-50 dark:hover:bg-dark-3/60"
                >
                  <td className="px-4 py-2">
                    <PosicionBadge posicion={item.posicion} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-dark dark:text-white">
                        {item.nombre}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {item.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {item.cantidadPrestamos}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    ${(item.montoTotal / 1000).toFixed(0)}K
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    ${(item.montoRecuperado / 1000).toFixed(0)}K
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`font-semibold ${
                        item.porcentajeRecuperacion >= 80
                          ? "text-green-600 dark:text-green-400"
                          : item.porcentajeRecuperacion >= 60
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {item.porcentajeRecuperacion.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {item.moraPromedio.toFixed(1)} días
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}




