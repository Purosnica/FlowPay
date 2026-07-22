'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_METAS_MANDANTE,
  ACTUALIZAR_METAS_MANDANTE,
  RESTABLECER_METAS_MANDANTE,
} from '@/lib/graphql/queries/cobranza.queries';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import type { Mandante } from '@/types/cobranza';

interface MetasMandanteData {
  idmandante: number;
  metaGestionesSemana: number;
  metaRecuperacionSemana: number;
  metaRecuperacionMes: number;
  usaGlobalGestionesSemana: boolean;
  usaGlobalRecuperacionSemana: boolean;
  usaGlobalRecuperacionMes: boolean;
}

interface MandanteMetasPanelProps {
  mandante: Mandante;
}

export function MandanteMetasPanel({ mandante }: MandanteMetasPanelProps) {
  const { data, refetch, isLoading } = useGraphQLQuery<{
    metasMandante: MetasMandanteData;
  }>(GET_METAS_MANDANTE, { idmandante: mandante.idmandante });

  const [form, setForm] = useState<MetasMandanteData | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (data?.metasMandante) {
      setForm(data.metasMandante);
    }
  }, [data]);

  const guardarMutation = useGraphQLMutation(ACTUALIZAR_METAS_MANDANTE, {
    onSuccess: () => {
      void refetch();
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    },
  });

  const restablecerMutation = useGraphQLMutation(RESTABLECER_METAS_MANDANTE, {
    onSuccess: () => {
      void refetch();
    },
  });

  if (isLoading || !form) {
    return <p className="text-sm text-gray-500">Cargando metas del mandante...</p>;
  }

  return (
    <div className="space-y-4 rounded-lg border p-4 dark:border-dark-3">
      <div>
        <h2 className="text-lg font-semibold text-dark dark:text-white">
          Metas operativas — {mandante.nombre}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Overrides por mandante. Si no define valor, se usa la meta global del
          sistema.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <CampoMeta
          label="Gestiones / semana"
          value={form.metaGestionesSemana}
          usaGlobal={form.usaGlobalGestionesSemana}
          onChange={(v) => setForm({ ...form, metaGestionesSemana: v })}
        />
        <CampoMeta
          label="Recuperación / semana (NIO)"
          value={form.metaRecuperacionSemana}
          usaGlobal={form.usaGlobalRecuperacionSemana}
          onChange={(v) => setForm({ ...form, metaRecuperacionSemana: v })}
        />
        <CampoMeta
          label="Recuperación / mes (NIO)"
          value={form.metaRecuperacionMes}
          usaGlobal={form.usaGlobalRecuperacionMes}
          onChange={(v) => setForm({ ...form, metaRecuperacionMes: v })}
        />
      </div>

      <PermissionGate permiso={PERMISO.MANDANTE_WRITE}>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={guardarMutation.isPending}
            onClick={() =>
              guardarMutation.mutate({
                idmandante: mandante.idmandante,
                metaGestionesSemana: form.metaGestionesSemana,
                metaRecuperacionSemana: form.metaRecuperacionSemana,
                metaRecuperacionMes: form.metaRecuperacionMes,
              })
            }
          >
            Guardar metas
          </Button>
          <Button
            variant="outline"
            disabled={restablecerMutation.isPending}
            onClick={() =>
              restablecerMutation.mutate({ idmandante: mandante.idmandante })
            }
          >
            Usar metas globales
          </Button>
          {guardado && (
            <span className="self-center text-sm text-green-600">Guardado</span>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}

function CampoMeta({
  label,
  value,
  usaGlobal,
  onChange,
}: {
  label: string;
  value: number;
  usaGlobal: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
      />
      {usaGlobal && (
        <p className="mt-1 text-xs text-gray-400">Usando meta global</p>
      )}
    </div>
  );
}
