'use client';

import { useState, useId } from 'react';
import { Button } from '@/components/ui/button';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_CAMPANAS,
  CREATE_CAMPANA,
  GET_PLANTILLAS_IMPORTACION,
} from '@/lib/graphql/queries/cobranza.queries';
import type {
  Campana,
  PlantillaImportacion,
  ResultadoImportacionCompleta,
  FilaDesglosePreview,
  ResumenDesglosePreview,
} from '@/types/cobranza';
import { ImportacionJobMonitor } from '@/components/cobranza/importacion-job-monitor';
import { ImportDesglosePreviewTable } from '@/components/cobranza/import-desglose-preview-table';
import { csrfHeaders } from '@/lib/security/csrf';
import { ACCEPT_IMPORTACION } from '@/lib/cobranza/upload-limits';

type TipoImportacion =
  | 'CARTERA'
  | 'GESTIONES'
  | 'PAGOS'
  | 'PROMESAS'
  | 'CONTACTOS'
  | 'COMPLETO';

interface VistaPreviaImportacion {
  mandante: { idmandante: number; nombre: string };
  totalProcesados: number;
  prestamosNuevos: number;
  prestamosExistentes: number;
  prestamosSaldoActualizado: number;
  prestamosConErrores: number;
  omitidos: number;
  saldoTotalCartera: number;
  prestamosAusentes: number;
  duplicadosArchivo: { noPrestamo: string; filas: number[] }[];
  errores: { fila: number; mensaje: string }[];
  puedeImportar: boolean;
  desgloseFilas: FilaDesglosePreview[];
  resumenDesglose: ResumenDesglosePreview;
}

interface ImportarCarteraFormProps {
  onSuccess?: (resultado: ResultadoImportacionCompleta) => void;
}

