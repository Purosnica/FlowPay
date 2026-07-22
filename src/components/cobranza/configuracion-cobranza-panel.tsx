'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_CONFIG_COBRANZA,
  ACTUALIZAR_CONFIG_COBRANZA,
} from '@/lib/graphql/queries/cobranza.queries';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import type { ConfigCobranzaOperativa } from '@/types/cobranza';

export function ConfiguracionCobranzaPanel() {
  const { data, isLoading } = useGraphQLQuery<{
    configCobranzaOperativa: ConfigCobranzaOperativa;
  }>(GET_CONFIG_COBRANZA);

  const [form, setForm] = useState<ConfigCobranzaOperativa | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (data?.configCobranzaOperativa) {
      const cfg = data.configCobranzaOperativa;
      setForm({
        ...cfg,
        bandejaCandidateLimit: cfg.bandejaCandidateLimit ?? 500,
        miDiaCandidateLimit: cfg.miDiaCandidateLimit ?? 200,
      });
    }
  }, [data]);

  const mutation = useGraphQLMutation(ACTUALIZAR_CONFIG_COBRANZA, {
    onSuccess: () => {
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    },
  });

  if (isLoading || !form) {
    return (
      <p className="text-sm text-gray-500">Cargando parámetros de cobranza...</p>
    );
  }

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
      <h2 className="text-lg font-semibold text-dark dark:text-white">
        Parámetros operativos de cobranza
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Automatización, castigo, aprobaciones y metas de gamificación.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-600">Operación</h3>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.pagoAutoAplicar}
              onChange={(e) =>
                setForm({ ...form, pagoAutoAplicar: e.target.checked })
              }
            />
            <span className="text-sm">Aplicar pagos automáticamente al registrar</span>
          </label>

          <CampoNumero
            label="Máximo contactos por deudor / día"
            value={form.maxContactosDia}
            min={1}
            max={20}
            onChange={(v) => setForm({ ...form, maxContactosDia: v })}
          />
          <CampoNumero
            label="Días de gracia cuota de acuerdo"
            value={form.acuerdoDiasGracia}
            min={0}
            max={30}
            onChange={(v) => setForm({ ...form, acuerdoDiasGracia: v })}
          />
          <CampoNumero
            label="Días sin gestión para alerta de prioridad"
            value={form.diasSinGestionAlerta}
            min={1}
            max={60}
            onChange={(v) => setForm({ ...form, diasSinGestionAlerta: v })}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-600">
            Castigo y aprobaciones
          </h3>
          <CampoNumero
            label="Días de mora para castigo automático"
            value={form.diasMoraCastigo}
            min={0}
            max={999}
            onChange={(v) => setForm({ ...form, diasMoraCastigo: v })}
          />
          <CampoNumero
            label="Descuento máx. sin aprobación supervisor (%)"
            value={form.acuerdoDescuentoMaxSinAprobacion}
            min={0}
            max={100}
            onChange={(v) =>
              setForm({ ...form, acuerdoDescuentoMaxSinAprobacion: v })
            }
          />

          <h3 className="pt-2 text-sm font-semibold text-gray-600">
            Metas semanales (gamificación)
          </h3>
          <CampoNumero
            label="Meta gestiones / semana"
            value={form.metaGestionesSemana}
            min={1}
            max={500}
            onChange={(v) => setForm({ ...form, metaGestionesSemana: v })}
          />
          <CampoNumero
            label="Meta recuperación / semana (NIO)"
            value={form.metaRecuperacionSemana}
            min={0}
            max={10000000}
            onChange={(v) => setForm({ ...form, metaRecuperacionSemana: v })}
          />

          <h3 className="pt-2 text-sm font-semibold text-gray-600">
            Meta mensual (forecast)
          </h3>
          <CampoNumero
            label="Meta recuperación / mes (NIO)"
            value={form.metaRecuperacionMes}
            min={0}
            max={50000000}
            onChange={(v) => setForm({ ...form, metaRecuperacionMes: v })}
          />

          <h3 className="pt-2 text-sm font-semibold text-gray-600">
            Rendimiento (I112)
          </h3>
          <CampoNumero
            label="Límite candidatos bandeja (prioridad)"
            value={form.bandejaCandidateLimit}
            min={1}
            max={5000}
            onChange={(v) => setForm({ ...form, bandejaCandidateLimit: v })}
          />
          <CampoNumero
            label="Límite candidatos Mi día (prioridad)"
            value={form.miDiaCandidateLimit}
            min={1}
            max={5000}
            onChange={(v) => setForm({ ...form, miDiaCandidateLimit: v })}
          />
        </div>
      </div>

      <PermissionGate permiso={PERMISO.CONFIG_SYSTEM}>
        <div className="mt-6">
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ ...form })}
          >
            Guardar parámetros
          </Button>
          {guardado && (
            <p className="mt-2 text-sm text-green-600">Parámetros guardados.</p>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}

function CampoNumero({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        className="w-full max-w-xs rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
