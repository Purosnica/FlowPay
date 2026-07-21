'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { SIMULAR_ACUERDO } from '@/lib/graphql/queries/cobranza.queries';
import { type SimulacionAcuerdo, formatearMoneda } from '@/types/cobranza';

interface AcuerdoSimulatorProps {
  idprestamo: number;
  moneda?: string;
  descuentoMaximo?: number;
  interesMoratorio?: number;
  gestionCobranza?: number;
  onConfirm: (params: {
    porcentajeDesc: number;
    numeroCuotas: number;
    fechaInicio: string;
    dispensarInteresMoratorio: boolean;
    dispensarGestionCobranza: boolean;
  }) => void;
  isLoading?: boolean;
}

export function AcuerdoSimulator({
  idprestamo,
  moneda = 'NIO',
  descuentoMaximo = 100,
  interesMoratorio = 0,
  gestionCobranza = 0,
  onConfirm,
  isLoading,
}: AcuerdoSimulatorProps) {
  const [porcentajeDesc, setPorcentajeDesc] = useState(10);
  const [numeroCuotas, setNumeroCuotas] = useState(1);
  const [dispensarInteresMoratorio, setDispensarInteresMoratorio] =
    useState(false);
  const [dispensarGestionCobranza, setDispensarGestionCobranza] =
    useState(false);
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const { data, refetch, isFetching, error } = useGraphQLQuery<{
    simularAcuerdo: SimulacionAcuerdo;
  }>(
    SIMULAR_ACUERDO,
    {
      input: {
        idprestamo,
        porcentajeDesc,
        numeroCuotas,
        dispensarInteresMoratorio,
        dispensarGestionCobranza,
      },
    },
    { enabled: false },
  );

  useEffect(() => {
    if (idprestamo > 0) {
      refetch();
    }
  }, [
    idprestamo,
    porcentajeDesc,
    numeroCuotas,
    dispensarInteresMoratorio,
    dispensarGestionCobranza,
    refetch,
  ]);

  const sim = data?.simularAcuerdo;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-6">
        Base negociable = saldo + interés moratorio + gestión de cobranza (los
        montos marcados como dispensados se excluyen del acuerdo).
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            % Descuento
          </label>
          <input
            type="number"
            min={0}
            max={descuentoMaximo}
            step={0.5}
            value={porcentajeDesc}
            onChange={(e) => setPorcentajeDesc(Number(e.target.value))}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-6">
            Máximo autorizado: {descuentoMaximo}%
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Cuotas</label>
          <input
            type="number"
            min={1}
            value={numeroCuotas}
            onChange={(e) => setNumeroCuotas(Number(e.target.value))}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Fecha inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-stroke p-4 dark:border-dark-3">
        <p className="text-sm font-medium text-dark dark:text-white">
          Dispensa en el acuerdo
        </p>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={dispensarInteresMoratorio}
            onChange={(e) => setDispensarInteresMoratorio(e.target.checked)}
            className="mt-0.5 rounded border-stroke"
            disabled={interesMoratorio <= 0}
          />
          <span>
            Excluir interés moratorio
            <span className="block text-xs text-gray-6">
              Monto actual: {formatearMoneda(interesMoratorio, moneda)}
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={dispensarGestionCobranza}
            onChange={(e) => setDispensarGestionCobranza(e.target.checked)}
            className="mt-0.5 rounded border-stroke"
            disabled={gestionCobranza <= 0}
          />
          <span>
            Excluir gestión de cobranza
            <span className="block text-xs text-gray-6">
              Monto actual: {formatearMoneda(gestionCobranza, moneda)}
            </span>
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20">
          {error.message}
        </div>
      )}

      {isFetching && (
        <p className="text-sm text-gray-6">Calculando simulación...</p>
      )}

      {sim && (
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-2 p-4 text-sm dark:bg-dark-2 md:grid-cols-3">
          <div>
            <span className="text-gray-6">Base negociable</span>
            <p className="font-medium">
              {formatearMoneda(sim.baseNegociable, moneda)}
            </p>
          </div>
          <div>
            <span className="text-gray-6">Descuento</span>
            <p className="font-medium">
              {formatearMoneda(sim.montoDescuento, moneda)}
            </p>
          </div>
          <div>
            <span className="text-gray-6">Monto acordado</span>
            <p className="font-medium text-primary">
              {formatearMoneda(sim.montoAcordado, moneda)}
            </p>
          </div>
          <div>
            <span className="text-gray-6">Cuota</span>
            <p className="font-medium">
              {formatearMoneda(sim.montoCuota, moneda)}
            </p>
          </div>
          <div>
            <span className="text-gray-6">Pago mínimo</span>
            <p className="font-medium">
              {formatearMoneda(sim.pagoMinimo, moneda)}
            </p>
          </div>
          {sim.interesMoratorioExcluido > 0 && (
            <div>
              <span className="text-gray-6">Moratorio dispensado</span>
              <p className="font-medium text-green-600">
                −{formatearMoneda(sim.interesMoratorioExcluido, moneda)}
              </p>
            </div>
          )}
          {sim.gestionCobranzaExcluida > 0 && (
            <div>
              <span className="text-gray-6">Gestión dispensada</span>
              <p className="font-medium text-green-600">
                −{formatearMoneda(sim.gestionCobranzaExcluida, moneda)}
              </p>
            </div>
          )}
        </div>
      )}

      <PermissionGate permiso={PERMISO.ACUERDO_WRITE}>
        <Button
          onClick={() =>
            onConfirm({
              porcentajeDesc,
              numeroCuotas,
              fechaInicio: new Date(fechaInicio).toISOString(),
              dispensarInteresMoratorio,
              dispensarGestionCobranza,
            })
          }
          disabled={isLoading || !sim}
        >
          {isLoading ? 'Creando acuerdo...' : 'Confirmar acuerdo'}
        </Button>
      </PermissionGate>
    </div>
  );
}
