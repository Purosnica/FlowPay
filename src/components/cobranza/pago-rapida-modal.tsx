'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { AsyncPanel } from '@/components/ui/async-panel';
import {
  PagoForm,
  type PagoFormData,
} from '@/components/cobranza/pago-form';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  CREATE_PAGO,
  GET_BANDEJA_COBRADOR,
  GET_CASOS_PRIORITARIOS_MI_DIA,
  GET_PRESTAMO,
  GET_RESUMEN_MI_DIA,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  type BandejaGraphQLItem,
  type Prestamo,
  formatearMoneda,
  nombreCompletoCliente,
} from '@/types/cobranza';

interface PagoRapidaModalProps {
  prestamo?: BandejaGraphQLItem | null;
  idprestamo?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function toBandejaItem(p: Prestamo): BandejaGraphQLItem {
  return {
    idprestamo: p.idprestamo,
    idmandante: p.idmandante,
    noPrestamo: p.noPrestamo,
    diasMora: p.diasMora,
    saldoTotal: p.saldoTotal,
    moneda: p.moneda,
    estado: p.estado,
    cliente: p.cliente,
  };
}

export function PagoRapidaModal({
  prestamo: prestamoProp,
  idprestamo,
  onClose,
  onSuccess,
}: PagoRapidaModalProps) {
  const queryClient = useQueryClient();
  const resolvedId = prestamoProp?.idprestamo ?? idprestamo ?? null;

  const { data, isLoading, error } = useGraphQLQuery<{
    prestamo: Prestamo | null;
  }>(
    GET_PRESTAMO,
    { id: resolvedId ?? 0 },
    { enabled: !!resolvedId && !prestamoProp },
  );

  const prestamo =
    prestamoProp ?? (data?.prestamo ? toBandejaItem(data.prestamo) : null);

  const mutation = useGraphQLMutation(CREATE_PAGO, {
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [GET_BANDEJA_COBRADOR] });
      void queryClient.invalidateQueries({ queryKey: [GET_RESUMEN_MI_DIA] });
      void queryClient.invalidateQueries({
        queryKey: [GET_CASOS_PRIORITARIOS_MI_DIA],
      });
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = (form: PagoFormData) => {
    if (!prestamo) {
      return;
    }
    mutation.mutate({
      input: {
        idprestamo: prestamo.idprestamo,
        monto: form.monto,
        fechaPago: form.fechaPago,
        moneda: form.moneda,
        medio: form.medio,
        idempotencyKey: form.idempotencyKey,
      },
    });
  };

  if (!resolvedId) {
    return null;
  }

  const nombreCliente = prestamo?.cliente
    ? nombreCompletoCliente(prestamo.cliente)
    : undefined;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={
        prestamo
          ? `Pago rápido — ${prestamo.noPrestamo}`
          : 'Pago rápido'
      }
      size="md"
    >
      <AsyncPanel
        isLoading={isLoading && !prestamo}
        error={error}
        isEmpty={!isLoading && !prestamo}
        emptyMessage="Préstamo no disponible."
      >
        {prestamo && (
          <>
            <p className="mb-3 text-sm text-gray-500">
              {nombreCliente ? `${nombreCliente} · ` : ''}
              Saldo {formatearMoneda(prestamo.saldoTotal, prestamo.moneda)} ·{' '}
              {prestamo.diasMora} días mora
            </p>
            <PagoForm
              monedaDefault={
                prestamo.moneda === 'USD' ? 'USD' : 'NIO'
              }
              isLoading={mutation.isPending}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </AsyncPanel>
    </Modal>
  );
}
