"use client";

interface Promesa {
  idpromesa: number;
  idprestamo: number;
  codigoPrestamo: string;
  cliente: string;
  fechaPromesa: string;
  montoCompromiso: number;
  diasVencidos: number;
  gestor: string | null;
}

interface PromesasTableProps {
  promesas: Promesa[];
  total: number;
  montoTotal: number;
  loading?: boolean;
}

export function PromesasTable({ promesas, total, montoTotal, loading }: PromesasTableProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("es-PY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
        <h3 className="text-lg font-semibold text-dark dark:text-white">
          Promesas Vencidas Hoy
        </h3>
        <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
          {total} promesas
        </span>
      </div>

      {total === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <p>No hay promesas vencidas hoy</p>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-300">Monto Total Vencido</p>
            <p className="text-xl font-bold text-dark dark:text-white">
              {formatCurrency(montoTotal)}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">
                    Préstamo
                  </th>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Cliente</th>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Fecha</th>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Días</th>
                  <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Monto</th>
                </tr>
              </thead>
              <tbody>
                {promesas.slice(0, 5).map((promesa) => (
                  <tr
                    key={promesa.idpromesa}
                    className="border-b border-stroke dark:border-dark-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-3 py-2 font-medium text-dark dark:text-white">
                      {promesa.codigoPrestamo}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {promesa.cliente}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {formatDate(promesa.fechaPromesa)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          promesa.diasVencidos > 7
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}
                      >
                        {promesa.diasVencidos} días
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-dark dark:text-white">
                      {formatCurrency(promesa.montoCompromiso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {promesas.length > 5 && (
              <p className="mt-2 text-center text-xs text-gray-500">
                Mostrando 5 de {promesas.length} promesas
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}



