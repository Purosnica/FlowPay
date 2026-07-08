/**

 * Aplica pagos conciliados al saldo del préstamo y evalúa cumplimiento de acuerdos.

 */



import type { Prisma } from '@prisma/client';

import { decimalToNumber, roundMoney } from './decimal-utils';

import { sincronizarEstadoPorSaldo } from './estado-prestamo-service';
import { sincronizarMoraPrestamo } from './dias-mora-service';
import { evaluarPromesaPorPago } from './promesa-evaluacion-service';

import {

  evaluarCuotasAcuerdo,

  marcarCuotaPagadaPorMonto,

} from './acuerdo-cuota-service';



type Tx = Prisma.TransactionClient;



export async function aplicarPagoAlPrestamo(

  tx: Tx,

  params: {

    idprestamo: number;

    monto: number;

    fechaPago: Date;

    idacuerdo?: number | null;

    idpago?: number | null;

    idusuario?: number | null;

  },

): Promise<void> {

  const prestamo = await tx.tbl_prestamo.findUnique({

    where: { idprestamo: params.idprestamo },

  });

  if (!prestamo) {

    return;

  }



  const saldoActual = decimalToNumber(prestamo.saldoTotal);

  const nuevoSaldo = roundMoney(Math.max(0, saldoActual - params.monto));



  const updateData: Prisma.tbl_prestamoUpdateInput = {
    saldoTotal: nuevoSaldo,
    ultimaFechaPago: params.fechaPago,
  };

  await tx.tbl_prestamo.update({
    where: { idprestamo: params.idprestamo },
    data: updateData,
  });

  await sincronizarMoraPrestamo(tx, params.idprestamo, params.idusuario);
  await sincronizarEstadoPorSaldo(tx, params.idprestamo, params.idusuario);

  if (params.idpago) {
    await evaluarPromesaPorPago(tx, {
      idprestamo: params.idprestamo,
      montoPago: params.monto,
      fechaPago: params.fechaPago,
      idusuario: params.idusuario,
    });
  }

  const idacuerdo =

    params.idacuerdo ??

    (

      await tx.tbl_acuerdo.findFirst({

        where: {

          idprestamo: params.idprestamo,

          estado: 'VIGENTE',

          deletedAt: null,

        },

      })

    )?.idacuerdo;



  if (idacuerdo && params.idpago) {

    await marcarCuotaPagadaPorMonto(

      tx,

      idacuerdo,

      params.monto,

      params.idpago,

    );

  }



  if (idacuerdo) {

    await evaluarCumplimientoAcuerdo(tx, idacuerdo, params.idusuario);

    await evaluarCuotasAcuerdo(tx, idacuerdo, params.idusuario);

  }

}



export async function revertirPagoDelPrestamo(

  tx: Tx,

  params: {

    idprestamo: number;

    monto: number;

    idusuario?: number | null;

  },

): Promise<void> {

  const prestamo = await tx.tbl_prestamo.findUnique({

    where: { idprestamo: params.idprestamo },

  });

  if (!prestamo) {

    return;

  }



  const saldoActual = decimalToNumber(prestamo.saldoTotal);

  const nuevoSaldo = roundMoney(saldoActual + params.monto);



  await tx.tbl_prestamo.update({
    where: { idprestamo: params.idprestamo },
    data: { saldoTotal: nuevoSaldo },
  });

  await sincronizarMoraPrestamo(tx, params.idprestamo, params.idusuario);
  await sincronizarEstadoPorSaldo(tx, params.idprestamo, params.idusuario);

}



export async function evaluarCumplimientoAcuerdo(

  tx: Tx,

  idacuerdo: number,

  idusuario?: number | null,

): Promise<void> {

  const acuerdo = await tx.tbl_acuerdo.findUnique({

    where: { idacuerdo },

  });

  if (!acuerdo || acuerdo.estado !== 'VIGENTE') {

    return;

  }



  const pagosAplicados = await tx.tbl_pago.aggregate({

    where: {

      idacuerdo,

      aplicado: true,

      deletedAt: null,

    },

    _sum: { monto: true },

  });



  const totalPagado = decimalToNumber(pagosAplicados._sum.monto);

  const montoAcordado = decimalToNumber(acuerdo.montoAcordado);



  if (totalPagado >= montoAcordado) {

    await tx.tbl_acuerdo.update({

      where: { idacuerdo },

      data: { estado: 'CUMPLIDO' },

    });



    const otroVigente = await tx.tbl_acuerdo.findFirst({

      where: {

        idprestamo: acuerdo.idprestamo,

        estado: 'VIGENTE',

        deletedAt: null,

        idacuerdo: { not: idacuerdo },

      },

    });



    if (!otroVigente) {

      await tx.tbl_prestamo.update({

        where: { idprestamo: acuerdo.idprestamo },

        data: { reportableCentralRiesgo: true },

      });

    }



    await sincronizarEstadoPorSaldo(tx, acuerdo.idprestamo, idusuario);

  }

}


