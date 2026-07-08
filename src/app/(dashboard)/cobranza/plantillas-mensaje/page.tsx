'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useSearchParams } from 'next/navigation';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { PageHeader } from '@/components/ui/page-header';
import { SearchParamsBoundary } from '@/components/ui/search-params-boundary';
import { useScopedPagination } from '@/hooks/use-scoped-pagination';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_PLANTILLAS_MENSAJE,
  CREATE_PLANTILLA_MENSAJE,
  UPDATE_PLANTILLA_MENSAJE,
  DELETE_PLANTILLA_MENSAJE,
} from '@/lib/graphql/queries/cobranza.queries';
import { PLANTILLA_VARIABLES_AYUDA } from '@/lib/cobranza/plantilla-mensaje-utils';
import type { PlantillaMensaje } from '@/types/cobranza';

function PlantillasMensajePageContent() {
  const searchParams = useSearchParams();
  const mandanteInicial = searchParams.get('idmandante');
  const [idmandante, setIdmandante] = useState<number | ''>(() => {
    if (mandanteInicial) {
      const parsed = Number(mandanteInicial);
      return Number.isNaN(parsed) ? '' : parsed;
    }
    return '';
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<PlantillaMensaje | undefined>();
  const [form, setForm] = useState({
    nombre: '',
    canal: 'WHATSAPP',
    etapa: '',
    contenido: '',
  });

  const {
    queryVars,
    resetPage,
    handlePageChange,
    handlePageSizeChange,
  } = useScopedPagination(idmandante === '' ? 'none' : idmandante);

  const { data, isLoading, refetch } = useGraphQLQuery<{
    plantillasMensaje: {
      plantillas: PlantillaMensaje[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(
    GET_PLANTILLAS_MENSAJE,
    { idmandante: idmandante as number, ...queryVars },
    { enabled: typeof idmandante === 'number' },
  );

  const pageData = data?.plantillasMensaje;

  const createMutation = useGraphQLMutation(CREATE_PLANTILLA_MENSAJE, {
    onSuccess: () => {
      refetch();
      setModalOpen(false);
    },
  });
  const updateMutation = useGraphQLMutation(UPDATE_PLANTILLA_MENSAJE, {
    onSuccess: () => {
      refetch();
      setModalOpen(false);
    },
  });
  const deleteMutation = useGraphQLMutation(DELETE_PLANTILLA_MENSAJE, {
    onSuccess: () => refetch(),
  });

  const columns = useMemo<ColumnDef<PlantillaMensaje>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Nombre' },
      { accessorKey: 'canal', header: 'Canal' },
      { accessorKey: 'etapa', header: 'Etapa' },
    ],
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idmandante) {
      return;
    }
    if (selected) {
      updateMutation.mutate({
        input: {
          idplantilla: selected.idplantilla,
          ...form,
          etapa: form.etapa || undefined,
        },
      });
    } else {
      createMutation.mutate({
        input: {
          idmandante,
          ...form,
          etapa: form.etapa || undefined,
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plantillas de mensaje"
        actions={
          <Button
            disabled={!idmandante}
            onClick={() => {
              setSelected(undefined);
              setForm({
                nombre: '',
                canal: 'WHATSAPP',
                etapa: '',
                contenido: '',
              });
              setModalOpen(true);
            }}
          >
            Nueva plantilla
          </Button>
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
        selectClassName="rounded border px-3 py-2 text-sm"
      />
      <PaginatedDataTable
        data={pageData?.plantillas ?? []}
        columns={columns}
        pagination={pageData}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="plantillas"
        rowActions={(p) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelected(p);
                setForm({
                  nombre: p.nombre,
                  canal: p.canal,
                  etapa: p.etapa ?? '',
                  contenido: p.contenido,
                });
                setModalOpen(true);
              }}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                deleteMutation.mutate({ idplantilla: p.idplantilla })
              }
            >
              Eliminar
            </Button>
          </div>
        )}
      />
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected ? 'Editar plantilla' : 'Nueva plantilla'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <select
            value={form.canal}
            onChange={(e) => setForm((f) => ({ ...f, canal: e.target.value }))}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
            <option value="LLAMADA">Llamada</option>
            <option value="CARTA">Carta</option>
          </select>
          <input
            value={form.etapa}
            onChange={(e) => setForm((f) => ({ ...f, etapa: e.target.value }))}
            placeholder="Etapa (opcional)"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <textarea
            required
            rows={6}
            value={form.contenido}
            onChange={(e) =>
              setForm((f) => ({ ...f, contenido: e.target.value }))
            }
            placeholder="Contenido del mensaje"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500">
            Variables: {PLANTILLA_VARIABLES_AYUDA.join(', ')}
          </p>
          <Button type="submit">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}

export default function PlantillasMensajePage() {
  return (
    <SearchParamsBoundary>
      <PlantillasMensajePageContent />
    </SearchParamsBoundary>
  );
}
