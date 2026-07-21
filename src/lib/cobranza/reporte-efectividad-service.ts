import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import { resolverIdGestorPago } from './pago-atributacion';
import type {
  ReporteEfectividad,
  ReporteEfectividadGestorItem,
} from '@/types/cobranza';

const TIPOS_CONTACTO = ['EFECTIVA', 'EFECTIVA CON TERCERO'] as const;
const GRUPOS_EFECTIVOS = ['LOCALIZADO', 'CANCELADA'] as const;

/**
 * Reporte de efectividad por cobrador en el periodo.
 */
export async function obtenerReporteEfectividad(
  idmandante: number,
  idusuario: number,
  periodo: string,
): Promise<ReporteEfectividad> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const { inicio, fin, periodo: periodoNorm } = parsePeriodo(periodo);

  const [gestionesPeriodo, pagosPeriodo, prestamosAsignados] =
    await Promise.all([
      prisma.tbl_gestion.findMany({
        where: {
          idmandante,
          deletedAt: null,
          fechaGestion: { gte: inicio, lt: fin },
        },
        select: {
          idgestor: true,
          codresult: {
            select: { tipoGestion: true, grupo: true },
          },
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
      prisma.tbl_prestamo.findMany({
        where: {
          idmandante,
          deletedAt: null,
          idgestorAsignado: { not: null },
          estado: { notIn: ['Cancelado', 'Finalizado'] },
        },
        select: {
          idgestorAsignado: true,
          diasMora: true,
          saldoTotal: true,
        },
      }),
    ]);

  const stats = new Map<
    number,
    {
      gestiones: number;
      gestionesEfectivas: number;
      gestionesContacto: number;
      montoRecuperado: number;
    }
  >();

  for (const g of gestionesPeriodo) {
    const prev = stats.get(g.idgestor) ?? {
      gestiones: 0,
      gestionesEfectivas: 0,
      gestionesContacto: 0,
      montoRecuperado: 0,
    };
    prev.gestiones += 1;
    const tipo = g.codresult?.tipoGestion ?? '';
    const grupo = g.codresult?.grupo ?? '';
    if (
      TIPOS_CONTACTO.includes(
        tipo as (typeof TIPOS_CONTACTO)[number],
      )
    ) {
      prev.gestionesContacto += 1;
    }
    if (
      GRUPOS_EFECTIVOS.includes(
        grupo as (typeof GRUPOS_EFECTIVOS)[number],
      )
    ) {
      prev.gestionesEfectivas += 1;
    }
    stats.set(g.idgestor, prev);
  }

  let totalRecuperadoPagos = 0;
  for (const pago of pagosPeriodo) {
    totalRecuperadoPagos += decimalToNumber(pago.monto);
    const idgestor = resolverIdGestorPago(pago);
    if (!idgestor) {
      continue;
    }
    const prev = stats.get(idgestor) ?? {
      gestiones: 0,
      gestionesEfectivas: 0,
      gestionesContacto: 0,
      montoRecuperado: 0,
    };
    prev.montoRecuperado += decimalToNumber(pago.monto);
    stats.set(idgestor, prev);
  }

  const carteraPorGestor = new Map<
    number,
    { asignados: number; enMora: number; saldo: number }
  >();
  for (const p of prestamosAsignados) {
    const id = p.idgestorAsignado;
    if (id == null) {
      continue;
    }
    const prev = carteraPorGestor.get(id) ?? {
      asignados: 0,
      enMora: 0,
      saldo: 0,
    };
    prev.asignados += 1;
    if (p.diasMora > 0) {
      prev.enMora += 1;
    }
    prev.saldo += decimalToNumber(p.saldoTotal);
    carteraPorGestor.set(id, prev);
  }

  const ids = [...new Set([...stats.keys(), ...carteraPorGestor.keys()])];
  const usuarios =
    ids.length > 0
      ? await prisma.tbl_usuario.findMany({
          where: { idusuario: { in: ids } },
          select: { idusuario: true, nombre: true },
        })
      : [];
  const nombrePorId = new Map(usuarios.map((u) => [u.idusuario, u.nombre]));

  const porGestor: ReporteEfectividadGestorItem[] = ids
    .map((idgestor) => {
      const s = stats.get(idgestor) ?? {
        gestiones: 0,
        gestionesEfectivas: 0,
        gestionesContacto: 0,
        montoRecuperado: 0,
      };
      const cartera = carteraPorGestor.get(idgestor) ?? {
        asignados: 0,
        enMora: 0,
        saldo: 0,
      };
      const montoRecuperado = roundMoney(s.montoRecuperado);
      const saldoAsignado = roundMoney(cartera.saldo);
      const efectividadPct =
        s.gestiones > 0
          ? roundMoney((s.gestionesEfectivas / s.gestiones) * 100)
          : 0;
      const tasaContactoPct =
        s.gestiones > 0
          ? roundMoney((s.gestionesContacto / s.gestiones) * 100)
          : 0;
      const recuperacionPct =
        saldoAsignado + montoRecuperado > 0
          ? roundMoney(
              (montoRecuperado / (saldoAsignado + montoRecuperado)) * 100,
            )
          : 0;

      return {
        idgestor,
        nombre: nombrePorId.get(idgestor) ?? `Gestor #${idgestor}`,
        gestiones: s.gestiones,
        gestionesEfectivas: s.gestionesEfectivas,
        efectividadPct,
        tasaContactoPct,
        montoRecuperado,
        prestamosAsignados: cartera.asignados,
        prestamosEnMora: cartera.enMora,
        saldoAsignado,
        recuperacionPct,
      };
    })
    .sort((a, b) => b.efectividadPct - a.efectividadPct);

  const totalGestiones = porGestor.reduce((s, g) => s + g.gestiones, 0);
  const totalGestionesEfectivas = porGestor.reduce(
    (s, g) => s + g.gestionesEfectivas,
    0,
  );
  const totalContacto = gestionesPeriodo.filter((g) =>
    TIPOS_CONTACTO.includes(
      (g.codresult?.tipoGestion ?? '') as (typeof TIPOS_CONTACTO)[number],
    ),
  ).length;
  const totalRecuperado = roundMoney(totalRecuperadoPagos);

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoNorm,
    totalGestiones,
    totalGestionesEfectivas,
    efectividadPct:
      totalGestiones > 0
        ? roundMoney((totalGestionesEfectivas / totalGestiones) * 100)
        : 0,
    tasaContactoPct:
      totalGestiones > 0
        ? roundMoney((totalContacto / totalGestiones) * 100)
        : 0,
    totalRecuperado,
    porGestor,
  };
}
