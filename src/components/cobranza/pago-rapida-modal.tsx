'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { AsyncPanel } from '@/components/ui/async-panel';
import {
  PagoForm,
  type PagoFormData,
} from '@/components/cobranza/pago-form';
import { ContactoRapidoAcciones } from '@/components/cobranza/contacto-rapido-acciones';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  CREATE_PAGO,
  GET_ACUERDOS,
  GET_BANDEJA_COBRADOR,
  GET_CASOS_PRIORITARIOS_MI_DIA,
  GET_PRESTAMO,
  GET_RESUMEN_MI_DIA,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  encolarPagoOutbox,
} from '@/lib/offline/pago-outbox';
import { estaOffline } from '@/lib/offline/gestion-outbox';
import {
  type Acuerdo,
  type BandejaGraphQLItem,
  type Prestamo,
  formatearMoneda,
  nombreCompletoCliente,
} from '@/types/cobranza';

interface PagoRapidaModalProps {
  prestamo?: BandejaGraphQLItem | null;
  idprestamo?: number | null;
  onClose: () => void;
  /**
   * Tras guardar. Retornar `false` para no cerrar (auto-avance).
   */
  onSuccess?: () => boolean | void;
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

  const { data: acuerdosData } = useGraphQLQuery<{ acuerdos: Acuerdo[] }>(
    GET_ACUERDOS,
    { idprestamo: resolvedId ?? 0 },
    { enabled: !!resolvedId },
  );

  const prestamoFetched = data?.prestamo ?? null;
  const prestamo =
    prestamoProp ?? (prestamoFetched ? toBandejaItem(prestamoFetched) : null);

  const acuerdoVigente =
    acuerdosData?.acuerdos.find((a) => a.estado === 'VIGENTE') ?? null;

  const finalizarExito = () => {
    void queryClient.invalidateQueries({ queryKey: [GET_BANDEJA_COBRADOR] });
    void queryClient.invalidateQueries({ queryKey: [GET_RESUMEN_MI_DIA] });
    void queryClient.invalidateQueries({
      queryKey: [GET_CASOS_PRIORITARIOS_MI_DIA],
    });
    const keepOpen = onSuccess?.() === false;
    if (!keepOpen) {
      onClose();
    }
  };

  const mutation = useGraphQLMutation(CREATE_PAGO, {
    successMessage: 'Pago registrado correctamente',
    onSuccess: () => {
      finalizarExito();
    },
  });

  const handleSubmit = (form: PagoFormData) => {
    if (!prestamo) {
      return;
    }
    const input = {
      idprestamo: prestamo.idprestamo,
      monto: form.monto,
      fechaPago: form.fechaPago,
      moneda: form.moneda,
      medio: form.medio,
      ...(form.descripcion.trim()
        ? { descripcion: form.descripcion.trim() }
        : {}),
      idempotencyKey: form.idempotencyKey,
    };

    if (estaOffline()) {
      void encolarPagoOutbox(input).then(() => {
        finalizarExito();
      });
      return;
    }

    mutation.mutate({ input });
  };

  if (!resolvedId) {
    return null;
  }

  const nombreCliente = prestamo?.cliente
    ? nombreCompletoCliente(prestamo.cliente)
    : undefined;
  const celular =
    prestamo?.cliente?.celular ?? prestamo?.cliente?.telefono ?? null;
  const saldo =
    prestamoFetched?.saldoTotal ?? prestamo?.saldoTotal ?? null;

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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-500">
                {nombreCliente ? `${nombreCliente} · ` : ''}
                Saldo {formatearMoneda(prestamo.saldoTotal, prestamo.moneda)} ·{' '}
                {prestamo.diasMora} días mora
              </p>
              <ContactoRapidoAcciones telefono={celular} />
            </div>
            <PagoForm
              key={prestamo.idprestamo}
              monedaDefault={
                prestamo.moneda === 'USD' ? 'USD' : 'NIO'
              }
              saldoTotal={saldo}
              montoCuota={acuerdoVigente?.montoCuota}
              isLoading={mutation.isPending}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </AsyncPanel>
    </Modal>
  );
}
