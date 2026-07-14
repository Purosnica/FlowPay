import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import { obtenerIdsEquipo } from './equipo-scope';
import { ROL } from '@/lib/permissions/role-codes';
import {
  obtenerMetaGestionesSemanaUsuario,
  obtenerMetaRecuperacionMes,
} from './configuracion-cobranza-service';
import type {
  ReporteCumplimientoMetaItem,
  ReporteCumplimientoMetas,
} from '@/types/cobranza';

function inicioSemanaActual(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Cumplimiento de metas de recuperación/gestiones por cobrador.
 */
export async function obtenerReporteCumplimientoMetas(
  idmandante: number,
  idusuario: number,
  periodo: string,
): Promise<ReporteCumplimientoMetas> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const { inicio, fin, periodo: periodoNorm } = parsePeriodo(periodo);
  const semanaInicio = inicioSemanaActual();
  const equipoIds = await obtenerIdsEquipo(idusuario);

  const cobradorIds =
    equipoIds.length > 0
      ? await prisma.tbl_usuario.findMany({
          where: {
            idusuario: { in: equipoIds },
            activo: true,
            deletedAt: null,
            rol: { codigo: ROL.COBRADOR },
          },
          select: { idusuario: true, nombre: true },
        })
      : [];

  const metaRecuperacionMandante =
    await obtenerMetaRecuperacionMes(idmandante);

  const pagosMandante = await prisma.tbl_pago.aggregate({
    where: {
      idmandante,
      deletedAt: null,
      aplicado: true,
      fechaPago: { gte: inicio, lt: fin },
    },
    _sum: { monto: true },
  });
  const recuperadoMandante = roundMoney(
    decimalToNumber(pagosMandante._sum.monto),
  );

  const cobradores: ReporteCumplimientoMetaItem[] = [];

  for (const cob of cobradorIds) {
    const [metaMes, metaGestionesSemana, pagosMes, gestionesSemana] =
      await Promise.all([
        obtenerMetaRecuperacionMes(idmandante),
        obtenerMetaGestionesSemanaUsuario(cob.idusuario),
        prisma.tbl_pago.aggregate({
          where: {
            idmandante,
            deletedAt: null,
            aplicado: true,
            fechaPago: { gte: inicio, lt: fin },
            OR: [
              { idgestor: cob.idusuario },
              { prestamo: { idgestorAsignado: cob.idusuario } },
            ],
          },
          _sum: { monto: true },
        }),
        prisma.tbl_gestion.count({
          where: {
            idmandante,
            deletedAt: null,
            idgestor: cob.idusuario,
            fechaGestion: { gte: semanaInicio },
          },
        }),
      ]);

    const recuperadoMes = roundMoney(
      decimalToNumber(pagosMes._sum.monto),
    );
    const pctMetaRecuperacion =
      metaMes > 0 ? roundMoney((recuperadoMes / metaMes) * 100) : 0;
    const pctMetaGestiones =
      metaGestionesSemana > 0
        ? roundMoney((gestionesSemana / metaGestionesSemana) * 100)
        : 0;

    cobradores.push({
      idgestor: cob.idusuario,
      nombre: cob.nombre,
      metaRecuperacionMes: metaMes,
      recuperadoMes,
      pctMetaRecuperacion,
      metaGestionesSemana,
      gestionesSemana,
      pctMetaGestiones,
      metaRecuperacionCumplida: recuperadoMes >= metaMes && metaMes > 0,
      metaGestionesCumplida:
        gestionesSemana >= metaGestionesSemana &&
        metaGestionesSemana > 0,
    });
  }

  cobradores.sort(
    (a, b) => b.pctMetaRecuperacion - a.pctMetaRecuperacion,
  );

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoNorm,
    metaRecuperacionMandante,
    recuperadoMandante,
    pctMetaMandante:
      metaRecuperacionMandante > 0
        ? roundMoney(
            (recuperadoMandante / metaRecuperacionMandante) * 100,
          )
        : 0,
    cobradores,
  };
}
