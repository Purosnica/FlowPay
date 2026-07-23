'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_CAMPANAS } from '@/lib/graphql/queries/cobranza.queries';
import { BUSCAR_GLOBAL } from '@/lib/graphql/queries/search.queries';
import { ESTADOS_PRESTAMO } from '@/lib/cobranza/estado-prestamo-service';
import type { CreatePrestamoInput } from '@/types/cobranza';

interface CampanaOption {
  idcampana: number;
  nombre: string;
  fechaCorte: string;
  estado: string;
}

interface ClienteBusqueda {
  id: number;
  codigo: string;
  nombre: string;
  subtitulo: string;
}

interface PrestamoFormProps {
  initialIdmandante?: number;
  onSubmit: (data: CreatePrestamoInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

function parseNumeroNoNegativo(value: string, fallback = 0): number {
  if (value.trim() === '') {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return Number.NaN;
  }
  return n;
}

export function PrestamoForm({
  initialIdmandante,
  onSubmit,
  onCancel,
  isLoading = false,
  errorMessage,
}: PrestamoFormProps) {
  const formId = useId();
  const [idmandante, setIdmandante] = useState<number | ''>(
    initialIdmandante ?? '',
  );
  const [idcampana, setIdcampana] = useState<number | ''>('');
  const [idcliente, setIdcliente] = useState<number | null>(null);
  const [clienteLabel, setClienteLabel] = useState('');
  const [clienteQuery, setClienteQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showClienteResults, setShowClienteResults] = useState(false);
  const [noPrestamo, setNoPrestamo] = useState('');
  const [codigoUnico, setCodigoUnico] = useState('');
  const [codigoManual, setCodigoManual] = useState(false);
  const [noCuenta, setNoCuenta] = useState('');
  const [estado, setEstado] = useState<string>('Vigente');
  const [moneda, setMoneda] = useState<'NIO' | 'USD'>('NIO');
  const [saldoTotal, setSaldoTotal] = useState('0');
  const [montoPrestamo, setMontoPrestamo] = useState('0');
  const [diasMora, setDiasMora] = useState('0');
  const [interes, setInteres] = useState('0');
  const [interesMoratorio, setInteresMoratorio] = useState('0');
  const [fechaPrestamo, setFechaPrestamo] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(clienteQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [clienteQuery]);

  useEffect(() => {
    if (!codigoManual) {
      setCodigoUnico(noPrestamo);
    }
  }, [noPrestamo, codigoManual]);

  const { data: campanasData, isLoading: loadingCampanas } = useGraphQLQuery<{
    campanas: { campanas: CampanaOption[] };
  }>(
    GET_CAMPANAS,
    {
      idmandante: idmandante === '' ? 0 : idmandante,
      page: 1,
      pageSize: 100,
    },
    { enabled: idmandante !== '' },
  );

  const { data: busquedaData, isLoading: loadingClientes } = useGraphQLQuery<{
    buscarGlobal: { clientes: ClienteBusqueda[]; total: number };
  }>(
    BUSCAR_GLOBAL,
    { query: debouncedQuery, limite: 8 },
    { enabled: debouncedQuery.length >= 2 && idcliente == null },
  );

  const campanas = campanasData?.campanas.campanas ?? [];
  const clientesEncontrados = busquedaData?.buscarGlobal.clientes ?? [];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (idmandante === '') {
      setLocalError('Seleccione el mandante.');
      return;
    }
    if (idcliente == null) {
      setLocalError('Seleccione el deudor (cliente).');
      return;
    }
    if (!noPrestamo.trim()) {
      setLocalError('El No. préstamo es obligatorio.');
      return;
    }
    const codigo = (codigoManual ? codigoUnico : noPrestamo).trim();
    if (!codigo) {
      setLocalError('El código único es obligatorio.');
      return;
    }

    const saldo = parseNumeroNoNegativo(saldoTotal);
    const monto = parseNumeroNoNegativo(montoPrestamo);
    const mora = parseNumeroNoNegativo(diasMora);
    const interesVal = parseNumeroNoNegativo(interes);
    const interesMoraVal = parseNumeroNoNegativo(interesMoratorio);

    if (
      [saldo, monto, mora, interesVal, interesMoraVal].some((n) =>
        Number.isNaN(n),
      )
    ) {
      setLocalError('Los montos y días de mora deben ser números válidos ≥ 0.');
      return;
    }

    const input: CreatePrestamoInput = {
      idmandante,
      idcliente,
      noPrestamo: noPrestamo.trim(),
      codigoUnico: codigo,
      estado,
      moneda,
      saldoTotal: saldo,
      montoPrestamo: monto,
      diasMora: Math.trunc(mora),
      interes: interesVal,
      interesMoratorio: interesMoraVal,
    };

    if (idcampana !== '') {
      input.idcampana = idcampana;
    }
    if (noCuenta.trim()) {
      input.noCuenta = noCuenta.trim();
    }
    if (fechaPrestamo) {
      input.fechaPrestamo = new Date(`${fechaPrestamo}T12:00:00`).toISOString();
    }
    if (fechaVencimiento) {
      input.fechaVencimiento = new Date(
        `${fechaVencimiento}T12:00:00`,
      ).toISOString();
    }

    onSubmit(input);
  };

  const inputClass =
    'w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white';

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-4"
      data-ux-id="prestamo-form"
    >
      <MandanteSelect
        required
        value={idmandante}
        onChange={(value) => {
          setIdmandante(value);
          setIdcampana('');
        }}
      />

      <div>
        <label className="mb-1 block text-sm font-medium">Campaña</label>
        <select
          className={inputClass}
          value={idcampana}
          disabled={idmandante === '' || loadingCampanas}
          onChange={(e) =>
            setIdcampana(e.target.value ? Number(e.target.value) : '')
          }
        >
          <option value="">Sin campaña</option>
          {campanas.map((c) => (
            <option key={c.idcampana} value={c.idcampana}>
              {c.nombre} ({c.estado})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Deudor *</label>
        {idcliente != null ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3">
            <span className="flex-1">{clienteLabel}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                setIdcliente(null);
                setClienteLabel('');
                setClienteQuery('');
                setShowClienteResults(true);
              }}
            >
              Cambiar
            </Button>
          </div>
        ) : (
          <div className="relative">
            <input
              className={inputClass}
              placeholder="Buscar por cédula o nombre..."
              value={clienteQuery}
              disabled={idmandante === ''}
              onChange={(e) => {
                setClienteQuery(e.target.value);
                setShowClienteResults(true);
              }}
              onFocus={() => setShowClienteResults(true)}
            />
            {showClienteResults && debouncedQuery.length >= 2 ? (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-dark-2">
                {loadingClientes ? (
                  <li className="px-3 py-2 text-sm text-gray-500">
                    Buscando...
                  </li>
                ) : clientesEncontrados.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gray-500">
                    Sin resultados.{' '}
                    <Link
                      href="/clientes"
                      className="text-primary underline"
                      target="_blank"
                    >
                      Crear deudor
                    </Link>
                  </li>
                ) : (
                  clientesEncontrados.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-2 dark:hover:bg-dark-3"
                        onClick={() => {
                          setIdcliente(c.id);
                          setClienteLabel(
                            `${c.nombre} · ${c.codigo || c.subtitulo}`,
                          );
                          setClienteQuery('');
                          setShowClienteResults(false);
                        }}
                      >
                        <span className="font-medium">{c.nombre}</span>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          {c.codigo || c.subtitulo}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
        )}
        <p className="mt-1 text-xs text-gray-500">
          El deudor debe existir previamente.{' '}
          <Link href="/clientes" className="text-primary underline">
            Ir a clientes
          </Link>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            No. préstamo *
          </label>
          <input
            required
            className={inputClass}
            value={noPrestamo}
            onChange={(e) => setNoPrestamo(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Código único *
          </label>
          <input
            required
            className={inputClass}
            value={codigoUnico}
            onChange={(e) => {
              setCodigoManual(true);
              setCodigoUnico(e.target.value);
            }}
          />
          <p className="mt-1 text-xs text-gray-500">
            Por defecto igual al No. préstamo (único por mandante).
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">No. cuenta</label>
          <input
            className={inputClass}
            value={noCuenta}
            onChange={(e) => setNoCuenta(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Estado *</label>
          <select
            className={inputClass}
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            {ESTADOS_PRESTAMO.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Moneda *</label>
          <select
            className={inputClass}
            value={moneda}
            onChange={(e) => setMoneda(e.target.value as 'NIO' | 'USD')}
          >
            <option value="NIO">NIO</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Días mora</label>
          <input
            type="number"
            min={0}
            step={1}
            className={inputClass}
            value={diasMora}
            onChange={(e) => setDiasMora(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Saldo total *</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={saldoTotal}
            onChange={(e) => setSaldoTotal(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Monto préstamo
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={montoPrestamo}
            onChange={(e) => setMontoPrestamo(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Interés</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={interes}
            onChange={(e) => setInteres(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Interés moratorio
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={interesMoratorio}
            onChange={(e) => setInteresMoratorio(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Fecha préstamo
          </label>
          <input
            type="date"
            className={inputClass}
            value={fechaPrestamo}
            onChange={(e) => setFechaPrestamo(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Fecha vencimiento
          </label>
          <input
            type="date"
            className={inputClass}
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
          />
        </div>
      </div>

      {(localError || errorMessage) && (
        <p className="text-sm text-red-600" role="alert">
          {localError ?? errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} data-ux-id="prestamo-guardar">
          {isLoading ? 'Guardando...' : 'Registrar préstamo'}
        </Button>
      </div>
    </form>
  );
}
