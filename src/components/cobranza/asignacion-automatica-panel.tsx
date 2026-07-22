'use client';

import { useState, useId } from 'react';
import { Button } from '@/components/ui/button';
import { AsyncPanel } from '@/components/ui/async-panel';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { useTramosMoraMandante } from '@/hooks/use-tramos-mora-mandante';
import {
  GET_USUARIOS_MANDANTE,
  SIMULAR_ASIGNACION_CARTERA,
  EJECUTAR_ASIGNACION_CARTERA,
} from '@/lib/graphql/queries/cobranza.queries';
import type { UsuarioBasico } from '@/types/cobranza';
import {
  decodeTramoMoraKey,
  encodeTramoMoraKey,
} from '@/lib/cobranza/tramos-mora';

type MetodoAsignacion =
  | 'POR_MORA'
  | 'ALEATORIO'
  | 'POR_CANTIDAD'
  | 'POR_MONTO';

interface SimulacionGestor {
  idgestor: number;
  nombre: string;
  cantidadPrestamos: number;
  saldoTotal: number;
  cantidadClientes: number;
}

interface SimulacionResultado {
  totalPrestamos: number;
  totalSaldo: number;
  gestores: SimulacionGestor[];
}

export function AsignacionAutomaticaPanel() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [metodo, setMetodo] = useState<MetodoAsignacion>('POR_CANTIDAD');
  const [tramoKey, setTramoKey] = useState('');
  const [sinAsignar, setSinAsignar] = useState(true);
  const [gestoresSeleccionados, setGestoresSeleccionados] = useState<
    Set<number>
  >(new Set());
  const [motivo, setMotivo] = useState('');
  const [simulacion, setSimulacion] = useState<SimulacionResultado | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const metodoId = useId();
  const tramoId = useId();
  const motivoId = useId();

  const mandanteId =
    typeof idmandante === 'number' ? idmandante : undefined;
  const { tramos, isLoading: tramosLoading } =
    useTramosMoraMandante(mandanteId);

  const {
    data: usuariosData,
    isLoading: gestoresLoading,
    error: gestoresError,
  } = useGraphQLQuery<{
    usuariosMandante: UsuarioBasico[];
  }>(
    GET_USUARIOS_MANDANTE,
    { idmandante: idmandante as number },
    { enabled: typeof idmandante === 'number' },
  );

  const simularMutation = useGraphQLMutation(SIMULAR_ASIGNACION_CARTERA, {
    onSuccess: (data: unknown) => {
      const result = data as {
        simularAsignacionCartera: SimulacionResultado;
      };
      setSimulacion(result.simularAsignacionCartera);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const ejecutarMutation = useGraphQLMutation(EJECUTAR_ASIGNACION_CARTERA, {
    requestOptions: { timeout: 180_000 },
    onSuccess: () => {
      setSimulacion(null);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const gestores = usuariosData?.usuariosMandante ?? [];

  const toggleGestor = (id: number) => {
    setGestoresSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const construirFiltros = () => {
    const tramo = tramoKey ? decodeTramoMoraKey(tramoKey) : null;
    return {
      idmandante: idmandante as number,
      sinAsignar: sinAsignar || undefined,
      tramoMoraMin: tramo?.tramoMoraMin,
      tramoMoraMax: tramo?.tramoMoraMax,
    };
  };

  const handleSimular = () => {
    if (!idmandante || gestoresSeleccionados.size === 0) {
      setError('Seleccione mandante y al menos un cobrador.');
      return;
    }
    simularMutation.mutate({
      filtros: construirFiltros(),
      idgestores: [...gestoresSeleccionados],
      metodo,
    });
  };

  const handleEjecutar = () => {
    if (!idmandante || gestoresSeleccionados.size === 0) {
      return;
    }
    ejecutarMutation.mutate({
      filtros: construirFiltros(),
      idgestores: [...gestoresSeleccionados],
      metodo,
      motivo: motivo.trim() || undefined,
    });
  };

  const handleEjecutarHandsOff = () => {
    if (!idmandante || gestores.length === 0) {
      setError('Seleccione mandante con cobradores disponibles.');
      return;
    }
    const todos = gestores.map((g) => g.idusuario);
    setGestoresSeleccionados(new Set(todos));
    setSinAsignar(true);
    setSimulacion(null);
    setError(null);
    ejecutarMutation.mutate({
      filtros: {
        idmandante: idmandante as number,
        sinAsignar: true,
      },
      idgestores: todos,
      metodo,
      motivo:
        motivo.trim() ||
        'Asignación automática hands-off (sin gestor)',
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        La asignación sin intervención corre post-import y en el cron diario
        si están habilitados en configuración. Use el botón hands-off para
        repartir ahora todos los préstamos sin gestor entre todos los
        cobradores del mandante.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MandanteSelect
          value={idmandante}
          onChange={(value) => {
            setIdmandante(value);
            setTramoKey('');
            setGestoresSeleccionados(new Set());
            setSimulacion(null);
          }}
          label="Mandante"
          required
        />

        <div>
          <label htmlFor={metodoId} className="mb-1 block text-sm font-medium">
            Método *
          </label>
          <select
            id={metodoId}
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as MetodoAsignacion)}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          >
            <option value="POR_CANTIDAD">Por cantidad de préstamos</option>
            <option value="POR_MONTO">Por monto total</option>
            <option value="POR_MORA">Por rango de mora</option>
            <option value="ALEATORIO">Aleatorio</option>
          </select>
        </div>

        <div>
          <label htmlFor={tramoId} className="mb-1 block text-sm font-medium">
            Tramo de mora (opcional)
          </label>
          <select
            id={tramoId}
            value={tramoKey}
            disabled={!mandanteId || tramosLoading}
            onChange={(e) => setTramoKey(e.target.value)}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          >
            <option value="">
              {!mandanteId
                ? 'Seleccione mandante'
                : tramosLoading
                  ? 'Cargando tramos...'
                  : tramos.length === 0
                    ? 'Sin tramos configurados'
                    : 'Todos'}
            </option>
            {tramos.map((t) => (
              <option
                key={encodeTramoMoraKey(t.tramoMoraMin, t.tramoMoraMax)}
                value={encodeTramoMoraKey(t.tramoMoraMin, t.tramoMoraMax)}
              >
                {t.tramo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sinAsignar}
          onChange={(e) => setSinAsignar(e.target.checked)}
        />
        Solo préstamos sin asignar
      </label>

      {typeof idmandante === 'number' && (
        <AsyncPanel
          isLoading={gestoresLoading}
          error={gestoresError}
          isEmpty={gestores.length === 0}
          loadingMessage="Cargando cobradores..."
          emptyMessage="No hay cobradores asignados a este mandante."
        >
          <div>
            <p className="mb-2 text-sm font-medium">Cobradores *</p>
            <div className="flex flex-wrap gap-2">
              {gestores.map((g) => (
                <label
                  key={g.idusuario}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3"
                >
                  <input
                    type="checkbox"
                    checked={gestoresSeleccionados.has(g.idusuario)}
                    onChange={() => toggleGestor(g.idusuario)}
                  />
                  {g.nombre}
                </label>
              ))}
            </div>
          </div>
        </AsyncPanel>
      )}

      <div>
        <label htmlFor={motivoId} className="mb-1 block text-sm font-medium">
          Motivo (opcional)
        </label>
        <input
          id={motivoId}
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo de la asignación"
          className="w-full max-w-md rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleEjecutarHandsOff}
          disabled={
            ejecutarMutation.isPending ||
            typeof idmandante !== 'number' ||
            gestores.length === 0
          }
        >
          {ejecutarMutation.isPending
            ? 'Asignando...'
            : 'Asignar ahora (sin simular)'}
        </Button>
        <Button
          variant="outline"
          onClick={handleSimular}
          disabled={simularMutation.isPending}
        >
          {simularMutation.isPending ? 'Simulando...' : 'Simular primero'}
        </Button>
      </div>

      {simulacion && (
        <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
          <h3 className="font-medium">
            Simulación — {simulacion.totalPrestamos} préstamos · C${' '}
            {simulacion.totalSaldo.toLocaleString('es-NI')}
          </h3>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3">
                <th className="py-2 text-left">Cobrador</th>
                <th className="py-2 text-right">Préstamos</th>
                <th className="py-2 text-right">Saldo</th>
                <th className="py-2 text-right">Clientes</th>
              </tr>
            </thead>
            <tbody>
              {simulacion.gestores.map((g) => (
                <tr key={g.idgestor} className="border-b border-stroke/50">
                  <td className="py-2">{g.nombre}</td>
                  <td className="py-2 text-right">{g.cantidadPrestamos}</td>
                  <td className="py-2 text-right">
                    C$ {g.saldoTotal.toLocaleString('es-NI')}
                  </td>
                  <td className="py-2 text-right">{g.cantidadClientes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleEjecutar}
              disabled={ejecutarMutation.isPending}
            >
              {ejecutarMutation.isPending
                ? 'Asignando...'
                : 'Confirmar asignación'}
            </Button>
            <Button variant="outline" onClick={() => setSimulacion(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
