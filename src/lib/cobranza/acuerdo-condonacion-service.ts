/**
 * Condonación de residual al cumplir acuerdos de pago.
 */

import type { Prisma } from '@prisma/client';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { sincronizarEstadoPorSaldo } from './estado-prestamo-service';
import { sincronizarMoraPrestamo } from './dias-mora-service';
import { registrarAuditoria } from './auditoria-service';
import {
  debeCondonarResidualTrasAcuerdo,
  montosCondonacionResidual,
} from '@/lib/logic/acuerdo-condonacion-logic';

type Tx = Prisma.TransactionClient;

const TOLERANCIA_SALDO = 0.009;

/**
 * Condonación del residual (saldo + moratorio) al marcar acuerdo CUMPLIDO.
 */
export async function condonarResidualTrasAcuerdoCumplido(
  tx: Tx,
  params: {
    idprestamo: number;
    idacuerdo: number;
    idusuario?: number | null;
  },
): Promise<void> {
  const prestamo = await tx.tbl_prestamo.findUnique({
    where: { idprestamo: params.idprestamo },
    select: {
      saldoTotal: true,
      interesMoratorio: true,
      deletedAt: true,
    },
  });

  if (!prestamo || prestamo.deletedAt) {
    return;
  }

  const saldo = decimalToNumber(prestamo.saldoTotal);
  const moratorio = decimalToNumber(prestamo.interesMoratorio);

  if (
    !debeCondonarResidualTrasAcuerdo(saldo) &&
    roundMoney(moratorio) <= TOLERANCIA_SALDO
  ) {
    return;
  }

  const montos = montosCondonacionResidual({
    saldoTotal: saldo,
    interesMoratorio: moratorio,
  });

  await tx.tbl_prestamo.update({
    where: { idprestamo: params.idprestamo },
    data: {
      saldoTotal: 0,
      interesMoratorio: 0,
      gestionCobranza: 0,
      cargosAdmin: 0,
      comisionCav: 0,
      comisionInsitu: 0,
      seguroSvsd: 0,
      mantenimientoValor: 0,
      interes: 0,
      montoPrestamo: 0,
    },
  });

  await registrarAuditoria(tx, {
    idusuario: params.idusuario,
    entidad: 'tbl_prestamo',
    entidadId: params.idprestamo,
    accion: 'CONDONACION_ACUERDO',
    detalle: JSON.stringify({
      idacuerdo: params.idacuerdo,
      saldoCondonado: montos.saldoCondonado,
      moratorioCondonado: montos.moratorioCondonado,
    }),
  });

  await sincronizarMoraPrestamo(tx, params.idprestamo, params.idusuario);
  await sincronizarEstadoPorSaldo(tx, params.idprestamo, params.idusuario);
}
