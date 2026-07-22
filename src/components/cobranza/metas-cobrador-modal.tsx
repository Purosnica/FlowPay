'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_METAS_COBRADOR,
  ACTUALIZAR_METAS_COBRADOR,
} from '@/lib/graphql/queries/cobranza.queries';
import { PERMISO } from '@/lib/permissions/permiso-codes';

interface MetasCobradorData {
  idgestor: number;
  nombre: string;
  metaGestionesSemana: number;
  metaRecuperacionSemana: number;
  usaGlobalGestionesSemana: boolean;
  usaGlobalRecuperacionSemana: boolean;
}

interface MetasCobradorModalProps {
  idgestor: number | null;
  nombreCobrador?: string;
  onClose: () => void;
}

export function MetasCobradorModal({
  idgestor,
  nombreCobrador,
  onClose,
}: MetasCobradorModalProps) {
  const [form, setForm] = useState<MetasCobradorData | null>(null);

  const { data, refetch } = useGraphQLQuery<{
    metasCobrador: MetasCobradorData;
  }>(
    GET_METAS_COBRADOR,
    { idgestor: idgestor ?? 0 },
    { enabled: idgestor != null && idgestor > 0 },
  );

  useEffect(() => {
    if (data?.metasCobrador) {
      setForm(data.metasCobrador);
    }
  }, [data]);

  const mutation = useGraphQLMutation(ACTUALIZAR_METAS_COBRADOR, {
    onSuccess: () => {
      void refetch();
      onClose();
    },
  });

  return (
    <Modal
      isOpen={idgestor != null}
      onClose={onClose}
      title={`Metas — ${nombreCobrador ?? form?.nombre ?? 'Cobrador'}`}
      size="md"
    >
      {!form ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Gestiones / semana
            </label>
            <input
              type="number"
              min={1}
              value={form.metaGestionesSemana}
              onChange={(e) =>
                setForm({
                  ...form,
                  metaGestionesSemana: Number(e.target.value),
                })
              }
              className="w-full rounded border px-3 py-2 text-sm"
            />
            {form.usaGlobalGestionesSemana && (
              <p className="mt-1 text-xs text-gray-400">Usando meta global</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Recuperación / semana (NIO)
            </label>
            <input
              type="number"
              min={0}
              value={form.metaRecuperacionSemana}
              onChange={(e) =>
                setForm({
                  ...form,
                  metaRecuperacionSemana: Number(e.target.value),
                })
              }
              className="w-full rounded border px-3 py-2 text-sm"
            />
            {form.usaGlobalRecuperacionSemana && (
              <p className="mt-1 text-xs text-gray-400">Usando meta global</p>
            )}
          </div>
          <PermissionGate permiso={PERMISO.EQUIPO_READ}>
            <Button
              disabled={!idgestor || mutation.isPending}
              onClick={() => {
                if (idgestor) {
                  mutation.mutate({
                    idgestor,
                    metaGestionesSemana: form.metaGestionesSemana,
                    metaRecuperacionSemana: form.metaRecuperacionSemana,
                  });
                }
              }}
            >
              Guardar metas del cobrador
            </Button>
          </PermissionGate>
        </div>
      )}
    </Modal>
  );
}
