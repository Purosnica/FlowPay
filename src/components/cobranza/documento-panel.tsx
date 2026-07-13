'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DeleteRowButton } from '@/components/ui/row-action-buttons';
import { TablePagination } from '@/components/cobranza/data-table';
import { usePaginatedPanel } from '@/hooks/use-paginated-panel';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_DOCUMENTOS,
  CREATE_DOCUMENTO,
  DELETE_DOCUMENTO,
} from '@/lib/graphql/queries/cobranza.queries';
import type { DocumentoPrestamo } from '@/types/cobranza';
import { csrfHeaders } from '@/lib/security/csrf';

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
  const [url, setUrl] = useState('');
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

  const createMutation = useGraphQLMutation(CREATE_DOCUMENTO, {
    onSuccess: () => {
      refetch();
      setUrl('');
    },
  });

  const deleteMutation = useGraphQLMutation(DELETE_DOCUMENTO, {
    onSuccess: () => refetch(),
  });

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('idprestamo', String(idprestamo));
      const res = await fetch('/api/cobranza/documentos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: csrfHeaders(),
      });
      const json = (await res.json()) as {
        success: boolean;
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.success || !json.url) {
        throw new Error(json.error ?? 'Error al subir');
      }
      setUrl(json.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        className="grid gap-2 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!url.trim()) {
            return;
          }
          createMutation.mutate({
            input: { idprestamo, tipo, url: url.trim() },
          });
        }}
      >
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
        <input
          required
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL del documento o archivo subido"
          className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
        <Button type="submit" disabled={createMutation.isPending}>
          Adjuntar
        </Button>
      </form>
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
          <p className="mt-1 text-xs text-gray-500">Subiendo...</p>
        )}
        {uploadError && (
          <p className="mt-1 text-xs text-red-600">{uploadError}</p>
        )}
      </div>
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
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-primary hover:underline"
              >
                Ver
              </a>
            </div>
            <DeleteRowButton
              onClick={() =>
                deleteMutation.mutate({ iddocumento: d.iddocumento })
              }
            />
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
