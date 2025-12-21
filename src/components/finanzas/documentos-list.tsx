"use client";

import { useState } from "react";
import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { useGraphQLMutation } from "@/hooks/use-graphql-mutation";
import { LIST_DOCUMENTOS_POR_PRESTAMO, CREATE_DOCUMENTO, DELETE_DOCUMENTO } from "@/lib/graphql/queries/finanzas.queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";

type DocumentoItem = {
  iddocumento: number;
  tipo: string;
  nombre: string;
  nombreArchivo: string;
  rutaArchivo: string;
  mimeType?: string | null;
  tamano?: number | null;
  version: number;
  esVersionActual: boolean;
  observaciones?: string | null;
  createdAt: string;
  usuario?: {
    idusuario: number;
    nombre: string;
  } | null;
};

type DocumentosResponse = {
  documentosPorPrestamo: DocumentoItem[];
};

interface DocumentosListProps {
  idprestamo: number;
}

const TipoDocumentoBadge: React.FC<{ tipo: string }> = ({ tipo }) => {
  const colorMap: Record<string, string> = {
    CONTRATO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PAGARE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    EVIDENCIA: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    IDENTIFICACION: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    COMPROBANTE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    OTRO: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };
  const color = colorMap[tipo] || "bg-gray-100 text-gray-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {tipo}
    </span>
  );
};

const formatearTamano = (bytes?: number | null): string => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export function DocumentosList({ idprestamo }: DocumentosListProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<string>("");
  const [nombre, setNombre] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");

  const { data, isLoading, isError, error, refetch } = useGraphQLQuery<DocumentosResponse>(
    LIST_DOCUMENTOS_POR_PRESTAMO,
    {
      idprestamo,
      tipo: filtroTipo || undefined,
      soloVersionesActuales: true,
    },
    { placeholderData: (previousData) => previousData }
  );

  const createDocumentoMutation = useGraphQLMutation(CREATE_DOCUMENTO, {
    onSuccess: () => {
      setIsUploadOpen(false);
      setArchivo(null);
      setTipoDocumento("");
      setNombre("");
      setObservaciones("");
      refetch();
    },
  });

  const deleteDocumentoMutation = useGraphQLMutation(DELETE_DOCUMENTO, {
    onSuccess: () => {
      refetch();
    },
  });

  const documentos = data?.documentosPorPrestamo || [];

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!archivo || !tipoDocumento || !nombre) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    try {
      // 1. Subir archivo al servidor
      const formData = new FormData();
      formData.append("file", archivo);
      formData.append("idprestamo", idprestamo.toString());
      formData.append("tipo", tipoDocumento);

      const uploadResponse = await fetch("/api/documentos/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Error al subir archivo");
      }

      const uploadData = await uploadResponse.json();

      // 2. Crear registro en base de datos
      createDocumentoMutation.mutate({
        input: {
          idprestamo,
          tipo: tipoDocumento,
          nombre,
          nombreArchivo: uploadData.nombreArchivo,
          rutaArchivo: uploadData.rutaArchivo,
          mimeType: uploadData.mimeType,
          tamano: uploadData.tamano,
          observaciones: observaciones || undefined,
        },
      });
    } catch (error) {
      console.error("Error subiendo documento:", error);
      alert(error instanceof Error ? error.message : "Error al subir documento");
    }
  };

  const handleDownload = (documento: DocumentoItem) => {
    window.open(`/api/documentos/${documento.iddocumento}/download`, "_blank");
  };

  const handleDelete = (iddocumento: number) => {
    if (confirm("¿Está seguro de eliminar este documento?")) {
      deleteDocumentoMutation.mutate({ id: iddocumento });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-dark dark:text-white">Documentos</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Gestión de documentos del préstamo
          </p>
        </div>
        <Button size="sm" onClick={() => setIsUploadOpen(true)}>
          Subir Documento
        </Button>
      </div>

      <div className="flex items-end gap-3">
        <div className="w-full md:w-1/4">
          <Select
            name="filtroTipo"
            label="Filtrar por tipo"
            options={[
              { value: "CONTRATO", label: "Contrato" },
              { value: "PAGARE", label: "Pagaré" },
              { value: "EVIDENCIA", label: "Evidencia" },
              { value: "IDENTIFICACION", label: "Identificación" },
              { value: "COMPROBANTE", label: "Comprobante" },
              { value: "OTRO", label: "Otro" },
            ]}
            placeholder="Todos los tipos"
            defaultValue=""
            onChange={(e) => setFiltroTipo(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        )}

        {isError && (
          <div className="px-4 py-4 text-center text-red-500">
            Error al cargar documentos: {error instanceof Error ? error.message : "desconocido"}
          </div>
        )}

        {!isLoading && !isError && documentos.length === 0 && (
          <div className="px-4 py-12 text-center text-gray-600 dark:text-gray-300">
            No hay documentos registrados.
          </div>
        )}

        {!isLoading && !isError && documentos.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-3 text-sm">
            <thead className="bg-gray-50 dark:bg-dark-3">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Tipo</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Nombre</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Versión</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Tamaño</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Subido por</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Fecha</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
              {documentos.map((doc) => (
                <tr key={doc.iddocumento} className="hover:bg-gray-50 dark:hover:bg-dark-3/60">
                  <td className="px-4 py-2">
                    <TipoDocumentoBadge tipo={doc.tipo} />
                  </td>
                  <td className="px-4 py-2 font-medium text-dark dark:text-white">{doc.nombre}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {doc.version}
                    {doc.esVersionActual && (
                      <span className="ml-1 text-xs text-green-600">(Actual)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {formatearTamano(doc.tamano)}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {doc.usuario?.nombre || "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                      >
                        Descargar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(doc.iddocumento)}
                        disabled={deleteDocumentoMutation.isPending}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setArchivo(null);
          setTipoDocumento("");
          setNombre("");
          setObservaciones("");
        }}
        title="Subir Documento"
        size="md"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Tipo de Documento *
            </label>
            <Select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              options={[
                { value: "CONTRATO", label: "Contrato" },
                { value: "PAGARE", label: "Pagaré" },
                { value: "EVIDENCIA", label: "Evidencia" },
                { value: "IDENTIFICACION", label: "Identificación" },
                { value: "COMPROBANTE", label: "Comprobante" },
                { value: "OTRO", label: "Otro" },
              ]}
              placeholder="Seleccione tipo"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Nombre del Documento *
            </label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Contrato de préstamo"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Archivo *
            </label>
            <Input
              type="file"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Tamaño máximo: 10MB. Formatos: PDF, imágenes, documentos.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Observaciones
            </label>
            <textarea
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Notas adicionales sobre el documento"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsUploadOpen(false);
                setArchivo(null);
                setTipoDocumento("");
                setNombre("");
                setObservaciones("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createDocumentoMutation.isPending || !archivo || !tipoDocumento || !nombre}
            >
              {createDocumentoMutation.isPending ? "Subiendo..." : "Subir Documento"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

