'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
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

const FIELD_CONTROL_CLASS =
  'field-touch-target w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary';

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

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-stroke bg-gray-1/40 p-4 dark:border-dark-3 dark:bg-dark-2/40">
      <div>
        <h3 className="text-sm font-semibold text-dark dark:text-white">
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-xs text-gray-5 dark:text-dark-6">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function PrestamoForm({
  initialIdmandante,
  onSubmit,
  onCancel,
  isLoading = false,
  errorMessage,
}: PrestamoFormProps) {
  const formId = useId();
  const deudorHintId = useId();
  const [idmandante, setIdmandante] = useState<number | ''>(
    initialIdmandante ?? '',
  );
  const [idcampana, setIdcampana] = useState<number | ''>('');
  const [idcliente, setIdcliente] = useState<number | null>(null);
  const [clienteLabel, setClienteLabel] = useState('');
  const [clienteQuery, setClienteQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const clienteOptions = useMemo(() => {
    const fromSearch = clientesEncontrados.map((c) => ({
      value: c.id,
      label: c.nombre,
      subtitle: c.codigo || c.subtitulo,
    }));
    if (
      idcliente != null &&
      clienteLabel &&
      !fromSearch.some((o) => o.value === idcliente)
    ) {
      return [{ value: idcliente, label: clienteLabel }, ...fromSearch];
    }
    return fromSearch;
  }, [clientesEncontrados, idcliente, clienteLabel]);

  const handleClienteSearch = useCallback((q: string) => {
    setClienteQuery(q);
  }, []);

  const campanaOptions = useMemo(
    () => [
      { value: 0, label: 'Sin campaña' },
      ...campanas.map((c) => ({
        value: c.idcampana,
        label: `${c.nombre} (${c.estado})`,
      })),
    ],
    [campanas],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const nextErrors: Record<string, string> = {};

    if (idmandante === '') {
      nextErrors.mandante = 'Seleccione el mandante.';
    }
    if (idcliente == null) {
      nextErrors.deudor = 'Seleccione el deudor (cliente).';
    }
    if (!noPrestamo.trim()) {
      nextErrors.noPrestamo = 'El No. préstamo es obligatorio.';
    }
    const codigo = (codigoManual ? codigoUnico : noPrestamo).trim();
    if (!codigo) {
      nextErrors.codigoUnico = 'El código único es obligatorio.';
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
      nextErrors.financiero =
        'Los montos y días de mora deben ser números válidos ≥ 0.';
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setLocalError('Revise los campos marcados.');
      return;
    }

    if (idmandante === '' || idcliente == null) {
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

  const displayError = localError ?? errorMessage ?? null;
  const sinResultadosDeudor =
    idcliente == null &&
    debouncedQuery.length >= 2 &&
    !loadingClientes &&
    clientesEncontrados.length === 0;

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-4"
      data-ux-id="prestamo-form"
      noValidate
    >
      <Section
        title="Contexto"
        description="Mandante, campaña y deudor titular del préstamo."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <MandanteSelect
              required
              value={idmandante}
              onChange={(value) => {
                setIdmandante(value);
                setIdcampana('');
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.mandante;
                  return next;
                });
              }}
              selectClassName={FIELD_CONTROL_CLASS}
            />
            {fieldErrors.mandante ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {fieldErrors.mandante}
              </p>
            ) : null}
          </div>

          <FormField
            type="select"
            label="Campaña"
            hint={
              idmandante === ''
                ? 'Seleccione primero un mandante.'
                : loadingCampanas
                  ? 'Cargando campañas...'
                  : undefined
            }
            inputProps={{
              value: idcampana === '' ? 0 : idcampana,
              disabled: idmandante === '' || loadingCampanas || isLoading,
              options: campanaOptions,
              className: 'field-touch-target',
              onChange: (e) => {
                const v = Number(e.target.value);
                setIdcampana(v === 0 ? '' : v);
              },
            }}
          />

          <div className="md:col-span-2">
            <FormField
              type="autocomplete"
              label="Deudor"
              required
              error={fieldErrors.deudor}
              hint={
                idmandante === ''
                  ? 'Seleccione primero un mandante.'
                  : 'Busque por cédula o nombre. El deudor debe existir.'
              }
              inputProps={{
                options: clienteOptions,
                value: idcliente ?? undefined,
                loading: loadingClientes,
                disabled: idmandante === '' || isLoading,
                placeholder: 'Buscar por cédula o nombre...',
                className: 'field-touch-target',
                onSearch: handleClienteSearch,
                filterFn: () => true,
                onChange: (value) => {
                  if (value == null || value === '') {
                    setIdcliente(null);
                    setClienteLabel('');
                    return;
                  }
                  const id = Number(value);
                  const opt = clienteOptions.find((o) => o.value === id);
                  setIdcliente(id);
                  setClienteLabel(opt?.label ?? `Cliente #${id}`);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.deudor;
                    return next;
                  });
                },
              }}
            />
            <p id={deudorHintId} className="mt-1 text-xs text-gray-5">
              {sinResultadosDeudor ? (
                <>
                  Sin resultados.{' '}
                  <Link
                    href="/clientes"
                    className="font-medium text-primary hover:underline"
                    target="_blank"
                  >
                    Crear deudor
                  </Link>
                </>
              ) : (
                <>
                  ¿No está el deudor?{' '}
                  <Link
                    href="/clientes"
                    className="font-medium text-primary hover:underline"
                  >
                    Ir a clientes
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Identificación"
        description="Referencias del crédito en el mandante."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            type="input"
            label="No. préstamo"
            required
            error={fieldErrors.noPrestamo}
            inputProps={{
              value: noPrestamo,
              className: 'field-touch-target',
              disabled: isLoading,
              onChange: (e) => {
                setNoPrestamo(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.noPrestamo;
                  return next;
                });
              },
            }}
          />
          <FormField
            type="input"
            label="Código único"
            required
            error={fieldErrors.codigoUnico}
            hint="Por defecto igual al No. préstamo (único por mandante)."
            inputProps={{
              value: codigoUnico,
              className: 'field-touch-target',
              disabled: isLoading,
              onChange: (e) => {
                setCodigoManual(true);
                setCodigoUnico(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.codigoUnico;
                  return next;
                });
              },
            }}
          />
          <FormField
            type="input"
            label="No. cuenta"
            inputProps={{
              value: noCuenta,
              className: 'field-touch-target',
              disabled: isLoading,
              onChange: (e) => setNoCuenta(e.target.value),
            }}
          />
          <FormField
            type="select"
            label="Estado"
            required
            inputProps={{
              value: estado,
              className: 'field-touch-target',
              disabled: isLoading,
              options: ESTADOS_PRESTAMO.map((e) => ({
                value: e,
                label: e,
              })),
              onChange: (e) => setEstado(e.target.value),
            }}
          />
        </div>
      </Section>

      <Section
        title="Financiero"
        description="Saldos e intereses importados o capturados manualmente."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            type="select"
            label="Moneda"
            required
            inputProps={{
              value: moneda,
              className: 'field-touch-target',
              disabled: isLoading,
              options: [
                { value: 'NIO', label: 'NIO (Córdobas)' },
                { value: 'USD', label: 'USD' },
              ],
              onChange: (e) => setMoneda(e.target.value as 'NIO' | 'USD'),
            }}
          />
          <FormField
            type="input"
            label="Días mora"
            inputProps={{
              type: 'number',
              min: 0,
              step: 1,
              value: diasMora,
              className: 'field-touch-target',
              disabled: isLoading,
              onChange: (e) => setDiasMora(e.target.value),
            }}
          />
          <FormField
            type="input"
            label="Saldo total"
            required
            inputProps={{
              type: 'number',
              min: 0,
              step: '0.01',
              value: saldoTotal,
              className: 'field-touch-target',
              disabled: isLoading,
              onChange: (e) => setSaldoTotal(e.target.value),
            }}
          />
          <FormField
            type="input"
            label="Monto préstamo"
            inputProps={{
              type: 'number',
              min: 0,
              step: '0.01',
              value: montoPrestamo,
              className: 'field-touch-target',
              disabled: isLoading,
              onChange: (e) => setMontoPrestamo(e.target.value),
            }}
          />
          <FormField
            type="input"
            label="Interés"
            inputProps={{
              type: 'number',
              min: 0,
              step: '0.01',
              value: interes,
              className: 'field-touch-target',
              disabled: isLoading,
              onChange: (e) => setInteres(e.target.value),
            }}
          />
          <FormField
            type="input"
            label="Interés moratorio"
            inputProps={{
              type: 'number',
              min: 0,
              step: '0.01',
              value: interesMoratorio,
              className: 'field-touch-target',
              disabled: isLoading,
              onChange: (e) => setInteresMoratorio(e.target.value),
            }}
          />
        </div>
        {fieldErrors.financiero ? (
          <p className="text-xs text-red-600" role="alert">
            {fieldErrors.financiero}
          </p>
        ) : null}
      </Section>

      <Section title="Fechas" description="Opcionales; se usan en reportes y aging.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            type="input"
            label="Fecha préstamo"
            inputProps={{
              type: 'date',
              value: fechaPrestamo,
              className: 'field-touch-target',
              disabled: isLoading,
              onChange: (e) => setFechaPrestamo(e.target.value),
            }}
          />
          <FormField
            type="input"
            label="Fecha vencimiento"
            inputProps={{
              type: 'date',
              value: fechaVencimiento,
              className: 'field-touch-target',
              disabled: isLoading,
              onChange: (e) => setFechaVencimiento(e.target.value),
            }}
          />
        </div>
      </Section>

      {displayError ? (
        <p className="text-sm text-red" role="alert">
          {displayError}
        </p>
      ) : null}

      <div className="field-sticky-actions flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="field-touch-target"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="field-touch-target"
          disabled={isLoading}
          data-ux-id="prestamo-guardar"
        >
          {isLoading ? 'Guardando...' : 'Registrar préstamo'}
        </Button>
      </div>
    </form>
  );
}
