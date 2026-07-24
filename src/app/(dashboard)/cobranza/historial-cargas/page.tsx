'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AsyncPanel } from '@/components/ui/async-panel';
import { PageHeader } from '@/components/ui/page-header';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_CARGAS_CARTERA,
  GET_RESUMEN_CARGA,
  REVERTIR_CARGA_CARTERA,
} from '@/lib/graphql/queries/cobranza.queries';

interface CargaCartera {
  idcarga: number;
  nombreArchivo: string;
  fechaCorte: string;
  estado: string;
  totalPrestamos: number;
  saldoTotal: number;
  tiempoMs: number | null;
  createdAt: string;
  usuario: string | null;
}

interface ResumenCarga {
  prestamosNuevos: string[];
  prestamosAusentes: string[];
  prestamosFechaCorteCambiada: string[];
  prestamosSaldoCambiado: Array<{
    noPrestamo: string;
    saldoAnterior: number;
    saldoNuevo: number;
  }>;
  prestamosConErrores: Array<{ fila: number; mensaje: string }>;
}

export default function HistorialCargasPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [idcargaDetalle, setIdcargaDetalle] = useState<number | null>(null);
  const [motivoReversion, setMotivoReversion] = useState('');
  const [mostrarRevertir, setMostrarRevertir] = useState(false);

  const {
    data: cargasData,
    refetch: refetchCargas,
    isLoading: cargasLoading,
    error: cargasError,
  } = useGraphQLQuery<{
    cargasCartera: { cargas: CargaCartera[]; total: number };
  }>(
    GET_CARGAS_CARTERA,
    { idmandante: idmandante as number, page: 1, pageSize: 50 },
    { enabled: typeof idmandante === 'number' },
  );

  const { data: resumenData } = useGraphQLQuery<{
    resumenCargaCartera: ResumenCarga | null;
  }>(
    GET_RESUMEN_CARGA,
    { idcarga: idcargaDetalle as number },
    { enabled: idcargaDetalle !== null },
  );

  const revertirMutation = useGraphQLMutation(REVERTIR_CARGA_CARTERA, {
    successMessage: 'Carga revertida correctamente',
    onSuccess: () => {
      refetchCargas();
      setMostrarRevertir(false);
      setMotivoReversion('');
    },
  });

  const cargas = cargasData?.cargasCartera.cargas ?? [];
  const resumen = resumenData?.resumenCargaCartera;

  const handleRevertir = () => {
    if (!idmandante || !motivoReversion.trim()) {
      return;
    }
    revertirMutation.mutate({
      idmandante,
      motivo: motivoReversion.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de cargas"
        description="Registro de importaciones de cartera y comparación entre cargas"
        actions={
          typeof idmandante === 'number' ? (
            <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
              <Button
                variant="outline"
                onClick={() => setMostrarRevertir(true)}
              >
                Revertir última carga
              </Button>
            </PermissionGate>
          ) : undefined
        }
      />

      <div className="max-w-md">
        <MandanteSelect
          value={idmandante}
          onChange={(value) => {
            setIdmandante(value);
            setIdcargaDetalle(null);
          }}
          label="Mandante"
        />
      </div>

      {typeof idmandante === 'number' && (
        <AsyncPanel
          isLoading={cargasLoading}
          error={cargasError}
          isEmpty={cargas.length === 0}
          loadingMessage="Cargando historial de cargas..."
          emptyMessage="No hay cargas registradas para este mandante."
        >
          <div className="overflow-x-auto rounded-lg border border-stroke dark:border-dark-3">
            <table className="w-full text-sm">
              <thead className="bg-gray-2 dark:bg-dark-2">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Archivo</th>
                  <th className="px-4 py-2 text-left">Corte</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-right">Préstamos</th>
                  <th className="px-4 py-2 text-right">Saldo</th>
                  <th className="px-4 py-2 text-left">Usuario</th>
                  <th className="px-4 py-2 text-right">Tiempo</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {cargas.map((c) => (
                  <tr
                    key={c.idcarga}
                    className="border-t border-stroke dark:border-dark-3"
                  >
                    <td className="px-4 py-2">
                      {new Date(c.createdAt).toLocaleString('es-NI')}
                    </td>
                    <td className="px-4 py-2">{c.nombreArchivo}</td>
                    <td className="px-4 py-2">
                      {c.fechaCorte.slice(0, 10)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          c.estado === 'VIGENTE'
                            ? 'text-green-600'
                            : c.estado === 'REVERTIDA'
                              ? 'text-red-600'
                              : 'text-gray-6'
                        }
                      >
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{c.totalPrestamos}</td>
                    <td className="px-4 py-2 text-right">
                      C$ {c.saldoTotal.toLocaleString('es-NI')}
                    </td>
                    <td className="px-4 py-2">{c.usuario ?? '-'}</td>
                    <td className="px-4 py-2 text-right">
                      {c.tiempoMs ? `${(c.tiempoMs / 1000).toFixed(1)}s` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setIdcargaDetalle(c.idcarga)}
                      >
                        Ver diff
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncPanel>
      )}

      {resumen && idcargaDetalle && (
        <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
          <h3 className="font-medium">Resumen de diferencias — carga #{idcargaDetalle}</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-green-600">
                Préstamos nuevos ({resumen.prestamosNuevos.length})
              </p>
              <ul className="mt-1 max-h-32 overflow-auto text-xs">
                {resumen.prestamosNuevos.slice(0, 20).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-600">
                Saldo cambiado ({resumen.prestamosSaldoCambiado.length})
              </p>
              <ul className="mt-1 max-h-32 overflow-auto text-xs">
                {resumen.prestamosSaldoCambiado.slice(0, 20).map((p) => (
                  <li key={p.noPrestamo}>
                    {p.noPrestamo}: {p.saldoAnterior} → {p.saldoNuevo}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-6">
                Ausentes en carga ({resumen.prestamosAusentes.length})
              </p>
              <ul className="mt-1 max-h-32 overflow-auto text-xs">
                {resumen.prestamosAusentes.slice(0, 20).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-red-600">
                Errores ({resumen.prestamosConErrores.length})
              </p>
              <ul className="mt-1 max-h-32 overflow-auto text-xs">
                {resumen.prestamosConErrores.map((e) => (
                  <li key={e.fila}>
                    Fila {e.fila}: {e.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={mostrarRevertir}
        onClose={() => setMostrarRevertir(false)}
        title="Revertir última carga"
        description="Se restaurará la cartera vigente anterior. Esta acción queda auditada."
        confirmLabel={
          revertirMutation.isPending ? 'Revirtiendo...' : 'Confirmar reversión'
        }
        variant="danger"
        isLoading={revertirMutation.isPending}
        disabled={!motivoReversion.trim()}
        onConfirm={handleRevertir}
      >
        <label className="mb-1 block text-sm font-medium" htmlFor="motivo-rev">
          Motivo de la reversión *
        </label>
        <textarea
          id="motivo-rev"
          value={motivoReversion}
          onChange={(e) => setMotivoReversion(e.target.value)}
          placeholder="Motivo de la reversión *"
          rows={3}
          required
          aria-required
          className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      </ConfirmDialog>
    </div>
  );
}
