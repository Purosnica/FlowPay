'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface FechaRangoInputsProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

function fechasDesdeValor(value: string): [string, string] {
  const rango = /^(\d{4}-\d{2}-\d{2})?\/(\d{4}-\d{2}-\d{2})?$/.exec(value);
  if (rango) return [rango[1] ?? '', rango[2] ?? ''];

  const mes = /^(\d{4})-(\d{2})$/.exec(value);
  if (!mes) return ['', ''];
  const ultimoDia = new Date(Date.UTC(Number(mes[1]), Number(mes[2]), 0)).getUTCDate();
  return [`${mes[1]}-${mes[2]}-01`, `${mes[1]}-${mes[2]}-${String(ultimoDia).padStart(2, '0')}`];
}

function desplazarFecha(fecha: string, dias: number): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return undefined;
  const date = new Date(`${fecha}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().slice(0, 10);
}

export function FechaRangoInputs({
  value,
  onChange,
  id = 'rango-fechas',
  disabled = false,
  className,
  inputClassName,
}: FechaRangoInputsProps) {
  const [[desde, hasta], setFechas] = useState<[string, string]>(() => fechasDesdeValor(value));

  useEffect(() => {
    setFechas(fechasDesdeValor(value));
  }, [value]);

  const actualizar = (inicio: string, fin: string) => {
    setFechas([inicio, fin]);
    // Propaga también estados incompletos o inválidos para que el consumidor
    // suspenda la consulta anterior mientras el usuario termina de editar.
    onChange(`${inicio}/${fin}`);
  };

  const maximoHasta = desde ? desplazarFecha(desde, 365) : undefined;
  const rangoInvertido = Boolean(desde && hasta && desde > hasta);
  const rangoExcedido = Boolean(desde && hasta && maximoHasta && hasta > maximoHasta);
  const rangoInvalido = rangoInvertido || rangoExcedido;

  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      <div>
        <label
          htmlFor={`${id}-desde`}
          className="mb-1 block text-sm font-medium text-dark dark:text-white"
        >
          Desde
        </label>
        <input
          id={`${id}-desde`}
          type="date"
          value={desde}
          min={hasta ? desplazarFecha(hasta, -365) : undefined}
          max={hasta || undefined}
          title="El rango máximo permitido es de 366 días"
          aria-invalid={rangoInvalido}
          disabled={disabled}
          onChange={(event) => actualizar(event.target.value, hasta)}
          className={inputClassName}
        />
      </div>
      <div>
        <label
          htmlFor={`${id}-hasta`}
          className="mb-1 block text-sm font-medium text-dark dark:text-white"
        >
          Hasta
        </label>
        <input
          id={`${id}-hasta`}
          type="date"
          value={hasta}
          min={desde || undefined}
          max={maximoHasta}
          title="El rango máximo permitido es de 366 días"
          aria-invalid={rangoInvalido}
          disabled={disabled}
          onChange={(event) => actualizar(desde, event.target.value)}
          className={inputClassName}
        />
      </div>
      {rangoInvalido ? (
        <p className="basis-full text-sm text-red" role="alert">
          {rangoInvertido
            ? 'La fecha inicial no puede ser posterior a la fecha final.'
            : 'El rango máximo permitido es de 366 días.'}
        </p>
      ) : null}
    </div>
  );
}
