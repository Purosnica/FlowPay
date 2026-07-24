'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DeleteRowButton,
  EditRowButton,
} from '@/components/ui/row-action-buttons';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { SearchParamsBoundary } from '@/components/ui/search-params-boundary';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { useScopedPagination } from '@/hooks/use-scoped-pagination';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
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

function formatDisplayLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '—';
  return trimmed
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

function canalBadgeVariant(
  canal: string,
): 'success' | 'info' | 'default' | 'warning' | 'secondary' {
  const normalized = canal.toUpperCase();
  if (normalized === 'WHATSAPP') return 'success';
  if (normalized === 'SMS') return 'info';
  if (normalized === 'EMAIL') return 'default';
  if (normalized === 'LLAMADA') return 'warning';
  return 'secondary';
}

function canalLabel(canal: string): string {
  const normalized = canal.toUpperCase();
  if (normalized === 'WHATSAPP') return 'WhatsApp';
  if (normalized === 'SMS') return 'SMS';
  if (normalized === 'EMAIL') return 'Email';
  if (normalized === 'LLAMADA') return 'Llamada';
  if (normalized === 'CARTA') return 'Carta';
  return formatDisplayLabel(canal);
}

function previewContenido(contenido: string): string {
  const compact = contenido.replace(/\s+/g, ' ').trim();
  if (compact.length <= 80) return compact;
  return `${compact.slice(0, 80)}…`;
}

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
  const [formError, setFormError] = useState<string | null>(null);

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
    successMessage: 'Plantilla creada correctamente',
    onSuccess: () => {
      void refetch();
      setModalOpen(false);
    },
  });
  const updateMutation = useGraphQLMutation(UPDATE_PLANTILLA_MENSAJE, {
    successMessage: 'Plantilla actualizada correctamente',
    onSuccess: () => {
      void refetch();
      setModalOpen(false);
    },
  });
  const deleteMutation = useGraphQLMutation(DELETE_PLANTILLA_MENSAJE, {
    successMessage: 'Plantilla eliminada correctamente',
    onSuccess: () => {
      void refetch();
    },
  });

  const columns = useMemo<ColumnDef<PlantillaMensaje>[]>(
    () => [
      {
        accessorKey: 'nombre',
        header: 'Nombre',
        cell: ({ row }) => (
          <div className="min-w-0 max-w-md">
            <p className="font-medium text-dark dark:text-white">
              {formatDisplayLabel(row.original.nombre)}
            </p>
            <p className="mt-0.5 truncate text-xs text-gray-5">
              {previewContenido(row.original.contenido)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'canal',
        header: 'Canal',
        cell: ({ row }) => (
          <Badge
            variant={canalBadgeVariant(row.original.canal)}
            size="sm"
          >
            {canalLabel(row.original.canal)}
          </Badge>
        ),
      },
      {
        accessorKey: 'etapa',
        header: 'Etapa',
        cell: ({ row }) =>
          row.original.etapa ? (
            <Badge variant="secondary" size="sm">
              {formatDisplayLabel(row.original.etapa)}
            </Badge>
          ) : (
            <span className="text-xs text-gray-5">Sin etapa</span>
          ),
      },
    ],
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idmandante) {
      setFormError('Seleccione un mandante antes de guardar.');
      return;
    }
    if (!form.nombre.trim() || !form.contenido.trim()) {
      setFormError('Nombre y contenido son obligatorios.');
      return;
    }
    setFormError(null);
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

  const openCreate = () => {
    setSelected(undefined);
    setFormError(null);
    setForm({
      nombre: '',
      canal: 'WHATSAPP',
      etapa: '',
      contenido: '',
    });
    setModalOpen(true);
  };

  const openEdit = (p: PlantillaMensaje) => {
    setSelected(p);
    setForm({
      nombre: p.nombre,
      canal: p.canal,
      etapa: p.etapa ?? '',
      contenido: p.contenido,
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plantillas de mensaje"
        description="Mensajes reutilizables por canal y etapa de cobranza."
        actions={
          <PermissionGate permiso={PERMISO.MANDANTE_WRITE}>
            <Button
              disabled={!idmandante}
              title={
                !idmandante
                  ? 'Seleccione un mandante primero'
                  : undefined
              }
              onClick={openCreate}
            >
              + Nueva plantilla
            </Button>
          </PermissionGate>
        }
      />

      <div className="rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
        <MandanteSelect
          value={idmandante}
          onChange={(value) => {
            setIdmandante(value);
            resetPage();
          }}
          label="Mandante"
          placeholder="Seleccione un mandante..."
          selectClassName="w-full max-w-md rounded border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
      </div>

      {!idmandante ? (
        <Card className="rounded-xl" padding="lg">
          <p className="text-sm text-gray-5">
            Seleccione un mandante para ver sus plantillas de mensaje.
          </p>
        </Card>
      ) : (
        <Card className="rounded-xl" padding="md">
          <PaginatedDataTable
            data={pageData?.plantillas ?? []}
            columns={columns}
            pagination={pageData}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            itemLabel="plantillas"
            emptyMessage="No hay plantillas para este mandante."
            rowActions={(p) => (
              <PermissionGate permiso={PERMISO.MANDANTE_WRITE}>
                <div className="flex justify-end gap-2">
                  <EditRowButton onClick={() => openEdit(p)} />
                  <DeleteRowButton
                    disabled={deleteMutation.isPending}
                    onClick={() =>
                      deleteMutation.mutate({ idplantilla: p.idplantilla })
                    }
                  />
                </div>
              </PermissionGate>
            )}
          />
        </Card>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected ? 'Editar plantilla' : 'Nueva plantilla'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
              Nombre
            </label>
            <input
              required
              value={form.nombre}
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre: e.target.value }))
              }
              placeholder="Ej. Recordatorio WhatsApp"
              className="w-full rounded border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
                Canal
              </label>
              <select
                value={form.canal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, canal: e.target.value }))
                }
                className="w-full rounded border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
                <option value="LLAMADA">Llamada</option>
                <option value="CARTA">Carta</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
                Etapa
              </label>
              <input
                value={form.etapa}
                onChange={(e) =>
                  setForm((f) => ({ ...f, etapa: e.target.value }))
                }
                placeholder="Opcional (ej. Administrativa)"
                className="w-full rounded border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
              Contenido del mensaje
            </label>
            <textarea
              required
              rows={6}
              value={form.contenido}
              onChange={(e) =>
                setForm((f) => ({ ...f, contenido: e.target.value }))
              }
              placeholder="Escriba el mensaje. Puede usar variables abajo."
              className="w-full rounded border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
            />
            <p className="mt-1.5 text-xs text-gray-5">
              Variables: {PLANTILLA_VARIABLES_AYUDA.join(', ')}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending || updateMutation.isPending
              }
            >
              Guardar
            </Button>
          </div>
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
