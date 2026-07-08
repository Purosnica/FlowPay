import { prisma } from '@/lib/prisma';
import { ROL } from '@/lib/permissions/role-codes';
import type { DashboardGerenteResumen } from '@/types/cobranza';
import { filtroMandante } from './mandante-scope';
import { obtenerIdsEquipo, esGerente } from './equipo-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { obtenerDashboardSupervisor } from './dashboard-supervisor-service';
import { contarReclamosFueraSla } from './reclamo-sla-service';

export type { DashboardGerenteResumen };

export async function obtenerDashboardGerente(
  idusuario: number,
): Promise<DashboardGerenteResumen> {
  const esGer = await esGerente(idusuario);
  if (!esGer) {
    throw new Error('Solo gerentes pueden acceder al dashboard gerencial.');
  }

  const mandanteFilter = await filtroMandante(idusuario);
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const inicioMes = new Date(inicioHoy.getFullYear(), inicioHoy.getMonth(), 1);

  const supervisores = await prisma.tbl_usuario.findMany({
    where: {
      activo: true,
      deletedAt: null,
      idsupervisor: idusuario,
      rol: { codigo: ROL.SUPERVISOR },
    },
    select: { idusuario: true, nombre: true },
  });

  const equipoIds = await obtenerIdsEquipo(idusuario);

  const [gestionesHoy, aggRecuperado, aggCartera, moraAgg, reclamosFueraSla] =
    await Promise.all([
      prisma.tbl_gestion.count({
        where: {
          deletedAt: null,
          idgestor: { in: equipoIds },
          idmandante: mandanteFilter,
          fechaGestion: { gte: inicioHoy },
        },
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
      prisma.tbl_prestamo.aggregate({
        where: {
          deletedAt: null,
          idmandante: mandanteFilter,
          saldoTotal: { gt: 0 },
        },
        _sum: { saldoTotal: true },
        _count: true,
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
      contarReclamosFueraSla(
        typeof mandanteFilter === 'number' ? mandanteFilter : undefined,
      ),
    ]);

  const carteraTotal = roundMoney(decimalToNumber(aggCartera._sum.saldoTotal));
  const saldoMora = roundMoney(decimalToNumber(moraAgg._sum.saldoTotal));
  const carteraEnMoraPct =
    carteraTotal > 0 ? roundMoney((saldoMora / carteraTotal) * 100) : 0;

  const equipos = await Promise.all(
    supervisores.map(async (sup) => {
      const idsEquipoSup = await obtenerIdsEquipo(sup.idusuario);
      const cobradores = idsEquipoSup.length - 1;
      const [gestHoy, recMes] = await Promise.all([
        prisma.tbl_gestion.count({
          where: {
            deletedAt: null,
            idgestor: { in: idsEquipoSup },
            idmandante: mandanteFilter,
            fechaGestion: { gte: inicioHoy },
          },
        }),
        prisma.tbl_pago.aggregate({
          where: {
            deletedAt: null,
            aplicado: true,
            idmandante: mandanteFilter,
            fechaPago: { gte: inicioMes },
            OR: [
              { idgestor: { in: idsEquipoSup } },
              { prestamo: { idgestorAsignado: { in: idsEquipoSup } } },
            ],
          },
          _sum: { monto: true },
        }),
      ]);
      return {
        idsupervisor: sup.idusuario,
        nombreSupervisor: sup.nombre,
        cobradores: Math.max(0, cobradores),
        gestionesHoy: gestHoy,
        montoRecuperadoMes: roundMoney(decimalToNumber(recMes._sum.monto)),
      };
    }),
  );

  const resumenSupervisor = await obtenerDashboardSupervisor(idusuario);

  return {
    totalSupervisores: supervisores.length,
    totalCobradores: Math.max(0, equipoIds.length - supervisores.length - 1),
    gestionesHoy,
    montoRecuperadoMes: roundMoney(decimalToNumber(aggRecuperado._sum.monto)),
    reclamosFueraSla,
    carteraTotal,
    carteraEnMoraPct,
    equipos,
    resumenSupervisor,
  };
}
