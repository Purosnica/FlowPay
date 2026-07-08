import { prisma } from '@/lib/prisma';
import { filtroMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { obtenerIdsEquipo } from './equipo-scope';
import {
  obtenerMetaGestionesSemanaUsuario,
  obtenerMetaRecuperacionSemanaUsuario,
} from './configuracion-cobranza-service';
import type { RankingCobrador } from '@/types/cobranza';

export type { RankingCobrador };

const INSIGNIAS = {
  PRIMERA_RECUPERACION: 'Primera recuperación',
  META_SEMANAL: 'Meta semanal',
  CERO_RECLAMOS: 'Mes sin reclamos',
  PROMESAS_ORO: 'Promesas cumplidas',
  TOP_RECUPERACION: 'Top recuperación',
} as const;

function calcularNivel(xp: number): string {
  if (xp >= 5000) {
    return 'Elite';
  }
  if (xp >= 2500) {
    return 'Oro';
  }
  if (xp >= 1000) {
    return 'Plata';
  }
  if (xp >= 300) {
    return 'Bronce';
  }
  return 'Inicial';
}

function calcularXp(params: {
  gestiones: number;
  montoRecuperado: number;
  promesasCumplidas: number;
}): number {
  return Math.round(
    params.gestiones * 2 +
      params.montoRecuperado / 100 +
      params.promesasCumplidas * 25,
  );
}

export async function obtenerRankingCobradores(
  idusuario: number,
  periodoDias = 30,
): Promise<RankingCobrador[]> {
  const mandanteFilter = await filtroMandante(idusuario);
  const equipoIds = await obtenerIdsEquipo(idusuario);
  const desde = new Date();
  desde.setDate(desde.getDate() - periodoDias);
  desde.setHours(0, 0, 0, 0);

  const gestionesPorGestor = await prisma.tbl_gestion.groupBy({
    by: ['idgestor'],
    where: {
      deletedAt: null,
      idmandante: mandanteFilter,
      idgestor: { in: equipoIds },
      fechaGestion: { gte: desde },
    },
    _count: { idgestion: true },
  });

  const pagos = await prisma.tbl_pago.findMany({
    where: {
      deletedAt: null,
      aplicado: true,
      idmandante: mandanteFilter,
      fechaPago: { gte: desde },
      OR: [
        { idgestor: { in: equipoIds } },
        { prestamo: { idgestorAsignado: { in: equipoIds } } },
      ],
    },
    select: {
      monto: true,
      idgestor: true,
      prestamo: { select: { idgestorAsignado: true } },
    },
  });

  const recuperadoPorGestor = new Map<number, number>();
  for (const pago of pagos) {
    const idgestor =
      pago.idgestor ?? pago.prestamo.idgestorAsignado ?? null;
    if (!idgestor) {
      continue;
    }
    recuperadoPorGestor.set(
      idgestor,
      (recuperadoPorGestor.get(idgestor) ?? 0) +
        decimalToNumber(pago.monto),
    );
  }

  const promesasCumplidas = await prisma.tbl_gestion.groupBy({
    by: ['idgestor'],
    where: {
      deletedAt: null,
      idmandante: mandanteFilter,
      idgestor: { in: equipoIds },
      montoPromesa: { not: null },
      fechaPromesa: { gte: desde },
      codresult: { codigo: { in: ['CDP', 'PRP'] } },
    },
    _count: { idgestion: true },
  });

  const gestorIds = new Set([
    ...gestionesPorGestor.map((g) => g.idgestor),
    ...recuperadoPorGestor.keys(),
  ]);

  const usuarios = await prisma.tbl_usuario.findMany({
    where: { idusuario: { in: [...gestorIds] } },
    select: { idusuario: true, nombre: true },
  });

  const nombrePorId = new Map(usuarios.map((u) => [u.idusuario, u.nombre]));

  const ranking = [...gestorIds].map((idgestor) => {
    const gestiones =
      gestionesPorGestor.find((g) => g.idgestor === idgestor)?._count
        .idgestion ?? 0;
    const montoRecuperado = roundMoney(
      recuperadoPorGestor.get(idgestor) ?? 0,
    );
    const promesas =
      promesasCumplidas.find((g) => g.idgestor === idgestor)?._count
        .idgestion ?? 0;
    const xp = calcularXp({
      gestiones,
      montoRecuperado,
      promesasCumplidas: promesas,
    });

    const insignias: string[] = [];
    if (montoRecuperado > 0) {
      insignias.push(INSIGNIAS.PRIMERA_RECUPERACION);
    }
    if (promesas >= 5) {
      insignias.push(INSIGNIAS.PROMESAS_ORO);
    }

    return {
      idgestor,
      nombre: nombrePorId.get(idgestor) ?? `Usuario ${idgestor}`,
      gestiones,
      montoRecuperado,
      promesasCumplidas: promesas,
      posicion: 0,
      nivel: calcularNivel(xp),
      xp,
      insignias,
    };
  });

  ranking.sort((a, b) => b.montoRecuperado - a.montoRecuperado);

  const top = ranking[0];
  if (top && top.montoRecuperado > 0) {
    top.insignias.push(INSIGNIAS.TOP_RECUPERACION);
  }

  return ranking.map((r, i) => ({ ...r, posicion: i + 1 }));
}

export async function obtenerGamificacionUsuario(
  idusuario: number,
): Promise<RankingCobrador | null> {
  const ranking = await obtenerRankingCobradores(idusuario);
  const item = ranking.find((r) => r.idgestor === idusuario);
  if (!item) {
    return null;
  }
  const metas = await obtenerMetasGamificacion(idusuario);
  if (
    metas.metaGestionesCumplida &&
    metas.metaRecuperacionCumplida &&
    !item.insignias.includes(INSIGNIAS.META_SEMANAL)
  ) {
    return {
      ...item,
      insignias: [...item.insignias, INSIGNIAS.META_SEMANAL],
    };
  }
  return item;
}

export interface MetaGamificacion {
  metaGestionesSemana: number;
  metaRecuperacionSemana: number;
  gestionesSemana: number;
  recuperacionSemana: number;
  pctGestiones: number;
  pctRecuperacion: number;
  metaGestionesCumplida: boolean;
  metaRecuperacionCumplida: boolean;
}

export async function obtenerMetasGamificacion(
  idusuario: number,
): Promise<MetaGamificacion> {
  const [metaGestionesSemana, metaRecuperacionSemana] = await Promise.all([
    obtenerMetaGestionesSemanaUsuario(idusuario),
    obtenerMetaRecuperacionSemanaUsuario(idusuario),
  ]);

  const inicioSemana = new Date();
  const dia = inicioSemana.getDay();
  const diff = dia === 0 ? 6 : dia - 1;
  inicioSemana.setDate(inicioSemana.getDate() - diff);
  inicioSemana.setHours(0, 0, 0, 0);

  const mandanteFilter = await filtroMandante(idusuario);

  const [gestionesSemana, aggRecuperacion] = await Promise.all([
    prisma.tbl_gestion.count({
      where: {
        deletedAt: null,
        idgestor: idusuario,
        idmandante: mandanteFilter,
        fechaGestion: { gte: inicioSemana },
      },
    }),
    prisma.tbl_pago.aggregate({
      where: {
        deletedAt: null,
        aplicado: true,
        idmandante: mandanteFilter,
        fechaPago: { gte: inicioSemana },
        OR: [
          { idgestor: idusuario },
          { prestamo: { idgestorAsignado: idusuario } },
        ],
      },
      _sum: { monto: true },
    }),
  ]);

  const recuperacionSemana = roundMoney(
    decimalToNumber(aggRecuperacion._sum.monto),
  );
  const pctGestiones =
    metaGestionesSemana > 0
      ? Math.min(100, Math.round((gestionesSemana / metaGestionesSemana) * 100))
      : 0;
  const pctRecuperacion =
    metaRecuperacionSemana > 0
      ? Math.min(
          100,
          Math.round((recuperacionSemana / metaRecuperacionSemana) * 100),
        )
      : 0;

  return {
    metaGestionesSemana,
    metaRecuperacionSemana,
    gestionesSemana,
    recuperacionSemana,
    pctGestiones,
    pctRecuperacion,
    metaGestionesCumplida: gestionesSemana >= metaGestionesSemana,
    metaRecuperacionCumplida: recuperacionSemana >= metaRecuperacionSemana,
  };
}
