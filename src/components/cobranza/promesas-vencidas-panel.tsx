'use client';

import Link from 'next/link';
import { type PromesaVencida , formatearMoneda } from '@/types/cobranza';


interface PromesasVencidasPanelProps {
  promesas: PromesaVencida[];
  isLoading?: boolean;
  compact?: boolean;
}

export function PromesasVencidasPanel({
  promesas,
  isLoading,
  compact = false,
}: PromesasVencidasPanelProps) {
  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando promesas vencidas...</p>;
  }

  if (promesas.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No hay promesas de pago vencidas pendientes.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {!compact && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {promesas.length} promesa(s) de pago vencida(s) requieren seguimiento.
        </p>
      )}
      <ul className={`divide-y divide-stroke dark:divide-dark-3 ${compact ? 'text-sm' : ''}`}>
        {promesas.map((p) => (
          <li
            key={p.idgestion}
            className="flex flex-wrap items-center justify-between gap-2 py-2"
          >
            <div>
              <Link
                href={`/cobranza/prestamos/${p.idprestamo}`}
                className="font-medium text-primary hover:underline"
              >
                {p.noPrestamo}
              </Link>
              <span className="text-gray-500"> · {p.nombreCliente}</span>
              <p className="text-xs text-gray-500">
                Prometió {formatearMoneda(p.montoPromesa)} el{' '}
                {new Date(p.fechaPromesa).toLocaleDateString('es-NI')} (
                {p.diasVencidos} día(s) vencida)
              </p>
            </div>
            <Link
              href={`/cobranza/prestamos/${p.idprestamo}`}
              className="text-xs text-primary hover:underline"
            >
              Gestionar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