export function ImportarCarteraForm({ onSuccess }: ImportarCarteraFormProps) {
  const [tipoImport, setTipoImport] = useState<TipoImportacion>('COMPLETO');
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [idcampana, setIdcampana] = useState<number | ''>('');
  const [fechaCorte, setFechaCorte] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [nombreHoja, setNombreHoja] = useState('data');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] =
    useState<ResultadoImportacionCompleta | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaImportacion | null>(
    null,
  );
  const [idplantillaImp, setIdplantillaImp] = useState<number | ''>('');
  const [nuevaCampana, setNuevaCampana] = useState('');
  const [mostrarNuevaCampana, setMostrarNuevaCampana] = useState(false);
  const [importacionAsync, setImportacionAsync] = useState(false);
  const [idjobAsync, setIdjobAsync] = useState<number | null>(null);
  const [mandanteNombre, setMandanteNombre] = useState('');
  const tipoImportId = useId();
  const fechaCorteId = useId();
  const campanaId = useId();

  const { data: campanasData, refetch: refetchCampanas } = useGraphQLQuery<{
    campanas: {
      campanas: Campana[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(
    GET_CAMPANAS,
    { idmandante: idmandante as number },
    {
      enabled: typeof idmandante === 'number',
      requestOptions: { timeout: 120_000, suppressErrorToast: true },
    },
  );

  const { data: plantillasData } = useGraphQLQuery<{
    plantillasImportacion: {
      plantillas: PlantillaImportacion[];
    };
  }>(
    GET_PLANTILLAS_IMPORTACION,
    { idmandante: idmandante as number, page: 1, pageSize: 100 },
    {
      enabled: typeof idmandante === 'number',
      requestOptions: { timeout: 120_000, suppressErrorToast: true },
    },
  );

  const createCampanaMutation = useGraphQLMutation(CREATE_CAMPANA, {
    onSuccess: () => {
      refetchCampanas();
      setNuevaCampana('');
      setMostrarNuevaCampana(false);
    },
  });

  const campanas = campanasData?.campanas?.campanas ?? [];
  const plantillas = plantillasData?.plantillasImportacion?.plantillas ?? [];

  const requiereCartera =
    tipoImport === 'CARTERA' || tipoImport === 'COMPLETO';

  const handleCrearCampana = () => {
    if (!idmandante || !nuevaCampana.trim()) {
      return;
    }
    createCampanaMutation.mutate({
      input: {
        idmandante,
        nombre: nuevaCampana.trim(),
        fechaCorte: new Date(fechaCorte).toISOString(),
      },
    });
  };

  const construirFormData = (preview: boolean): FormData => {
    const formData = new FormData();
    if (!archivo) {
      throw new Error('Archivo requerido');
    }
    formData.append('archivo', archivo);
    formData.append('tipo', tipoImport);
    formData.append('idmandante', String(idmandante));
    if (idcampana) {
      formData.append('idcampana', String(idcampana));
    }
    formData.append('fechaCorte', new Date(fechaCorte).toISOString());
    if (nombreHoja.trim()) {
      formData.append('nombreHoja', nombreHoja.trim());
    }
    if (idplantillaImp) {
      formData.append('idplantillaImp', String(idplantillaImp));
    }
    if (preview) {
      formData.append('preview', 'true');
    }
    return formData;
  };

  const validarFormulario = (): boolean => {
    if (!archivo || !idmandante) {
      setError('Complete mandante y archivo.');
      return false;
    }
    if (requiereCartera && !idcampana) {
      setError('Cartera y completo requieren campaña.');
      return false;
    }
    return true;
  };

  const handleVistaPrevia = async () => {
    setError(null);
    setResultado(null);
    setVistaPrevia(null);

    if (!validarFormulario() || !requiereCartera) {
      if (!requiereCartera) {
        setError('Vista previa disponible solo para cartera o completo.');
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cobranza/importar', {
        method: 'POST',
        body: construirFormData(true),
        credentials: 'include',
        headers: csrfHeaders(),
      });

      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        data?: VistaPreviaImportacion;
      };

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? 'Error en vista previa');
      }

      setVistaPrevia(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en vista previa');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarImportacion = async () => {
    setError(null);
    setResultado(null);
    setIdjobAsync(null);

    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      if (importacionAsync) {
        const res = await fetch('/api/cobranza/importar/async', {
          method: 'POST',
          body: construirFormData(false),
          credentials: 'include',
          headers: csrfHeaders(),
        });
        const json = (await res.json()) as {
          success: boolean;
          error?: string;
          job?: { idjob: number };
        };
        if (!res.ok || !json.success || !json.job) {
          throw new Error(json.error ?? 'Error al encolar importación');
        }
        setIdjobAsync(json.job.idjob);
        setVistaPrevia(null);
        return;
      }

      const res = await fetch('/api/cobranza/importar', {
        method: 'POST',
        body: construirFormData(false),
        credentials: 'include',
        headers: csrfHeaders(),
      });

      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        data?: ResultadoImportacionCompleta;
      };

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? 'Error al importar');
      }

      setResultado(json.data);
      setVistaPrevia(null);
      onSuccess?.(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={tipoImportId}
            className="mb-1 block text-sm font-medium"
          >
            Tipo de importación *
          </label>
          <select
            id={tipoImportId}
            value={tipoImport}
            onChange={(e) => {
              setTipoImport(e.target.value as TipoImportacion);
              setVistaPrevia(null);
            }}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          >
            <option value="COMPLETO">
              Completo (data + REGISTROS + PROMESAS + CONTACTOS + PAGOS)
            </option>
            <option value="CARTERA">Solo cartera (hoja data)</option>
            <option value="GESTIONES">Solo gestiones (REGISTROS)</option>
            <option value="PROMESAS">Solo promesas (PROMESAS)</option>
            <option value="CONTACTOS">Solo contactos (CONTACTOS)</option>
            <option value="PAGOS">Solo pagos (PAGOS)</option>
          </select>
        </div>
        <MandanteSelect
          value={idmandante}
          onChange={(value, mandante) => {
            setIdmandante(value);
            setMandanteNombre(mandante?.nombre ?? '');
            setIdcampana('');
            setIdplantillaImp('');
            setVistaPrevia(null);
          }}
          label="Mandante"
          required
        />

        <div>
          <label
            htmlFor={fechaCorteId}
            className="mb-1 block text-sm font-medium"
          >
            Fecha de corte *
          </label>
          <input
            id={fechaCorteId}
            type="date"
            required
            value={fechaCorte}
            onChange={(e) => setFechaCorte(e.target.value)}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor={campanaId} className="mb-1 block text-sm font-medium">
            Campaña *
          </label>
          <select
            id={campanaId}
            required={requiereCartera}
            value={idcampana}
            onChange={(e) =>
              setIdcampana(e.target.value ? Number(e.target.value) : '')
            }
            disabled={!idmandante}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          >
            <option value="">Seleccione...</option>
            {campanas.map((c) => (
              <option key={c.idcampana} value={c.idcampana}>
                {c.nombre} ({c.fechaCorte.slice(0, 10)})
              </option>
            ))}
          </select>
          {idmandante && (
            <button
              type="button"
              className="mt-1 text-xs text-primary hover:underline"
              onClick={() => setMostrarNuevaCampana((v) => !v)}
            >
              {mostrarNuevaCampana ? 'Cancelar' : '+ Nueva campaña'}
            </button>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Plantilla (opcional)
          </label>
          <select
            value={idplantillaImp}
            onChange={(e) =>
              setIdplantillaImp(
                e.target.value ? Number(e.target.value) : '',
              )
            }
            disabled={!idmandante}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          >
            <option value="">Automática (activa más reciente)</option>
            {plantillas.map((p) => (
              <option key={p.idplantillaImp} value={p.idplantillaImp}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Hoja Excel (opcional)
          </label>
          <input
            type="text"
            value={nombreHoja}
            onChange={(e) => setNombreHoja(e.target.value)}
            placeholder="data"
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
      </div>

      {mostrarNuevaCampana && (
        <div className="flex gap-2 rounded-lg border border-stroke p-3 dark:border-dark-3">
          <input
            type="text"
            value={nuevaCampana}
            onChange={(e) => setNuevaCampana(e.target.value)}
            placeholder="Nombre de campaña (ej. Marzo 2026)"
            className="flex-1 rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleCrearCampana}
            disabled={createCampanaMutation.isPending}
          >
            Crear
          </Button>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">
          Archivo Excel / CSV *
        </label>
        <input
          type="file"
          accept={ACCEPT_IMPORTACION}
          onChange={(e) => {
            setArchivo(e.target.files?.[0] ?? null);
            setVistaPrevia(null);
          }}
          className="w-full text-sm text-dark dark:text-white"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={importacionAsync}
          onChange={(e) => setImportacionAsync(e.target.checked)}
          className="rounded border-stroke"
        />
        Importación en segundo plano (recomendado para archivos grandes)
      </label>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {vistaPrevia && (
        <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
          <h3 className="font-medium text-dark dark:text-white">
            Vista previa de importación
          </h3>
          <p className="mt-1 text-sm text-gray-6">
            Mandante: {vistaPrevia.mandante.nombre || mandanteNombre}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div>
              <p className="text-gray-6">Total procesados</p>
              <p className="font-semibold">{vistaPrevia.totalProcesados}</p>
            </div>
            <div>
              <p className="text-gray-6">Préstamos nuevos</p>
              <p className="font-semibold text-green-600">
                {vistaPrevia.prestamosNuevos}
              </p>
            </div>
            <div>
              <p className="text-gray-6">Préstamos existentes</p>
              <p className="font-semibold">{vistaPrevia.prestamosExistentes}</p>
            </div>
            <div>
              <p className="text-gray-6">Saldo actualizado</p>
              <p className="font-semibold text-amber-600">
                {vistaPrevia.prestamosSaldoActualizado}
              </p>
            </div>
            <div>
              <p className="text-gray-6">Con errores</p>
              <p className="font-semibold text-red-600">
                {vistaPrevia.prestamosConErrores}
              </p>
            </div>
            <div>
              <p className="text-gray-6">Ausentes en archivo</p>
              <p className="font-semibold">{vistaPrevia.prestamosAusentes}</p>
            </div>
            <div>
              <p className="text-gray-6">Saldo total cartera</p>
              <p className="font-semibold">
                C$ {vistaPrevia.saldoTotalCartera.toLocaleString('es-NI')}
              </p>
            </div>
            <div>
              <p className="text-gray-6">Omitidos</p>
              <p className="font-semibold">{vistaPrevia.omitidos}</p>
            </div>
          </div>

          {vistaPrevia.duplicadosArchivo.length > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20">
              <p className="font-medium">Duplicados en archivo (bloquean la carga):</p>
              <ul className="mt-1 list-inside list-disc">
                {vistaPrevia.duplicadosArchivo.map((d) => (
                  <li key={d.noPrestamo}>
                    {d.noPrestamo} — filas {d.filas.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {vistaPrevia.desgloseFilas.length > 0 && (
            <ImportDesglosePreviewTable
              filas={vistaPrevia.desgloseFilas}
              resumen={vistaPrevia.resumenDesglose}
            />
          )}

          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              onClick={handleConfirmarImportacion}
              disabled={loading || !vistaPrevia.puedeImportar}
            >
              {loading ? 'Importando...' : 'Confirmar importación'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVistaPrevia(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {idjobAsync !== null && (
        <ImportacionJobMonitor
          idjob={idjobAsync}
          onCompletado={() => setIdjobAsync(null)}
        />
      )}

      {resultado && (
        <div className="rounded-lg bg-green-50 p-4 text-sm dark:bg-green-900/20">
          <p className="font-medium text-green-800 dark:text-green-200">
            Importación completada
          </p>
          <ul className="mt-2 space-y-1 text-green-700 dark:text-green-300">
            {resultado.cartera && (
              <>
                <li>Cartera — filas: {resultado.cartera.totalFilas}</li>
                <li>Préstamos creados: {resultado.cartera.prestamosCreados}</li>
                <li>
                  Préstamos actualizados: {resultado.cartera.prestamosActualizados}
                </li>
                <li>
                  Saldo actualizado:{' '}
                  {resultado.cartera.prestamosSaldoActualizado ?? 0}
                </li>
                <li>
                  Saldo total: C${' '}
                  {(resultado.cartera.saldoTotalCartera ?? 0).toLocaleString(
                    'es-NI',
                  )}
                </li>
                <li>
                  Ausentes en archivo: {resultado.cartera.prestamosAusentes ?? 0}
                </li>
              </>
            )}
            {resultado.gestiones && (
              <li>
                Gestiones importadas: {resultado.gestiones.gestionesCreadas}
              </li>
            )}
            {resultado.pagos && (
              <li>Pagos importados: {resultado.pagos.pagosCreados}</li>
            )}
          </ul>
        </div>
      )}

      {!vistaPrevia && (
        <div className="flex gap-2">
          {requiereCartera && (
            <Button
              type="button"
              variant="outline"
              onClick={handleVistaPrevia}
              disabled={loading}
            >
              {loading ? 'Analizando...' : 'Vista previa'}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleConfirmarImportacion}
            disabled={loading}
          >
            {loading
              ? 'Importando...'
              : requiereCartera
                ? 'Importar sin vista previa'
                : 'Importar'}
          </Button>
        </div>
      )}
    </div>
  );
}
