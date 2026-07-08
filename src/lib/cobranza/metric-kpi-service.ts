import { prisma } from '@/lib/prisma';
import { filtroMandante, requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import type { KpiCobranzaCore } from '@/types/cobranza';

export type { KpiCobranzaCore };

export async function obtenerKpisCobranzaCore(
  idusuario: number,
  idmandante?: number,
): Promise<KpiCobranzaCore> {
  if (idmandante) {
    await requerirAccesoMandante(idusuario, idmandante);
  }

  const mandanteFilter = idmandante ?? (await filtroMandante(idusuario));
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    aggCartera,
    aggMora,
    aggRecuperacion,
    gestionesMes,
    promesasAbiertas,
    acuerdosVigentes,
    gestionesConContacto,
  ] = await Promise.all([
    prisma.tbl_prestamo.aggregate({
      where: {
        deletedAt: null,
        idmandante: mandanteFilter,
        saldoTotal: { gt: 0 },
      },
      _sum: { saldoTotal: true },
    }),
    prisma.tbl_prestamo.aggregate({
      where: {
        deletedAt: null,
        idmandante: mandanteFilter,
        saldoTotal: { gt: 0 },
        diasMora: { gt: 0 },
      },
      _sum: { saldoTotal: true },
    }),
    prisma.tbl_pago.aggregate({
      where: {
        deletedAt: null,
        aplicado: true,
        idmandante: mandanteFilter,
        fechaPago: { gte: inicioMes },
      },
      _sum: { monto: true },
    }),
    prisma.tbl_gestion.count({
      where: {
        deletedAt: null,
        idmandante: mandanteFilter,
        fechaGestion: { gte: inicioMes },
      },
    }),
    prisma.tbl_gestion.count({
      where: {
        deletedAt: null,
        idmandante: mandanteFilter,
        fechaPromesa: { gte: new Date() },
      },
    }),
    prisma.tbl_acuerdo.count({
      where: {
        deletedAt: null,
        idmandante: mandanteFilter,
        estado: 'VIGENTE',
      },
    }),
    prisma.tbl_gestion.count({
      where: {
        deletedAt: null,
        idmandante: mandanteFilter,
        fechaGestion: { gte: inicioMes },
        codresult: {
          tipoGestion: { in: ['EFECTIVA', 'EFECTIVA CON TERCERO'] },
        },
      },
    }),
  ]);

  const carteraTotal = roundMoney(decimalToNumber(aggCartera._sum.saldoTotal));
  const carteraEnMora = roundMoney(decimalToNumber(aggMora._sum.saldoTotal));
  const carteraEnMoraPct =
    carteraTotal > 0 ? roundMoney((carteraEnMora / carteraTotal) * 100) : 0;
  const tasaContactoPct =
    gestionesMes > 0
      ? roundMoney((gestionesConContacto / gestionesMes) * 100)
      : 0;

  return {
    carteraTotal,
    carteraEnMora,
    carteraEnMoraPct,
    recuperacionMes: roundMoney(decimalToNumber(aggRecuperacion._sum.monto)),
    gestionesMes,
    tasaContactoPct,
    promesasAbiertas,
    acuerdosVigentes,
  };
}
