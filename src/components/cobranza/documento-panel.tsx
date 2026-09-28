'use client';

import { useState } from 'react';
import { DeleteRowButton } from '@/components/ui/row-action-buttons';
import { TablePagination } from '@/components/cobranza/data-table';
import { usePaginatedPanel } from '@/hooks/use-paginated-panel';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_DOCUMENTOS,
  DELETE_DOCUMENTO,
} from '@/lib/graphql/queries/cobranza.queries';
import type { DocumentoPrestamo } from '@/types/cobranza';
import { notificationToast } from '@/lib/notifications/notification-toast';
import { csrfHeaders } from '@/lib/security/csrf';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';

function hrefDocumentoSeguro(url: string): string {
  if (url.startsWith('/uploads/cobranza/')) {
    const nombre = url.split('/').pop();
    if (nombre) {
      return `/api/cobranza/documentos/file/${nombre}`;
    }
  }
  return url;
}

interface DocumentoPanelProps {
  idprestamo: number;
}

export function DocumentoPanel({ idprestamo }: DocumentoPanelProps) {
  const [tipo, setTipo] = useState('EVIDENCIA');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { queryVars, handlePageChange, handlePageSizeChange } =
    usePaginatedPanel({ scopeKey: idprestamo, initialPageSize: 10 });

  const { data, refetch, isLoading } = useGraphQLQuery<{
    documentos: {
      documentos: DocumentoPrestamo[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_DOCUMENTOS, { idprestamo, ...queryVars });

  const pageData = data?.documentos;
  const documentos = pageData?.documentos ?? [];

  const deleteMutation = useGraphQLMutation(DELETE_DOCUMENTO, {
    successMessage: 'Documento eliminado correctamente',
    onSuccess: () => refetch(),
  });

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('idprestamo', String(idprestamo));
      formData.append('tipo', tipo);
      const res = await fetch('/api/cobranza/documentos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: csrfHeaders(),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Error al subir');
      }
      await refetch();
      notificationToast.success('Archivo subido correctamente');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al subir';
      setUploadError(message);
      notificationToast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
      <div className="grid gap-2 sm:grid-cols-3">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        >
          <option value="RECIBO">Recibo</option>
          <option value="PODER">Poder</option>
          <option value="EVIDENCIA">Evidencia</option>
          <option value="GRABACION">Grabación</option>
          <option value="CONTRATO">Contrato</option>
        </select>
        <div className="rounded border px-3 py-2 text-sm text-gray-500 dark:border-dark-3 dark:bg-dark-2">
          Los archivos se guardan comprimidos en la base de datos.
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          O subir archivo (PDF, imagen, audio — máx. 5 MB)
        </label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.mp3,.wav"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleUpload(file);
            }
          }}
          className="text-sm"
        />
        {uploading && (
          <p className="mt-1 text-xs text-gray-500">Guardando en la base de datos...</p>
        )}
        {uploadError && (
          <p className="mt-1 text-xs text-red-600">{uploadError}</p>
        )}
      </div>
      </PermissionGate>
      {isLoading && <p className="text-sm text-gray-500">Cargando...</p>}
      <ul className="divide-y text-sm dark:divide-dark-3">
        {documentos.map((d) => (
          <li
            key={d.iddocumento}
            className="flex items-center justify-between py-2"
          >
            <div>
              <span className="font-medium">{d.tipo}</span>
              <a
                href={hrefDocumentoSeguro(d.url)}
                className="ml-2 text-primary hover:underline"
              >
                Descargar
              </a>
              <div className="text-xs text-gray-500">
                Cargado el {new Date(d.createdAt).toLocaleString('es-NI')}
              </div>
            </div>
            <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
              <DeleteRowButton
                onClick={() =>
                  deleteMutation.mutate({ iddocumento: d.iddocumento })
                }
              />
            </PermissionGate>
          </li>
        ))}
      </ul>
      {pageData && pageData.total > 0 && (
        <TablePagination
          page={pageData.page}
          pageSize={pageData.pageSize}
          total={pageData.total}
          totalPages={pageData.totalPages}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          itemLabel="documentos"
        />
      )}
      {!isLoading && documentos.length === 0 && (
        <p className="text-sm text-gray-500">Sin documentos adjuntos.</p>
      )}
    </div>
  );
}
