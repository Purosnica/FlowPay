'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { PageHeader } from '@/components/ui/page-header';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { usePagination } from '@/hooks/use-pagination';
import {
  ClienteBuscarInput,
  type ClienteBusquedaItem,
} from '@/components/cobranza/cliente-buscar-input';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_RECLAMOS,
  CREATE_RECLAMO,
  UPDATE_RECLAMO_ESTADO,
  GET_PRESTAMOS_POR_CLIENTE,
} from '@/lib/graphql/queries/cobranza.queries';
import type { Prestamo, Reclamo } from '@/types/cobranza';

export default function ReclamosPage() {
  const {
    queryVars,
    resetPage,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination();
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [clienteSel, setClienteSel] = useState<ClienteBusquedaItem | null>(
    null,
  );
  const [idprestamo, setIdprestamo] = useState<number | ''>('');
  const [fechaLimite, setFechaLimite] = useState('');

  const { data, isLoading, refetch } = useGraphQLQuery<{
    reclamos: {
      reclamos: Reclamo[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(
    GET_RECLAMOS,
    {
      idmandante: idmandante as number,
      ...queryVars,
    },
    { enabled: typeof idmandante === 'number' },
  );

  const reclamosData = data?.reclamos;

  const { data: prestamosCliente } = useGraphQLQuery<{
    prestamosPorCliente: Prestamo[];
  }>(
    GET_PRESTAMOS_POR_CLIENTE,
    { idcliente: clienteSel?.idcliente ?? 0 },
    { enabled: !!clienteSel },
  );

  const createMutation = useGraphQLMutation(CREATE_RECLAMO, {
    onSuccess: () => {
      refetch();
      setModalOpen(false);
      setDescripcion('');
      setClienteSel(null);
      setIdprestamo('');
    },
  });

  const updateMutation = useGraphQLMutation(UPDATE_RECLAMO_ESTADO, {
    onSuccess: () => refetch(),
  });

  const columns = useMemo<ColumnDef<Reclamo>[]>(
    () => [
      {
        id: 'cliente',
        header: 'Cliente',
        cell: ({ row }) =>
          row.original.cliente
            ? `${row.original.cliente.primer_nombres} ${row.original.cliente.primer_apellido}`
            : '-',
      },
      {
        accessorKey: 'prestamo.noPrestamo',
        header: 'Préstamo',
        cell: ({ row }) => row.original.prestamo?.noPrestamo ?? '-',
      },
      { accessorKey: 'estado', header: 'Estado' },
      {
        accessorKey: 'fechaLimite',
        header: 'SLA',
        cell: ({ row }) =>
          new Date(row.original.fechaLimite).toLocaleDateString('es-NI'),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reclamos (CONAMI)"
        actions={
          <PermissionGate permiso={PERMISO.GESTION_WRITE}>
            <Button disabled={!idmandante} onClick={() => setModalOpen(true)}>
              Nuevo reclamo
            </Button>
          </PermissionGate>
        }
      />
      <MandanteSelect
        value={idmandante}
        onChange={(value) => {
          setIdmandante(value);
          resetPage();
        }}
        label=""
        placeholder="Mandante..."
        selectClassName="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
      />
      <PaginatedDataTable
        data={reclamosData?.reclamos ?? []}
        columns={columns}
        pagination={reclamosData}
        isLoading={isLoading}
        emptyMessage="Sin reclamos."
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="reclamos"
        rowActions={(r) => (
          <PermissionGate permiso={PERMISO.GESTION_WRITE}>
            <div className="flex gap-2">
              {r.estado !== 'RESUELTO' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateMutation.mutate({
                      input: {
                        idreclamo: r.idreclamo,
                        estado:
                          r.estado === 'ABIERTO' ? 'EN_PROCESO' : 'RESUELTO',
                      },
                    })
                  }
                >
                  {r.estado === 'ABIERTO' ? 'En proceso' : 'Resolver'}
                </Button>
              )}
            </div>
          </PermissionGate>
        )}
      />
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar reclamo"
        size="lg"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!idmandante || !clienteSel || !descripcion || !fechaLimite) {
              return;
            }
            createMutation.mutate({
              input: {
                idmandante,
                idcliente: clienteSel.idcliente,
                idprestamo: idprestamo || undefined,
                descripcion,
                fechaLimite: new Date(fechaLimite).toISOString(),
              },
            });
          }}
        >
          <div>
            <label className="mb-1 block text-sm font-medium">Cliente</label>
            <ClienteBuscarInput onSelect={setClienteSel} />
          </div>
          {clienteSel && (prestamosCliente?.prestamosPorCliente ?? []).length > 0 && (
            <select
              value={idprestamo}
              onChange={(e) =>
                setIdprestamo(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Préstamo (opcional)</option>
              {(prestamosCliente?.prestamosPorCliente ?? []).map((p) => (
                <option key={p.idprestamo} value={p.idprestamo}>
                  {p.noPrestamo} — {p.mandante?.nombre} — mora {p.diasMora}
                </option>
              ))}
            </select>
          )}
          <textarea
            required
            rows={4}
            placeholder="Descripción del reclamo"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <input
            required
            type="date"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={createMutation.isPending}>
            Registrar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
