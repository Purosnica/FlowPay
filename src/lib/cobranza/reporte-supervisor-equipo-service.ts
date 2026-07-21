import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import { resolverIdGestorPago } from './pago-atributacion';
import { obtenerIdsEquipo } from './equipo-scope';
import { ROL } from '@/lib/permissions/role-codes';
import type {
  ReporteSupervisorEquipo,
  ReporteSupervisorEquipoItem,
} from '@/types/cobranza';

const GRUPOS_EFECTIVOS = ['LOCALIZADO', 'CANCELADA'] as const;

/**
 * Ranking del equipo vs promedio (coach / brechas).
 */
export async function obtenerReporteSupervisorEquipo(
  idmandante: number,
  idusuario: number,
  periodo: string,
): Promise<ReporteSupervisorEquipo> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const { inicio, fin, periodo: periodoNorm } = parsePeriodo(periodo);
  const equipoIds = await obtenerIdsEquipo(idusuario);

  const cobradores =
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

  const cobradorIds = cobradores.map((c) => c.idusuario);
  if (cobradorIds.length === 0) {
    return {
      idmandante,
      mandanteCodigo: mandante.codigo,
      mandanteNombre: mandante.nombre,
      periodo: periodoNorm,
      totalCobradores: 0,
      promedioRecuperado: 0,
      promedioEfectividad: 0,
      totalRecuperado: 0,
      ranking: [],
    };
  }

  const [gestiones, pagos] = await Promise.all([
    prisma.tbl_gestion.findMany({
      where: {
        idmandante,
        deletedAt: null,
        idgestor: { in: cobradorIds },
        fechaGestion: { gte: inicio, lt: fin },
      },
      select: {
        idgestor: true,
        codresult: { select: { grupo: true } },
      },
    }),
    prisma.tbl_pago.findMany({
      where: {
        idmandante,
        deletedAt: null,
        aplicado: true,
        fechaPago: { gte: inicio, lt: fin },
      },
      select: {
        monto: true,
        gestion: { select: { idgestor: true } },
        prestamo: { select: { idgestorAsignado: true } },
      },
    }),
  ]);

  const stats = new Map<
    number,
    { gestiones: number; efectivas: number; recuperado: number }
  >();
  for (const id of cobradorIds) {
    stats.set(id, { gestiones: 0, efectivas: 0, recuperado: 0 });
  }

  for (const g of gestiones) {
    const s = stats.get(g.idgestor);
    if (!s) {
      continue;
    }
    s.gestiones += 1;
    const grupo = g.codresult?.grupo ?? '';
    if (
      GRUPOS_EFECTIVOS.includes(grupo as (typeof GRUPOS_EFECTIVOS)[number])
    ) {
      s.efectivas += 1;
    }
  }

  for (const p of pagos) {
    const idgestor = resolverIdGestorPago(p);
    if (!idgestor || !stats.has(idgestor)) {
      continue;
    }
    const s = stats.get(idgestor);
    if (s) {
      s.recuperado += decimalToNumber(p.monto);
    }
  }

  const base = cobradores.map((c) => {
    const s = stats.get(c.idusuario) ?? {
      gestiones: 0,
      efectivas: 0,
      recuperado: 0,
    };
    const efectividadPct =
      s.gestiones > 0
        ? roundMoney((s.efectivas / s.gestiones) * 100)
        : 0;
    return {
      idgestor: c.idusuario,
      nombre: c.nombre,
      gestiones: s.gestiones,
      gestionesEfectivas: s.efectivas,
      efectividadPct,
      montoRecuperado: roundMoney(s.recuperado),
    };
  });

  const n = base.length;
  const promedioRecuperado = roundMoney(
    base.reduce((s, r) => s + r.montoRecuperado, 0) / n,
  );
  const promedioEfectividad = roundMoney(
    base.reduce((s, r) => s + r.efectividadPct, 0) / n,
  );
  const totalRecuperado = roundMoney(
    base.reduce((s, r) => s + r.montoRecuperado, 0),
  );

  const ranking: ReporteSupervisorEquipoItem[] = base
    .map((r) => ({
      ...r,
      brechaVsPromedioRecuperado: roundMoney(
        r.montoRecuperado - promedioRecuperado,
      ),
      brechaVsPromedioEfectividad: roundMoney(
        r.efectividadPct - promedioEfectividad,
      ),
    }))
    .sort((a, b) => b.montoRecuperado - a.montoRecuperado);

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoNorm,
    totalCobradores: n,
    promedioRecuperado,
    promedioEfectividad,
    totalRecuperado,
    ranking,
  };
}
