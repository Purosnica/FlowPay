import { prisma } from '@/lib/prisma';
import { filtroMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { obtenerIdsEquipo } from './equipo-scope';
import { contarPromesasVencidas } from './promesas-vencidas-service';
import { resolverIdGestorPago } from './pago-atributacion';
import {
  filtroFechaEnPeriodo,
  rangoPeriodoActual,
} from './periodo-utils';
import { inicioDiaEnZona } from '@/lib/utils/timezone';
import type { DashboardSupervisorResumen } from '@/types/cobranza';

export type { DashboardSupervisorResumen };

export async function obtenerDashboardSupervisor(
  idusuario: number,
): Promise<DashboardSupervisorResumen> {
  const equipoIds = await obtenerIdsEquipo(idusuario);
  const mandanteFilter = await filtroMandante(idusuario);

  const inicioHoy = inicioDiaEnZona();
  const inicioAyer = inicioDiaEnZona(
    new Date(inicioHoy.getTime() - 12 * 60 * 60 * 1000),
  );
  const rangoMes = filtroFechaEnPeriodo(rangoPeriodoActual());
  const hace7d = new Date(inicioHoy);
  hace7d.setUTCDate(hace7d.getUTCDate() - 7);

  const [
    gestionesHoy,
    gestionesAyer,
    aggRecuperado,
    promesasVencidasEquipo,
    casosSinGestion7d,
    gestionesMes,
    pagosMes,
  ] = await Promise.all([
    prisma.tbl_gestion.count({
      where: {
        deletedAt: null,
        idgestor: { in: equipoIds },
        idmandante: mandanteFilter,
        fechaGestion: { gte: inicioHoy },
      },
    }),
    prisma.tbl_gestion.count({
      where: {
        deletedAt: null,
        idgestor: { in: equipoIds },
        idmandante: mandanteFilter,
        fechaGestion: { gte: inicioAyer, lt: inicioHoy },
      },
    }),
    prisma.tbl_pago.aggregate({
      where: {
        deletedAt: null,
        aplicado: true,
        idmandante: mandanteFilter,
        fechaPago: rangoMes,
        OR: [
          { gestion: { idgestor: { in: equipoIds } } },
          { prestamo: { idgestorAsignado: { in: equipoIds } } },
        ],
      },
      _sum: { monto: true },
    }),
    contarPromesasVencidas(idusuario, false),
    prisma.tbl_prestamo.count({
      where: {
        deletedAt: null,
        idgestorAsignado: { in: equipoIds },
        idmandante: mandanteFilter,
        diasMora: { gt: 0 },
        estado: { notIn: ['Cancelado', 'Finalizado'] },
        gestiones: {
          none: {
            deletedAt: null,
            fechaGestion: { gte: hace7d },
          },
        },
      },
    }),
    prisma.tbl_gestion.groupBy({
      by: ['idgestor'],
      where: {
        deletedAt: null,
        idgestor: { in: equipoIds },
        idmandante: mandanteFilter,
        fechaGestion: rangoMes,
      },
      _count: { idgestion: true },
    }),
    prisma.tbl_pago.findMany({
      where: {
        deletedAt: null,
        aplicado: true,
        idmandante: mandanteFilter,
        fechaPago: rangoMes,
      },
      select: {
        monto: true,
        gestion: { select: { idgestor: true } },
        prestamo: { select: { idgestorAsignado: true } },
      },
    }),
  ]);

  const recuperadoPorGestor = new Map<number, number>();

  for (const pago of pagosMes) {
    const idgestor = resolverIdGestorPago(pago);
    if (!idgestor || !equipoIds.includes(idgestor)) {
      continue;
    }
    recuperadoPorGestor.set(
      idgestor,
      (recuperadoPorGestor.get(idgestor) ?? 0) +
        decimalToNumber(pago.monto),
    );
  }

  const gestionesEfectivasRows = await prisma.tbl_gestion.findMany({
    where: {
      deletedAt: null,
      idgestor: { in: equipoIds },
      idmandante: mandanteFilter,
      fechaGestion: rangoMes,
      codresult: {
        grupo: { in: ['LOCALIZADO', 'CANCELADA'] },
      },
    },
    select: { idgestor: true },
  });

  const gestionesEfectivas = new Map<number, number>();
  for (const row of gestionesEfectivasRows) {
    gestionesEfectivas.set(
      row.idgestor,
      (gestionesEfectivas.get(row.idgestor) ?? 0) + 1,
    );
  }

  const usuarios = await prisma.tbl_usuario.findMany({
    where: { idusuario: { in: equipoIds } },
    select: { idusuario: true, nombre: true },
  });

  const ranking = usuarios
    .map((u) => {
      const gestiones =
        gestionesMes.find((g) => g.idgestor === u.idusuario)?._count
          .idgestion ?? 0;
      const efectivas = gestionesEfectivas.get(u.idusuario) ?? 0;
      const efectividadPct =
        gestiones > 0 ? roundMoney((efectivas / gestiones) * 100) : 0;
      return {
        idgestor: u.idusuario,
        nombre: u.nombre,
        gestiones,
        montoRecuperado: roundMoney(recuperadoPorGestor.get(u.idusuario) ?? 0),
        efectividadPct,
      };
    })
    .sort((a, b) => b.montoRecuperado - a.montoRecuperado);

  return {
    totalCobradores: equipoIds.length,
    gestionesHoy,
    gestionesAyer,
    montoRecuperadoMes: decimalToNumber(aggRecuperado._sum.monto),
    promesasVencidasEquipo,
    casosSinGestion7d,
    tasaContactoEquipoPct: (() => {
      const totalGestiones = gestionesMes.reduce(
        (s, g) => s + g._count.idgestion,
        0,
      );
      const totalEfectivas = [...gestionesEfectivas.values()].reduce(
        (s, n) => s + n,
        0,
      );
      return totalGestiones > 0
        ? roundMoney((totalEfectivas / totalGestiones) * 100)
        : 0;
    })(),
    ranking,
  };
}
