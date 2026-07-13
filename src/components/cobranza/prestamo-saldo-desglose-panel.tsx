'use client';

import type { ReactNode } from 'react';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_DESGLOSE_SALDO_PRESTAMO } from '@/lib/graphql/queries/cobranza.queries';
import { formatearMoneda, type DesgloseSaldoPrestamo } from '@/types/cobranza';

interface PrestamoSaldoDesglosePanelProps {
  idprestamo: number;
  moneda: string;
  compact?: boolean;
}

type SignoFila = '+' | '−' | '=' | null;
type VarianteFila = 'normal' | 'subtotal' | 'total' | 'section';

interface FilaItem {
  key: string;
  etiqueta: string;
  valor: number;
  signo?: SignoFila;
  variante?: VarianteFila;
}

function construirFilas(desglose: DesgloseSaldoPrestamo): FilaItem[] {
  const filas: FilaItem[] = [
    { key: 'sec-comp', etiqueta: 'Componentes', valor: 0, variante: 'section' },
    {
      key: 'capital',
      etiqueta: 'Préstamo (capital)',
      valor: desglose.montoPrestamo,
      signo: '+',
    },
  ];

  const cargos: Array<[string, string, number]> = [
    ['interes', 'Interés corriente', desglose.interes],
    ['gestion', 'Gestión de cobranza', desglose.gestionCobranza],
    ['cav', 'Comisión CAV', desglose.comisionCav],
    ['insitu', 'Comisión Insitu', desglose.comisionInsitu],
    ['mant', 'Mantenimiento valor', desglose.mantenimientoValor],
    ['svsd', 'Seguro SVSD', desglose.seguroSvsd],
    ['admin', 'Cargos administrativos', desglose.cargosAdmin],
  ];
  for (const [key, etiqueta, valor] of cargos) {
    if (valor > 0) {
      filas.push({ key, etiqueta, valor, signo: '+' });
    }
  }

  if (desglose.devolucionSaldoFavor > 0) {
    filas.push({
      key: 'devolucion',
      etiqueta: 'Devolución saldo a favor',
      valor: desglose.devolucionSaldoFavor,
      signo: '−',
    });
  }
  if (desglose.descuentosArchivo > 0) {
    filas.push({
      key: 'descuentos',
      etiqueta: 'Descuentos (archivo)',
      valor: desglose.descuentosArchivo,
      signo: '−',
    });
  }

  filas.push({
    key: 'subtotal',
    etiqueta: 'Subtotal componentes',
    valor: desglose.subtotalComponentes,
    signo: '=',
    variante: 'subtotal',
  });

  filas.push({
    key: 'sec-saldo',
    etiqueta: 'Saldo',
    valor: 0,
    variante: 'section',
  });

  if (desglose.totalPagosAplicados > 0) {
    filas.push({
      key: 'pagos',
      etiqueta: 'Pagos aplicados',
      valor: desglose.totalPagosAplicados,
      signo: '−',
    });
  }

  filas.push({
    key: 'calculado',
    etiqueta: 'Saldo calculado',
    valor: desglose.saldoCalculado,
    signo: '=',
    variante: 'subtotal',
  });
  filas.push({
    key: 'registrado',
    etiqueta: 'Saldo registrado (archivo)',
    valor: desglose.saldoRegistrado,
  });

  if (
    desglose.interesMoratorio > 0 ||
    desglose.descuentoAcuerdoVigente > 0
  ) {
    filas.push({
      key: 'sec-acuerdo',
      etiqueta: 'Base de acuerdo',
      valor: 0,
      variante: 'section',
    });
    if (desglose.interesMoratorio > 0) {
      filas.push({
        key: 'moratorio',
        etiqueta: 'Interés moratorio (aparte)',
        valor: desglose.interesMoratorio,
        signo: '+',
      });
      filas.push({
        key: 'base',
        etiqueta: 'Base acuerdo',
        valor: desglose.baseAcuerdo,
        signo: '=',
        variante: 'subtotal',
      });
    }
    if (desglose.descuentoAcuerdoVigente > 0) {
      filas.push({
        key: 'desc-acuerdo',
        etiqueta: 'Descuento acuerdo vigente',
        valor: desglose.descuentoAcuerdoVigente,
        signo: '−',
      });
    }
  }

  if (!desglose.cuadra) {
    filas.push({
      key: 'diferencia',
      etiqueta: 'Diferencia',
      valor: desglose.diferencia,
      variante: 'total',
    });
  } else {
    filas.push({
      key: 'final',
      etiqueta: 'Saldo final',
      valor: desglose.saldoRegistrado,
      signo: '=',
      variante: 'total',
    });
  }

  return filas;
}

