"use client";

interface Gestor {
  idusuario: number;
  nombre: string;
  email: string;
  cantidadPrestamos: number;
  montoTotal: number;
  montoRecuperado: number;
  porcentajeRecuperacion: number;
  moraPromedio: number;
  posicion: number;
}

interface RankingGestoresTableProps {
  ranking: Gestor[];
  periodo: string;
  loading?: boolean;
}

export function RankingGestoresTable({
  ranking,
  periodo,
  loading,
}: RankingGestoresTableProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getBadgeColor = (posicion: number): string => {
    if (posicion === 1) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    if (posicion === 2) return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    if (posicion === 3) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark dark:text-white">Ranking de Gestores</h3>
        <span className="text-xs text-gray-500">{periodo}</span>
      </div>

      {ranking.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <p>No hay datos disponibles</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3">
                <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">#</th>
                <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Gestor</th>
                <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">
                  Recuperación
                </th>
                <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Mora</th>
              </tr>
            </thead>
            <tbody>
              {ranking.slice(0, 10).map((gestor) => (
                <tr
                  key={gestor.idusuario}
                  className="border-b border-stroke dark:border-dark-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${getBadgeColor(gestor.posicion)}`}>
                      #{gestor.posicion}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div>
                      <p className="font-medium text-dark dark:text-white">{gestor.nombre}</p>
                      <p className="text-xs text-gray-500">{gestor.cantidadPrestamos} préstamos</p>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div>
                      <p className="font-semibold text-green-600">
                        {gestor.porcentajeRecuperacion.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(gestor.montoRecuperado)}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`font-medium ${
                        gestor.moraPromedio > 30
                          ? "text-red-600"
                          : gestor.moraPromedio > 15
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {gestor.moraPromedio.toFixed(1)} días
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ranking.length > 10 && (
            <p className="mt-2 text-center text-xs text-gray-500">
              Mostrando top 10 de {ranking.length} gestores
            </p>
          )}
        </div>
      )}
    </div>
  );
}



