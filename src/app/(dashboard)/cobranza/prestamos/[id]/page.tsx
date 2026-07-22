'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { useEsCobrador } from '@/hooks/use-rol';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { Modal } from '@/components/ui/modal';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { GestionForm } from '@/components/cobranza/gestion-form';
import { AcuerdoSimulator } from '@/components/cobranza/acuerdo-simulator';
import { PagoForm } from '@/components/cobranza/pago-form';
import { FiadorPanel } from '@/components/cobranza/fiador-panel';
import { DocumentoPanel } from '@/components/cobranza/documento-panel';
import { DeudorContactoPanel } from '@/components/cobranza/deudor-contacto-panel';
import { PrestamoCortesPanel } from '@/components/cobranza/prestamo-cortes-panel';
import { HorarioAlerta } from '@/components/cobranza/horario-alerta';
import { EnviarCobroPanel } from '@/components/cobranza/enviar-cobro-panel';
import { PrestamoEstadoHistorialPanel } from '@/components/cobranza/prestamo-estado-historial-panel';
import { PrestamoTimelinePanel } from '@/components/cobranza/prestamo-timeline-panel';
import { PrestamoSaldoDesglosePanel } from '@/components/cobranza/prestamo-saldo-desglose-panel';
import { buildPlantillaContextFromPrestamo } from '@/lib/cobranza/plantilla-mensaje-utils';
import { trackGestionCreated } from '@/lib/analytics/product-analytics';
import { crearIdempotencyKey } from '@/lib/api/idempotency-key';
import {
  encolarGestionOutbox,
  estaOffline,
} from '@/lib/offline/gestion-outbox';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { usePagination } from '@/hooks/use-pagination';
import { useScopedPagination } from '@/hooks/use-scoped-pagination';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_PRESTAMO,
  GET_GESTIONES,
  GET_ACUERDOS,
  GET_PAGOS,
  CREATE_GESTION,
  CREATE_ACUERDO,
  CREATE_PAGO,
  MARCAR_PAGO_APLICADO,
  ACTUALIZAR_ESTADO_ACUERDO,
  VERIFICAR_HORARIO_COBRANZA,
} from '@/lib/graphql/queries/cobranza.queries';
import { type Acuerdo, type Gestion, type Pago, type Prestamo ,
  formatearMoneda,
  nombreCompletoCliente,
} from '@/types/cobranza';
import { rutaComprobantePago } from '@/lib/logic/comprobante-pago-logic';
import { PostPagoAcciones } from '@/components/cobranza/post-pago-acciones';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import type { ColumnDef } from '@tanstack/react-table';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PrestamoDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const idprestamo = Number(id);
  const esCobrador = useEsCobrador();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('resumen');
  const [gestionModal, setGestionModal] = useState(false);
  const [notaPrefill, setNotaPrefill] = useState('');
  const [ultimoPagoId, setUltimoPagoId] = useState<number | null>(null);
  const [pagoFormKey, setPagoFormKey] = useState(0);
  const [acuerdoRotoId, setAcuerdoRotoId] = useState<number | null>(null);
  const gestionesPagination = usePagination({ initialPageSize: 10 });
  const pagosPagination = useScopedPagination(idprestamo, {
    initialPageSize: 10,
  });

  const { data, isLoading, error } = useGraphQLQuery<{
    prestamo: Prestamo | null;
  }>(GET_PRESTAMO, { id: idprestamo });

  const prestamo = data?.prestamo;
  const prestamoCargado = !!prestamo;

  const { data: gestionesData, isLoading: loadingGestiones } = useGraphQLQuery<{
    gestiones: {
      gestiones: Gestion[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_GESTIONES, { idprestamo, ...gestionesPagination.queryVars }, {
    enabled:
      prestamoCargado &&
      (activeTab === 'gestiones' || activeTab === 'resumen'),
  });

  const { data: acuerdosData } = useGraphQLQuery<{ acuerdos: Acuerdo[] }>(
    GET_ACUERDOS,
    { idprestamo },
    { enabled: prestamoCargado && activeTab === 'acuerdo' },
  );

  const { data: pagosData, isLoading: loadingPagos } = useGraphQLQuery<{
    pagos: {
      pagos: Pago[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_PAGOS, { idprestamo, ...pagosPagination.queryVars }, {
    enabled: prestamoCargado && activeTab === 'pagos',
  });

  const { data: horarioData } = useGraphQLQuery<{
    verificarHorarioCobranza: { permitido: boolean; motivo?: string | null };
  }>(
    VERIFICAR_HORARIO_COBRANZA,
    { idmandante: prestamo?.idmandante },
    { enabled: !!prestamo?.idmandante },
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [GET_PRESTAMO] });
    queryClient.invalidateQueries({ queryKey: [GET_GESTIONES] });
    queryClient.invalidateQueries({ queryKey: [GET_ACUERDOS] });
    queryClient.invalidateQueries({ queryKey: [GET_PAGOS] });
  };

  const gestionMutation = useGraphQLMutation(CREATE_GESTION, {
    onSuccess: () => {
      trackGestionCreated();
      invalidate();
      setGestionModal(false);
    },
  });

  const acuerdoMutation = useGraphQLMutation(CREATE_ACUERDO, {
    onSuccess: invalidate,
  });

  const acuerdoEstadoMutation = useGraphQLMutation(ACTUALIZAR_ESTADO_ACUERDO, {
    onSuccess: invalidate,
  });

  const pagoMutation = useGraphQLMutation<{
    createPago: { idpago: number; monto: number; fechaPago: string };
  }>(CREATE_PAGO, {
    onSuccess: (result) => {
      invalidate();
      setUltimoPagoId(result.createPago.idpago);
      setPagoFormKey((k) => k + 1);
      setActiveTab('pagos');
    },
  });

  const aplicadoMutation = useGraphQLMutation(MARCAR_PAGO_APLICADO, {
    onSuccess: invalidate,
  });

  const pagoColumns: ColumnDef<Pago>[] = [
    {
      accessorKey: 'fechaPago',
      header: 'Fecha',
      cell: ({ row }) =>
        new Date(row.original.fechaPago).toLocaleDateString('es-NI'),
    },
    {
      accessorKey: 'medio',
      header: 'Medio',
      cell: ({ row }) => row.original.medio ?? '-',
    },
    {
      accessorKey: 'aplicado',
      header: 'Estado',
      cell: ({ row }) => (row.original.aplicado ? 'Conciliado' : 'Pendiente'),
    },
    {
      accessorKey: 'monto',
      header: 'Monto',
      cell: ({ row }) =>
        formatearMoneda(row.original.monto, row.original.moneda),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={rutaComprobantePago(row.original.idpago)}>
            <Button size="sm" variant="outline">
              Comprobante
            </Button>
          </Link>
          <PermissionGate permiso={PERMISO.PAGO_APPLY}>
            <Button
              size="sm"
              variant="outline"
              disabled={aplicadoMutation.isPending}
              onClick={() =>
                aplicadoMutation.mutate({
                  idpago: row.original.idpago,
                  aplicado: !row.original.aplicado,
                })
              }
            >
              {row.original.aplicado ? 'Desmarcar' : 'Conciliar'}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  const gestionColumns: ColumnDef<Gestion>[] = [
    {
      accessorKey: 'fechaGestion',
      header: 'Fecha',
      cell: ({ row }) =>
        new Date(row.original.fechaGestion).toLocaleDateString('es-NI'),
    },
    {
      accessorKey: 'codaccion.codigo',
      header: 'Acción',
      cell: ({ row }) => row.original.codaccion?.codigo ?? '-',
    },
    {
      accessorKey: 'codresult.codigo',
      header: 'Resultado',
      cell: ({ row }) => row.original.codresult?.codigo ?? '-',
    },
    { accessorKey: 'nota', header: 'Nota' },
    {
      accessorKey: 'gestor.nombre',
      header: 'Gestor',
      cell: ({ row }) => row.original.gestor.nombre,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !prestamo) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Préstamo no encontrado o sin acceso.</p>
        <Link href={esCobrador ? '/cobranza/bandeja' : '/cobranza/cartera'}>
          <Button variant="outline">Volver a cartera</Button>
        </Link>
      </div>
    );
  }

  const cliente = prestamo.cliente;
  const acuerdoVigente =
    acuerdosData?.acuerdos.find((a) => a.estado === 'VIGENTE') ?? null;
  const plantillaContext = buildPlantillaContextFromPrestamo(
    prestamo,
    acuerdoVigente,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={esCobrador ? '/cobranza/bandeja' : '/cobranza/cartera'}
            className="text-sm text-primary hover:underline"
          >
            ← {esCobrador ? 'Bandeja' : 'Cartera'}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-dark dark:text-white">
            Préstamo {prestamo.noPrestamo}
          </h1>
          {cliente && (
            <p className="text-gray-6">
              {nombreCompletoCliente(cliente)} · {cliente.numerodocumento}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGate permiso={PERMISO.PAGO_WRITE}>
            <Button
              data-ux-id="prestamo-registrar-pago"
              onClick={() => setActiveTab('pagos')}
            >
              Registrar pago
            </Button>
          </PermissionGate>
          <PermissionGate permiso={PERMISO.GESTION_WRITE}>
            <Button
              variant="outline"
              data-ux-id="prestamo-tipificar"
              onClick={() => setGestionModal(true)}
              disabled={
                horarioData?.verificarHorarioCobranza.permitido === false
              }
            >
              Tipificar gestión
            </Button>
          </PermissionGate>
        </div>
      </div>

      {horarioData?.verificarHorarioCobranza && (
        <HorarioAlerta
          permitido={horarioData.verificarHorarioCobranza.permitido}
          motivo={horarioData.verificarHorarioCobranza.motivo}
        />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
          <p className="text-xs text-gray-6">Saldo total</p>
          <p className="text-lg font-bold text-primary">
            {formatearMoneda(prestamo.saldoTotal, prestamo.moneda)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
          <p className="text-xs text-gray-6">Días mora</p>
          <p className="text-lg font-bold">{prestamo.diasMora}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
          <p className="text-xs text-gray-6">Int. moratorio</p>
          <p className="text-lg font-bold">
            {formatearMoneda(prestamo.interesMoratorio, prestamo.moneda)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
          <p className="text-xs text-gray-6">Interés</p>
          <p className="text-lg font-bold">
            {formatearMoneda(prestamo.interes, prestamo.moneda)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
          <p className="text-xs text-gray-6">Gestión de cobranza</p>
          <p className="text-lg font-bold">
            {formatearMoneda(prestamo.gestionCobranza ?? 0, prestamo.moneda)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
          <p className="text-xs text-gray-6">Estado</p>
          <p className="text-lg font-bold">{prestamo.estado}</p>
        </div>
      </div>

      <Tabs defaultValue="resumen" onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="gestiones">Gestiones</TabsTrigger>
          <TabsTrigger value="acuerdo">Acuerdo</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="contactos">Contactos</TabsTrigger>
          <TabsTrigger value="cortes">Cortes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="historial-estado">Estados</TabsTrigger>
          <TabsTrigger value="enviar">Enviar cobro</TabsTrigger>
          <TabsTrigger value="fiadores">Fiadores</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
        <div className="space-y-6">
          <PrestamoSaldoDesglosePanel
            idprestamo={idprestamo}
            moneda={prestamo.moneda}
          />
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
            <div>
              <dt className="text-gray-6">Mandante</dt>
              <dd>{prestamo.mandante?.nombre}</dd>
            </div>
            <div>
              <dt className="text-gray-6">Código único</dt>
              <dd>{prestamo.codigoUnico}</dd>
            </div>
            <div>
              <dt className="text-gray-6">Monto préstamo</dt>
              <dd>{formatearMoneda(prestamo.montoPrestamo, prestamo.moneda)}</dd>
            </div>
            <div>
              <dt className="text-gray-6">Interés</dt>
              <dd>{formatearMoneda(prestamo.interes, prestamo.moneda)}</dd>
            </div>
            <div>
              <dt className="text-gray-6">Gestión de cobranza</dt>
              <dd>
                {formatearMoneda(prestamo.gestionCobranza ?? 0, prestamo.moneda)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-6">Interés moratorio</dt>
              <dd>
                {formatearMoneda(prestamo.interesMoratorio, prestamo.moneda)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-6">Central de riesgo</dt>
              <dd>
                {prestamo.reportableCentralRiesgo
                  ? 'Reportable'
                  : 'No reportable (acuerdo vigente)'}
              </dd>
            </div>
            {cliente?.celular && (
              <div>
                <dt className="text-gray-6">Celular</dt>
                <dd>{cliente.celular}</dd>
              </div>
            )}
            {cliente?.direccion && (
              <div>
                <dt className="text-gray-6">Dirección</dt>
                <dd>{cliente.direccion}</dd>
              </div>
            )}
          </dl>
          <div className="mt-6 border-t pt-6 dark:border-dark-3">
            <h3 className="mb-3 font-semibold">Actividad reciente</h3>
            <PrestamoTimelinePanel idprestamo={idprestamo} compact />
          </div>
        </div>
        </div>
        </TabsContent>

        <TabsContent value="gestiones">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <PaginatedDataTable
            data={gestionesData?.gestiones.gestiones ?? []}
            columns={gestionColumns}
            pagination={gestionesData?.gestiones}
            isLoading={loadingGestiones}
            emptyMessage="Sin gestiones registradas"
            onPageChange={gestionesPagination.handlePageChange}
            onPageSizeChange={gestionesPagination.handlePageSizeChange}
            itemLabel="gestiones"
          />
        </div>
        </TabsContent>

        <TabsContent value="acuerdo">
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 font-semibold">Simulador de acuerdo</h2>
            <AcuerdoSimulator
              idprestamo={idprestamo}
              moneda={prestamo.moneda}
              descuentoMaximo={Number(prestamo.mandante?.descuentoMaximo ?? 100)}
              interesMoratorio={Number(prestamo.interesMoratorio)}
              gestionCobranza={Number(prestamo.gestionCobranza ?? 0)}
              isLoading={acuerdoMutation.isPending}
              onConfirm={(params) =>
                acuerdoMutation.mutate({
                  input: { idprestamo, ...params },
                })
              }
            />
          </div>
          {(acuerdosData?.acuerdos ?? []).length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <h2 className="mb-4 font-semibold">Acuerdos</h2>
              <ul className="space-y-3 text-sm">
                {acuerdosData?.acuerdos.map((a) => (
                  <li
                    key={a.idacuerdo}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke py-2 dark:border-dark-3"
                  >
                    <div>
                      <span className="font-medium">{a.estado}</span>
                      <span className="text-gray-500">
                        {' '}
                        · {a.porcentajeDesc}% desc. · {a.numeroCuotas} cuota(s)
                      </span>
                      <p className="text-xs text-gray-500">
                        Acordado:{' '}
                        {formatearMoneda(a.montoAcordado, prestamo.moneda)}
                      </p>
                      {(a.dispensarInteresMoratorio ||
                        a.dispensarGestionCobranza) && (
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Dispensa:{' '}
                          {[
                            a.dispensarInteresMoratorio
                              ? 'interés moratorio'
                              : null,
                            a.dispensarGestionCobranza
                              ? 'gestión de cobranza'
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      {(a.cuotas ?? []).length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-gray-600">
                          {a.cuotas?.map((c) => (
                            <li key={c.idcuota}>
                              Cuota {c.numeroCuota}:{' '}
                              {formatearMoneda(c.montoCuota, prestamo.moneda)}{' '}
                              · vence{' '}
                              {new Date(c.fechaVencimiento).toLocaleDateString(
                                'es-NI',
                              )}{' '}
                              ·{' '}
                              <span
                                className={
                                  c.estado === 'VENCIDA'
                                    ? 'text-red-600'
                                    : c.estado === 'PAGADA'
                                      ? 'text-green-600'
                                      : ''
                                }
                              >
                                {c.estado}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {a.estado === 'VIGENTE' && (
                      <PermissionGate permiso={PERMISO.ACUERDO_WRITE}>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={acuerdoEstadoMutation.isPending}
                            onClick={() => setAcuerdoRotoId(a.idacuerdo)}
                          >
                            Marcar roto
                          </Button>
                        </div>
                      </PermissionGate>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        </TabsContent>

        <TabsContent value="pagos">
        <div className="grid gap-6 lg:grid-cols-2">
          <PermissionGate permiso={PERMISO.PAGO_WRITE}>
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 font-semibold">Registrar pago</h2>
            <p className="mb-3 text-xs text-gray-500">
              Al conciliar un pago se descuenta del saldo del préstamo. Si el
              total pagado cubre el acuerdo vigente, se marca como cumplido.
            </p>
            {ultimoPagoId ? (
              <div
                className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
                role="status"
              >
                <p className="mb-2 font-medium">Pago registrado.</p>
                <PostPagoAcciones idpago={ultimoPagoId} />
              </div>
            ) : null}
            <PagoForm
              key={pagoFormKey}
              monedaDefault={prestamo.moneda as 'NIO' | 'USD'}
              isLoading={pagoMutation.isPending}
              onSubmit={(data) =>
                pagoMutation.mutate({
                  input: { idprestamo, ...data },
                })
              }
            />
          </div>
          </PermissionGate>
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 font-semibold">Historial</h2>
            <PaginatedDataTable
              data={pagosData?.pagos.pagos ?? []}
              columns={pagoColumns}
              pagination={pagosData?.pagos}
              isLoading={loadingPagos}
              emptyMessage="Sin pagos registrados"
              onPageChange={pagosPagination.handlePageChange}
              onPageSizeChange={pagosPagination.handlePageSizeChange}
              itemLabel="pagos"
            />
          </div>
        </div>
        </TabsContent>

        <TabsContent value="contactos">
          {cliente && (
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <DeudorContactoPanel idcliente={cliente.idcliente} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="cortes">
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <PrestamoCortesPanel
              idprestamo={idprestamo}
              moneda={prestamo.moneda}
            />
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 font-semibold">Timeline del préstamo</h2>
            <PrestamoTimelinePanel idprestamo={idprestamo} />
          </div>
        </TabsContent>

        <TabsContent value="historial-estado">
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 font-semibold">Historial de estados</h2>
            <PrestamoEstadoHistorialPanel idprestamo={idprestamo} />
          </div>
        </TabsContent>

        <TabsContent value="enviar">
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 font-semibold">Enviar cobro</h2>
            <EnviarCobroPanel
              idmandante={prestamo.idmandante}
              idprestamo={idprestamo}
              idcliente={cliente?.idcliente}
              context={plantillaContext}
              onUseAsNota={(texto) => {
                setNotaPrefill(texto);
                setGestionModal(true);
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="fiadores">
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <FiadorPanel idprestamo={idprestamo} />
          </div>
        </TabsContent>

        <TabsContent value="documentos">
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <DocumentoPanel idprestamo={idprestamo} />
          </div>
        </TabsContent>
      </Tabs>

      <Modal
        isOpen={gestionModal}
        onClose={() => setGestionModal(false)}
        title="Registrar gestión"
        size="lg"
      >
        <GestionForm
          idmandante={prestamo.idmandante}
          plantillaContext={plantillaContext}
          noPrestamo={prestamo.noPrestamo}
          nombreCliente={cliente ? nombreCompletoCliente(cliente) : undefined}
          saldoTotal={prestamo.saldoTotal}
          celularCliente={cliente?.celular}
          initialNota={notaPrefill}
          isLoading={gestionMutation.isPending}
          onCancel={() => {
            setGestionModal(false);
            setNotaPrefill('');
          }}
          onSubmit={(form) =>
            const input = {
              idprestamo,
              ...form,
              fechaPromesa: form.fechaPromesa
                ? new Date(form.fechaPromesa).toISOString()
                : undefined,
              fechaProximaGestion: form.fechaProximaGestion
                ? new Date(form.fechaProximaGestion).toISOString()
                : undefined,
              idempotencyKey: crearIdempotencyKey('ges'),
            };
            if (estaOffline()) {
              encolarGestionOutbox(input);
              setGestionModal(false);
              return;
            }
            gestionMutation.mutate({ input });
          }
        />
      </Modal>

      <ConfirmDialog
        isOpen={acuerdoRotoId != null}
        onClose={() => setAcuerdoRotoId(null)}
        title="Marcar acuerdo como roto"
        description="El acuerdo dejará de estar vigente y el préstamo podrá volver a reportarse en central de riesgo según política."
        confirmLabel="Marcar roto"
        variant="danger"
        isLoading={acuerdoEstadoMutation.isPending}
        onConfirm={() => {
          if (acuerdoRotoId == null) {
            return;
          }
          acuerdoEstadoMutation.mutate(
            { idacuerdo: acuerdoRotoId, estado: 'ROTO' },
            { onSuccess: () => setAcuerdoRotoId(null) },
          );
        }}
      />
    </div>
  );
}
