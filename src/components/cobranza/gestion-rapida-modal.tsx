'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { AsyncPanel } from '@/components/ui/async-panel';
import {
  GestionForm,
  type GestionFormData,
} from '@/components/cobranza/gestion-form';
import { ContactoRapidoAcciones } from '@/components/cobranza/contacto-rapido-acciones';
import { HorarioAlerta } from '@/components/cobranza/horario-alerta';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  CREATE_GESTION,
  GET_BANDEJA_COBRADOR,
  GET_CASOS_PRIORITARIOS_MI_DIA,
  GET_PRESTAMO,
  GET_RESUMEN_MI_DIA,
  VERIFICAR_HORARIO_COBRANZA,
} from '@/lib/graphql/queries/cobranza.queries';
import { buildPlantillaContextFromPrestamo } from '@/lib/cobranza/plantilla-mensaje-utils';
import { trackGestionCreated } from '@/lib/analytics/product-analytics';
import { crearIdempotencyKey } from '@/lib/api/idempotency-key';
import {
  encolarGestionOutbox,
  estaOffline,
} from '@/lib/offline/gestion-outbox';
import {
  type BandejaGraphQLItem,
  type Prestamo,
  nombreCompletoCliente,
} from '@/types/cobranza';

interface GestionRapidaModalProps {
  prestamo?: BandejaGraphQLItem | null;
  idprestamo?: number | null;
  onClose: () => void;
  /**
   * Tras guardar. Retornar `false` para no cerrar (auto-avance:
   * el padre cambia idprestamo / prestamo).
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

export function GestionRapidaModal({
  prestamo: prestamoProp,
  idprestamo,
  onClose,
  onSuccess,
}: GestionRapidaModalProps) {
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

  const idmandanteHorario =
    prestamo?.idmandante ?? prestamoProp?.idmandante ?? undefined;

  const { data: horarioData } = useGraphQLQuery<{
    verificarHorarioCobranza: { permitido: boolean; motivo?: string | null };
  }>(
    VERIFICAR_HORARIO_COBRANZA,
    { idmandante: idmandanteHorario ?? null },
    { enabled: !!resolvedId },
  );

  const horarioBloqueado =
    horarioData?.verificarHorarioCobranza.permitido === false;

  const finalizarExito = () => {
    trackGestionCreated();
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

  const mutation = useGraphQLMutation(CREATE_GESTION, {
    successMessage: 'Gestión registrada correctamente',
    onSuccess: () => {
      finalizarExito();
    },
  });

  const handleSubmit = (form: GestionFormData) => {
    if (!prestamo) {
      return;
    }
    if (horarioBloqueado) {
      return;
    }
    if (!form.nota.trim()) {
      return;
    }
    const input = {
      idprestamo: prestamo.idprestamo,
      idcodaccion: form.idcodaccion,
      idcodresultado: form.idcodresultado,
      telefonoContacto: form.telefonoContacto,
      contactoTercero: form.contactoTercero,
      nota: form.nota,
      montoPromesa: form.montoPromesa,
      fechaPromesa: form.fechaPromesa
        ? new Date(form.fechaPromesa).toISOString()
        : undefined,
      fechaProximaGestion: form.fechaProximaGestion
        ? new Date(form.fechaProximaGestion).toISOString()
        : undefined,
      comentario: form.comentario,
      idempotencyKey: crearIdempotencyKey('ges'),
    };

    if (estaOffline()) {
      void encolarGestionOutbox(input).then(() => {
        finalizarExito();
      });
      return;
    }

    mutation.mutate({ input });
  };

  if (!resolvedId) {
    return null;
  }

  const plantillaContext = prestamo
    ? buildPlantillaContextFromPrestamo({
        idprestamo: prestamo.idprestamo,
        idmandante: prestamo.idmandante,
        idcampana: null,
        idcliente: prestamo.cliente?.idcliente ?? 0,
        noPrestamo: prestamo.noPrestamo,
        codigoUnico: prestamo.noPrestamo,
        noCuenta: null,
        estado: prestamo.estado,
        moneda: prestamo.moneda,
        diasMora: prestamo.diasMora,
        saldoTotal: prestamo.saldoTotal,
        montoPrestamo: prestamo.saldoTotal,
        interes: 0,
        interesMoratorio: 0,
        reportableCentralRiesgo: false,
        fechaPrestamo: null,
        fechaVencimiento: null,
        ultimaFechaPago: null,
        cliente: prestamo.cliente ?? undefined,
      })
    : null;

  const nombreCliente = prestamo?.cliente
    ? nombreCompletoCliente(prestamo.cliente)
    : undefined;
  const celular =
    prestamo?.cliente?.celular ?? prestamo?.cliente?.telefono ?? null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={
        prestamo
          ? `Gestión rápida — ${prestamo.noPrestamo}`
          : 'Gestión rápida'
      }
      size="lg"
    >
      <AsyncPanel
        isLoading={isLoading && !prestamo}
        error={error}
        isEmpty={!isLoading && !prestamo}
        emptyMessage="Préstamo no disponible."
      >
        {prestamo && plantillaContext && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-500">
                {nombreCliente} · {prestamo.diasMora} días mora
              </p>
              <ContactoRapidoAcciones telefono={celular} />
            </div>
            {horarioData?.verificarHorarioCobranza && (
              <div className="mb-4">
                <HorarioAlerta
                  permitido={horarioData.verificarHorarioCobranza.permitido}
                  motivo={horarioData.verificarHorarioCobranza.motivo}
                />
              </div>
            )}
            <GestionForm
              key={prestamo.idprestamo}
              modoRapido
              tipificarUnClic
              idmandante={prestamo.idmandante}
              plantillaContext={plantillaContext}
              noPrestamo={prestamo.noPrestamo}
              nombreCliente={nombreCliente}
              saldoTotal={prestamo.saldoTotal}
              celularCliente={celular}
              isLoading={mutation.isPending}
              submitDisabled={horarioBloqueado}
              onCancel={onClose}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </AsyncPanel>
    </Modal>
  );
}
