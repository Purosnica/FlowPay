import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import type { ReporteGestorItem } from '@/types/cobranza';

export type { ReporteGestorItem };

export interface ReporteCobranzaResumen {
  idmandante: number;
  periodo: string | null;
  totalPrestamos: number;
  prestamosEnMora: number;
  saldoCartera: number;
  totalRecuperado: number;
  totalGestiones: number;
  totalAcuerdosVigentes: number;
  tasaRecuperacion: number;
}

export interface ReporteCobranzaCompleto extends ReporteCobranzaResumen {
  porGestor: ReporteGestorItem[];
}

export async function obtenerReporteCobranza(
  idmandante: number,
  idusuario: number,
  periodo?: string | null,
): Promise<ReporteCobranzaCompleto> {
  await requerirAccesoMandante(idusuario, idmandante);

  let rango: { inicio: Date; fin: Date } | null = null;
  let periodoLabel: string | null = null;
  if (periodo) {
    const parsed = parsePeriodo(periodo);
    rango = { inicio: parsed.inicio, fin: parsed.fin };
    periodoLabel = parsed.periodo;
  }

  const pagoWhere = {
    idmandante,
    deletedAt: null,
    aplicado: true,
    ...(rango
      ? { fechaPago: { gte: rango.inicio, lt: rango.fin } }
      : {}),
  };

  const [prestamoAgg, prestamosEnMora, pagosConContexto, gestiones, acuerdosVigentes] =
    await Promise.all([
      prisma.tbl_prestamo.aggregate({
        where: { idmandante, deletedAt: null },
        _count: { idprestamo: true },
        _sum: { saldoTotal: true },
      }),
      prisma.tbl_prestamo.count({
        where: { idmandante, deletedAt: null, diasMora: { gt: 0 } },
      }),
      prisma.tbl_pago.findMany({
        where: pagoWhere,
        select: {
          monto: true,
          gestion: { select: { idgestor: true } },
          prestamo: { select: { idgestorAsignado: true } },
        },
      }),
      prisma.tbl_gestion.count({
        where: {
          idmandante,
          deletedAt: null,
          ...(rango
            ? { fechaGestion: { gte: rango.inicio, lt: rango.fin } }
            : {}),
        },
      }),
      prisma.tbl_acuerdo.count({
        where: { idmandante, estado: 'VIGENTE', deletedAt: null },
      }),
    ]);

  const saldoCartera = roundMoney(
    decimalToNumber(prestamoAgg._sum.saldoTotal),
  );
  const totalPrestamos = prestamoAgg._count.idprestamo;

  const totalRecuperado = roundMoney(
    pagosConContexto.reduce((s, p) => s + decimalToNumber(p.monto), 0),
  );

  const tasaRecuperacion =
    saldoCartera + totalRecuperado > 0
      ? roundMoney((totalRecuperado / (saldoCartera + totalRecuperado)) * 100)
      : 0;

  const gestionesPorGestor = await prisma.tbl_gestion.groupBy({
    by: ['idgestor'],
    where: {
      idmandante,
      deletedAt: null,
      ...(rango
        ? { fechaGestion: { gte: rango.inicio, lt: rango.fin } }
        : {}),
    },
    _count: { idgestion: true },
  });

  const recuperadoPorGestor = new Map<number, number>();
  for (const pago of pagosConContexto) {
    const idgestor =
      pago.gestion?.idgestor ?? pago.prestamo.idgestorAsignado ?? null;
    if (!idgestor) {
      continue;
    }
    const prev = recuperadoPorGestor.get(idgestor) ?? 0;
    recuperadoPorGestor.set(
      idgestor,
      prev + decimalToNumber(pago.monto),
    );
  }

  const gestorIds = new Set([
    ...gestionesPorGestor.map((g) => g.idgestor),
    ...recuperadoPorGestor.keys(),
  ]);

  const usuarios =
    gestorIds.size > 0
      ? await prisma.tbl_usuario.findMany({
          where: { idusuario: { in: [...gestorIds] } },
          select: { idusuario: true, nombre: true },
        })
      : [];

  const nombrePorId = new Map(usuarios.map((u) => [u.idusuario, u.nombre]));

  const porGestor: ReporteGestorItem[] = [...gestorIds].map((idgestor) => ({
    idgestor,
    nombre: nombrePorId.get(idgestor) ?? `Usuario ${idgestor}`,
    gestiones:
      gestionesPorGestor.find((g) => g.idgestor === idgestor)?._count
        .idgestion ?? 0,
    montoRecuperado: roundMoney(recuperadoPorGestor.get(idgestor) ?? 0),
  }));

  porGestor.sort((a, b) => b.montoRecuperado - a.montoRecuperado);

  return {
    idmandante,
    periodo: periodoLabel,
    totalPrestamos,
    prestamosEnMora,
    saldoCartera,
    totalRecuperado,
    totalGestiones: gestiones,
    totalAcuerdosVigentes: acuerdosVigentes,
    tasaRecuperacion,
    porGestor,
  };
}
