'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DeleteRowButton,
  EditRowButton,
} from '@/components/ui/row-action-buttons';
import { Modal } from '@/components/ui/modal';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { useScopedPagination } from '@/hooks/use-scoped-pagination';
import { PlantillaImportacionForm ,type  PlantillaFormData } from '@/components/cobranza/plantilla-importacion-form';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { PageHeader } from '@/components/ui/page-header';
import { SearchParamsBoundary } from '@/components/ui/search-params-boundary';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';

import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_PLANTILLAS_IMPORTACION,
  CREATE_PLANTILLA_IMPORTACION,
  UPDATE_PLANTILLA_IMPORTACION,
  DELETE_PLANTILLA_IMPORTACION,
} from '@/lib/graphql/queries/cobranza.queries';
import type { PlantillaImportacion } from '@/types/cobranza';

function PlantillasPageContent() {
  const searchParams = useSearchParams();
  const mandanteInicial = searchParams.get('idmandante');
  const queryClient = useQueryClient();
  const [idmandante, setIdmandante] = useState<number | ''>(() => {
    if (mandanteInicial) {
      const parsed = Number(mandanteInicial);
      return Number.isNaN(parsed) ? '' : parsed;
    }
    return '';
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<PlantillaImportacion | undefined>();

  const {
    queryVars,
    resetPage,
    handlePageChange,
    handlePageSizeChange,
  } = useScopedPagination(idmandante === '' ? 'none' : idmandante);

  const { data, isLoading, error } = useGraphQLQuery<{
    plantillasImportacion: {
      plantillas: PlantillaImportacion[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(
    GET_PLANTILLAS_IMPORTACION,
    { idmandante: idmandante as number, ...queryVars },
    { enabled: typeof idmandante === 'number' },
  );

  const pageData = data?.plantillasImportacion;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [GET_PLANTILLAS_IMPORTACION] });
  };

  const createMutation = useGraphQLMutation(CREATE_PLANTILLA_IMPORTACION, {
    successMessage: 'Plantilla de importación creada correctamente',
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setSelected(undefined);
    },
  });

  const updateMutation = useGraphQLMutation(UPDATE_PLANTILLA_IMPORTACION, {
    successMessage: 'Plantilla de importación actualizada correctamente',
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setSelected(undefined);
    },
  });

  const deleteMutation = useGraphQLMutation(DELETE_PLANTILLA_IMPORTACION, {
    successMessage: 'Plantilla de importación eliminada correctamente',
    onSuccess: invalidate,
  });

  const columns = useMemo<ColumnDef<PlantillaImportacion>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Nombre' },
      {
        accessorKey: 'formatoFecha',
        header: 'Formato fecha',
        cell: ({ row }) => row.original.formatoFecha ?? '-',
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (row.original.estado ? 'Activa' : 'Inactiva'),
      },
    ],
    [],
  );

  const handleSubmit = (form: PlantillaFormData) => {
    if (selected) {
      updateMutation.mutate({
        input: {
          idplantillaImp: selected.idplantillaImp,
          nombre: form.nombre,
          mapeo: form.mapeo,
          formatoFecha: form.formatoFecha,
          estado: form.estado,
        },
      });
    } else {
      createMutation.mutate({ input: form });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plantillas de importación"
        description="Mapeo de columnas Excel → campos del sistema por mandante"
        actions={
          <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
            <Button
              disabled={!idmandante}
              onClick={() => {
                setSelected(undefined);
                setModalOpen(true);
              }}
            >
              Nueva plantilla
            </Button>
          </PermissionGate>
        }
      />

      <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
        <MandanteSelect
          value={idmandante}
          onChange={(value) => {
            setIdmandante(value);
            resetPage();
          }}
          label="Mandante"
          selectClassName="w-full max-w-md rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      </div>

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        {error && (
          <div className="mb-4 text-red-600">{error.message}</div>
        )}
        {!idmandante ? (
          <p className="text-sm text-gray-6">
            Seleccione un mandante para ver sus plantillas.
          </p>
        ) : (
          <PaginatedDataTable
            data={pageData?.plantillas ?? []}
            columns={columns}
            pagination={pageData}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            itemLabel="plantillas"
            rowActions={(p) => (
              <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
                <div className="flex justify-end gap-2">
                  <EditRowButton
                    onClick={() => {
                      setSelected(p);
                      setModalOpen(true);
                    }}
                  />
                  <DeleteRowButton
                    disabled={deleteMutation.isPending}
                    onClick={() =>
                      deleteMutation.mutate({ id: p.idplantillaImp })
                    }
                  />
                </div>
              </PermissionGate>
            )}
          />
        )}
      </div>

      {typeof idmandante === 'number' && (
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelected(undefined);
          }}
          title={selected ? 'Editar plantilla' : 'Nueva plantilla'}
          size="xl"
        >
          <PlantillaImportacionForm
            idmandante={idmandante}
            plantilla={selected}
            onSubmit={handleSubmit}
            onCancel={() => {
              setModalOpen(false);
              setSelected(undefined);
            }}
            isLoading={
              createMutation.isPending || updateMutation.isPending
            }
          />
        </Modal>
      )}
    </div>
  );
}

export default function PlantillasPage() {
  return (
    <SearchParamsBoundary>
      <PlantillasPageContent />
    </SearchParamsBoundary>
  );
}