function SignoCell({ signo }: { signo: SignoFila }) {
  if (!signo) {
    return <td className="w-7 px-1 py-1" />;
  }

  const estilos =
    signo === '+'
      ? 'text-emerald-600 dark:text-emerald-400'
      : signo === '−'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-primary';

  return (
    <td
      className={`w-7 px-1 py-1 text-center text-xs font-semibold ${estilos}`}
    >
      {signo}
    </td>
  );
}

function FilaTabla({
  fila,
  fmt,
}: {
  fila: FilaItem;
  fmt: (n: number) => string;
}): ReactNode {
  if (fila.variante === 'section') {
    return (
      <tr key={fila.key} className="bg-gray-50 dark:bg-dark-2">
        <td
          colSpan={3}
          className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-5 dark:text-dark-6"
        >
          {fila.etiqueta}
        </td>
      </tr>
    );
  }

  const esTotal = fila.variante === 'total';
  const esSubtotal = fila.variante === 'subtotal';

  return (
    <tr
      key={fila.key}
      className={
        esTotal
          ? 'bg-primary/5 dark:bg-primary/10'
          : esSubtotal
            ? 'border-t border-stroke dark:border-dark-3'
            : 'border-b border-stroke/60 last:border-0 dark:border-dark-3/60'
      }
    >
      <SignoCell signo={fila.signo ?? null} />
      <td
        className={`py-1.5 pr-3 text-sm ${
          esTotal || esSubtotal
            ? 'font-semibold text-dark dark:text-white'
            : 'text-gray-6 dark:text-dark-6'
        }`}
      >
        {fila.etiqueta}
      </td>
      <td
        className={`whitespace-nowrap py-1.5 pl-2 pr-3 text-right text-sm tabular-nums ${
          esTotal
            ? 'font-bold text-primary'
            : esSubtotal
              ? 'font-semibold text-dark dark:text-white'
              : 'text-dark dark:text-white'
        }`}
      >
        {fmt(fila.valor)}
      </td>
    </tr>
  );
}

export function PrestamoSaldoDesglosePanel({
  idprestamo,
  moneda,
  compact = false,
}: PrestamoSaldoDesglosePanelProps) {
  const { data, isLoading, error } = useGraphQLQuery<{
    desgloseSaldoPrestamo: DesgloseSaldoPrestamo | null;
  }>(GET_DESGLOSE_SALDO_PRESTAMO, { idprestamo });

  const desglose = data?.desgloseSaldoPrestamo;

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-gray-dark">
        <div className="mb-2 h-4 w-40 rounded bg-gray-2 dark:bg-dark-3" />
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-gray-2 dark:bg-dark-3" />
          <div className="h-3 w-4/5 rounded bg-gray-2 dark:bg-dark-3" />
          <div className="h-3 w-3/4 rounded bg-gray-2 dark:bg-dark-3" />
        </div>
      </div>
    );
  }

  if (error || !desglose) {
    return null;
  }

  const fmt = (n: number): string => formatearMoneda(n, moneda);
  const filas = construirFilas(desglose);

  return (
    <div
      className={`overflow-hidden rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark ${
        compact ? '' : 'shadow-1'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-stroke px-3 py-2 dark:border-dark-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-dark dark:text-white">
            Desglose de saldo
          </h3>
          <p className="text-[11px] text-gray-5 dark:text-dark-6">
            CREDICOMPRAS
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            desglose.cuadra
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
          }`}
        >
          {desglose.cuadra ? 'Cuadra' : 'Revisar'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse">
          <tbody>
            {filas.map((fila) => (
              <FilaTabla key={fila.key} fila={fila} fmt={fmt} />
            ))}
          </tbody>
        </table>
      </div>

      {!compact && (
        <p className="border-t border-stroke px-3 py-2 text-[11px] leading-snug text-gray-5 dark:border-dark-3 dark:text-dark-6">
          SaldoTotal = componentes − pagos. El moratorio no entra en SaldoTotal;
          se suma en la base de acuerdo.
        </p>
      )}
    </div>
  );
}
