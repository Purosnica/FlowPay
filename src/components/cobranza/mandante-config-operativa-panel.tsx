'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_CONFIG_OPERATIVA_MANDANTE,
  ACTUALIZAR_CONFIG_OPERATIVA_MANDANTE,
  RESTABLECER_CONFIG_OPERATIVA_MANDANTE,
} from '@/lib/graphql/queries/cobranza.queries';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import type { Mandante } from '@/types/cobranza';

interface ConfigOperativaMandanteData {
  idmandante: number;
  pagoAutoAplicar: boolean;
  acuerdoDiasGracia: number;
  diasMoraCastigo: number;
  moraDiasGracia: number;
  usaGlobalPagoAutoAplicar: boolean;
  usaGlobalAcuerdoDiasGracia: boolean;
  usaGlobalDiasMoraCastigo: boolean;
  usaGlobalMoraDiasGracia: boolean;
}

interface MandanteConfigOperativaPanelProps {
  mandante: Mandante;
}

/**
 * Overrides de castigo / auto-aplicar / gracia por mandante (H17).
 */
export function MandanteConfigOperativaPanel({
  mandante,
}: MandanteConfigOperativaPanelProps) {
  const { data, refetch, isLoading } = useGraphQLQuery<{
    configOperativaMandante: ConfigOperativaMandanteData;
  }>(GET_CONFIG_OPERATIVA_MANDANTE, { idmandante: mandante.idmandante });

  const [form, setForm] = useState<ConfigOperativaMandanteData | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (data?.configOperativaMandante) {
      setForm(data.configOperativaMandante);
    }
  }, [data]);

  const guardarMutation = useGraphQLMutation(
    ACTUALIZAR_CONFIG_OPERATIVA_MANDANTE,
    {
      successMessage: 'Configuración guardada correctamente',
      onSuccess: () => {
        void refetch();
        setGuardado(true);
        setTimeout(() => setGuardado(false), 3000);
      },
    },
  );

  const restablecerMutation = useGraphQLMutation(
    RESTABLECER_CONFIG_OPERATIVA_MANDANTE,
    {
      successMessage: 'Configuración restablecida correctamente',
      onSuccess: () => {
        void refetch();
      },
    },
  );

  if (isLoading || !form) {
    return (
      <p className="text-sm text-gray-500">
        Cargando configuración operativa del mandante...
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4 dark:border-dark-3">
      <div>
        <h2 className="text-lg font-semibold text-dark dark:text-white">
          Parámetros operativos — {mandante.nombre}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Overrides por acreedor. Sin valor propio se usa la config global.
        </p>
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={form.pagoAutoAplicar}
          onChange={(e) =>
            setForm({ ...form, pagoAutoAplicar: e.target.checked })
          }
        />
        <span className="text-sm">
          Aplicar pagos automáticamente
          {form.usaGlobalPagoAutoAplicar ? (
            <span className="ml-1 text-xs text-gray-400">(global)</span>
          ) : null}
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <CampoNumero
          label="Días gracia cuota acuerdo"
          value={form.acuerdoDiasGracia}
          usaGlobal={form.usaGlobalAcuerdoDiasGracia}
          min={0}
          max={30}
          onChange={(v) => setForm({ ...form, acuerdoDiasGracia: v })}
        />
        <CampoNumero
          label="Días mora para castigo"
          value={form.diasMoraCastigo}
          usaGlobal={form.usaGlobalDiasMoraCastigo}
          min={0}
          max={999}
          onChange={(v) => setForm({ ...form, diasMoraCastigo: v })}
        />
        <CampoNumero
          label="Días gracia cálculo mora"
          value={form.moraDiasGracia}
          usaGlobal={form.usaGlobalMoraDiasGracia}
          min={0}
          max={30}
          onChange={(v) => setForm({ ...form, moraDiasGracia: v })}
        />
      </div>

      <PermissionGate permiso={PERMISO.MANDANTE_WRITE}>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={guardarMutation.isPending}
            onClick={() =>
              guardarMutation.mutate({
                idmandante: mandante.idmandante,
                pagoAutoAplicar: form.pagoAutoAplicar,
                acuerdoDiasGracia: form.acuerdoDiasGracia,
                diasMoraCastigo: form.diasMoraCastigo,
                moraDiasGracia: form.moraDiasGracia,
              })
            }
          >
            Guardar parámetros
          </Button>
          <Button
            variant="outline"
            disabled={restablecerMutation.isPending}
            onClick={() =>
              restablecerMutation.mutate({ idmandante: mandante.idmandante })
            }
          >
            Usar parámetros globales
          </Button>
          {guardado ? (
            <span className="self-center text-sm text-green-600">Guardado</span>
          ) : null}
        </div>
      </PermissionGate>
    </div>
  );
}

function CampoNumero({
  label,
  value,
  usaGlobal,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  usaGlobal: boolean;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600 dark:text-gray-300">
        {label}
        {usaGlobal ? (
          <span className="ml-1 text-xs text-gray-400">(global)</span>
        ) : null}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark-2"
      />
    </label>
  );
}
