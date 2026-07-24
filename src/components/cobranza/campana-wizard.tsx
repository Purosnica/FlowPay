'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  CREATE_CAMPANA,
  CREATE_SECUENCIA_CONTACTO,
  GET_PLANTILLAS_MENSAJE,
} from '@/lib/graphql/queries/cobranza.queries';
import type { PlantillaMensaje } from '@/types/cobranza';
import { ImportacionJobMonitor } from '@/components/cobranza/importacion-job-monitor';
import { notificationToast } from '@/lib/notifications/notification-toast';
import { csrfHeaders } from '@/lib/security/csrf';
import { ACCEPT_IMPORTACION } from '@/lib/cobranza/upload-limits';

interface PasoWizard {
  orden: number;
  diasDesdeInicio: number;
  canal: string;
  accion: string;
  idplantilla: number | '';
}

const CANALES = ['LLAMADA', 'WHATSAPP', 'SMS', 'EMAIL', 'VISITA'];

export function CampanaWizard() {
  const [paso, setPaso] = useState(1);
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [nombreCampana, setNombreCampana] = useState('');
  const [fechaCorte, setFechaCorte] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [nombreSecuencia, setNombreSecuencia] = useState('Secuencia estándar');
  const [pasosSecuencia, setPasosSecuencia] = useState<PasoWizard[]>([
    { orden: 1, diasDesdeInicio: 0, canal: 'LLAMADA', accion: 'Contacto inicial', idplantilla: '' },
    { orden: 2, diasDesdeInicio: 3, canal: 'WHATSAPP', accion: 'Recordatorio', idplantilla: '' },
    { orden: 3, diasDesdeInicio: 7, canal: 'LLAMADA', accion: 'Seguimiento', idplantilla: '' },
  ]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nombreHoja, setNombreHoja] = useState('data');
  const [idcampanaCreada, setIdcampanaCreada] = useState<number | null>(null);
  const [idjob, setIdjob] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lanzando, setLanzando] = useState(false);

  const { data: plantillasData } = useGraphQLQuery<{
    plantillasMensaje: { plantillas: PlantillaMensaje[] };
  }>(
    GET_PLANTILLAS_MENSAJE,
    { idmandante: idmandante as number, page: 1, pageSize: 100 },
    { enabled: typeof idmandante === 'number' },
  );

  const createCampana = useGraphQLMutation<
    { createCampana: { idcampana: number } }
  >(CREATE_CAMPANA);
  const createSecuencia = useGraphQLMutation(CREATE_SECUENCIA_CONTACTO);

  const plantillas = plantillasData?.plantillasMensaje?.plantillas ?? [];

  const agregarPaso = () => {
    setPasosSecuencia((prev) => [
      ...prev,
      {
        orden: prev.length + 1,
        diasDesdeInicio: (prev[prev.length - 1]?.diasDesdeInicio ?? 0) + 3,
        canal: 'LLAMADA',
        accion: '',
        idplantilla: '',
      },
    ]);
  };

  const actualizarPaso = (index: number, campo: keyof PasoWizard, valor: string | number) => {
    setPasosSecuencia((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [campo]: valor } : p)),
    );
  };

  const lanzarCampana = async () => {
    setError(null);
    if (!idmandante || !nombreCampana.trim() || !archivo) {
      setError('Complete todos los campos del wizard.');
      return;
    }

    setLanzando(true);
    try {
      const campanaRes = await createCampana.mutateAsync({
        input: {
          idmandante,
          nombre: nombreCampana.trim(),
          fechaCorte: new Date(fechaCorte).toISOString(),
        },
      });
      const idcampana = campanaRes.createCampana.idcampana;
      setIdcampanaCreada(idcampana);

      await createSecuencia.mutateAsync({
        input: {
          idcampana,
          idmandante,
          nombre: nombreSecuencia.trim(),
          pasos: pasosSecuencia.map((p) => ({
            orden: p.orden,
            diasDesdeInicio: p.diasDesdeInicio,
            canal: p.canal,
            accion: p.accion || null,
            idplantilla: p.idplantilla || null,
          })),
        },
      });

      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('tipo', 'COMPLETO');
      formData.append('idmandante', String(idmandante));
      formData.append('idcampana', String(idcampana));
      formData.append('fechaCorte', new Date(fechaCorte).toISOString());
      formData.append('nombreHoja', nombreHoja);

      const res = await fetch('/api/cobranza/importar/async', {
        method: 'POST',
        body: formData,
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
      setIdjob(json.job.idjob);
      setPaso(4);
      notificationToast.success('Campaña lanzada correctamente');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al lanzar campaña';
      setError(message);
      notificationToast.error(message);
    } finally {
      setLanzando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 text-sm">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`rounded-full px-3 py-1 ${
              paso === n
                ? 'bg-primary text-white'
                : paso > n
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {n}. {['Campaña', 'Secuencia', 'Importación', 'Lanzamiento'][n - 1]}
          </span>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {paso === 1 && (
        <div className="space-y-4 rounded-lg border p-6 dark:border-dark-3">
          <h2 className="text-lg font-semibold">Paso 1 — Datos de campaña</h2>
          <MandanteSelect
            value={idmandante}
            onChange={(value) => setIdmandante(value)}
            label="Mandante"
            selectClassName="w-full max-w-md rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
          />
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre campaña</label>
            <input
              type="text"
              className="w-full max-w-md rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
              value={nombreCampana}
              onChange={(e) => setNombreCampana(e.target.value)}
              placeholder="Ej. Cartera marzo 2026"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Fecha de corte</label>
            <input
              type="date"
              className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
              value={fechaCorte}
              onChange={(e) => setFechaCorte(e.target.value)}
            />
          </div>
          <Button
            disabled={!idmandante || !nombreCampana.trim()}
            onClick={() => setPaso(2)}
          >
            Siguiente: Secuencia
          </Button>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-4 rounded-lg border p-6 dark:border-dark-3">
          <h2 className="text-lg font-semibold">Paso 2 — Secuencia de contacto</h2>
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre secuencia</label>
            <input
              type="text"
              className="w-full max-w-md rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
              value={nombreSecuencia}
              onChange={(e) => setNombreSecuencia(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            {pasosSecuencia.map((p, index) => (
              <div
                key={p.orden}
                className="grid gap-2 rounded border p-3 md:grid-cols-5 dark:border-dark-3"
              >
                <div>
                  <label className="text-xs text-gray-500">Día</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded border px-2 py-1 text-sm dark:border-dark-3 dark:bg-dark-2"
                    value={p.diasDesdeInicio}
                    onChange={(e) =>
                      actualizarPaso(index, 'diasDesdeInicio', Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Canal</label>
                  <select
                    className="w-full rounded border px-2 py-1 text-sm dark:border-dark-3 dark:bg-dark-2"
                    value={p.canal}
                    onChange={(e) => actualizarPaso(index, 'canal', e.target.value)}
                  >
                    {CANALES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">Acción</label>
                  <input
                    type="text"
                    className="w-full rounded border px-2 py-1 text-sm dark:border-dark-3 dark:bg-dark-2"
                    value={p.accion}
                    onChange={(e) => actualizarPaso(index, 'accion', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Plantilla</label>
                  <select
                    className="w-full rounded border px-2 py-1 text-sm dark:border-dark-3 dark:bg-dark-2"
                    value={p.idplantilla}
                    onChange={(e) =>
                      actualizarPaso(
                        index,
                        'idplantilla',
                        e.target.value ? Number(e.target.value) : '',
                      )
                    }
                  >
                    <option value="">—</option>
                    {plantillas.map((pl) => (
                      <option key={pl.idplantilla} value={pl.idplantilla}>
                        {pl.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={agregarPaso}>
            + Agregar paso
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPaso(1)}>
              Atrás
            </Button>
            <Button onClick={() => setPaso(3)}>Siguiente: Importación</Button>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-4 rounded-lg border p-6 dark:border-dark-3">
          <h2 className="text-lg font-semibold">Paso 3 — Archivo de cartera</h2>
          <p className="text-sm text-gray-500">
            La importación se ejecutará en segundo plano (async). El cron o el
            procesador local completará el job.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">Archivo Excel/CSV</label>
            <input
              type="file"
              accept={ACCEPT_IMPORTACION}
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Hoja cartera</label>
            <input
              type="text"
              className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
              value={nombreHoja}
              onChange={(e) => setNombreHoja(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPaso(2)}>
              Atrás
            </Button>
            <Button
              disabled={!archivo || lanzando}
              onClick={() => void lanzarCampana()}
            >
              {lanzando ? 'Lanzando...' : 'Lanzar campaña'}
            </Button>
          </div>
        </div>
      )}

      {paso === 4 && (
        <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950/20">
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">
            Campaña lanzada
          </h2>
          {idcampanaCreada && (
            <p className="text-sm">
              Campaña #{idcampanaCreada} creada con secuencia de{' '}
              {pasosSecuencia.length} pasos.
            </p>
          )}
          {idjob && <ImportacionJobMonitor idjob={idjob} />}
          <div className="flex gap-2">
            <Link href="/cobranza/campanas">
              <Button variant="outline">Ver campañas</Button>
            </Link>
            <Link href="/cobranza/importar">
              <Button>Monitor de importaciones</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
