import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import type {
  ReporteProductividadDiaItem,
  ReporteProductividadDiaria,
  ReporteProductividadGestorResumen,
} from '@/types/cobranza';

const GRUPOS_EFECTIVOS = ['LOCALIZADO', 'CANCELADA'] as const;

/**
 * Gestiones y recuperación desglosadas por día y cobrador.
 */
export async function obtenerReporteProductividadDiaria(
  idmandante: number,
  idusuario: number,
  periodo: string,
): Promise<ReporteProductividadDiaria> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const { inicio, fin, periodo: periodoNorm } = parsePeriodo(periodo);

  const [gestiones, pagos] = await Promise.all([
    prisma.tbl_gestion.findMany({
      where: {
        idmandante,
        deletedAt: null,
        fechaGestion: { gte: inicio, lt: fin },
      },
      select: {
        idgestor: true,
        fechaGestion: true,
        gestor: { select: { nombre: true } },
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
        fechaPago: true,
        idgestor: true,
        gestion: { select: { idgestor: true } },
        prestamo: { select: { idgestorAsignado: true } },
      },
    }),
  ]);

  type Agg = {
    nombre: string;
    gestiones: number;
    efectivas: number;
    recuperado: number;
  };
  const porClave = new Map<string, Agg>();

  for (const g of gestiones) {
    const fecha = g.fechaGestion.toISOString().slice(0, 10);
    const key = `${fecha}|${g.idgestor}`;
    const prev = porClave.get(key) ?? {
      nombre: g.gestor.nombre,
      gestiones: 0,
      efectivas: 0,
      recuperado: 0,
    };
    prev.gestiones += 1;
    const grupo = g.codresult?.grupo ?? '';
    if (
      GRUPOS_EFECTIVOS.includes(grupo as (typeof GRUPOS_EFECTIVOS)[number])
    ) {
      prev.efectivas += 1;
    }
    porClave.set(key, prev);
  }

  for (const p of pagos) {
    const idgestor =
      p.idgestor ??
      p.gestion?.idgestor ??
      p.prestamo.idgestorAsignado ??
      null;
    if (!idgestor) {
      continue;
    }
    const fecha = p.fechaPago.toISOString().slice(0, 10);
    const key = `${fecha}|${idgestor}`;
    const prev = porClave.get(key) ?? {
      nombre: `Gestor #${idgestor}`,
      gestiones: 0,
      efectivas: 0,
      recuperado: 0,
    };
    prev.recuperado += decimalToNumber(p.monto);
    porClave.set(key, prev);
  }

  const idsSinNombre = [...porClave.entries()]
    .filter(([, v]) => v.nombre.startsWith('Gestor #'))
    .map(([k]) => Number(k.split('|')[1]));
  if (idsSinNombre.length > 0) {
    const usuarios = await prisma.tbl_usuario.findMany({
      where: { idusuario: { in: [...new Set(idsSinNombre)] } },
      select: { idusuario: true, nombre: true },
    });
    const mapa = new Map(usuarios.map((u) => [u.idusuario, u.nombre]));
    for (const [key, val] of porClave) {
      const id = Number(key.split('|')[1]);
      const nombre = mapa.get(id);
      if (nombre) {
        val.nombre = nombre;
      }
    }
  }

  const porDia: ReporteProductividadDiaItem[] = [...porClave.entries()]
    .map(([key, v]) => {
      const [fecha, idStr] = key.split('|');
      return {
        fecha,
        idgestor: Number(idStr),
        nombreGestor: v.nombre,
        gestiones: v.gestiones,
        gestionesEfectivas: v.efectivas,
        montoRecuperado: roundMoney(v.recuperado),
      };
    })
    .sort((a, b) =>
      a.fecha === b.fecha
        ? b.gestiones - a.gestiones
        : b.fecha.localeCompare(a.fecha),
    );

  const porGestorMap = new Map<
    number,
    {
      nombre: string;
      dias: Set<string>;
      gestiones: number;
      recuperado: number;
    }
  >();
  for (const row of porDia) {
    const prev = porGestorMap.get(row.idgestor) ?? {
      nombre: row.nombreGestor,
      dias: new Set<string>(),
      gestiones: 0,
      recuperado: 0,
    };
    if (row.gestiones > 0) {
      prev.dias.add(row.fecha);
    }
    prev.gestiones += row.gestiones;
    prev.recuperado += row.montoRecuperado;
    porGestorMap.set(row.idgestor, prev);
  }

  const porGestor: ReporteProductividadGestorResumen[] = [
    ...porGestorMap.entries(),
  ]
    .map(([idgestor, g]) => ({
      idgestor,
      nombreGestor: g.nombre,
      diasActivos: g.dias.size,
      totalGestiones: g.gestiones,
      promedioGestionesDia:
        g.dias.size > 0
          ? roundMoney(g.gestiones / g.dias.size)
          : 0,
      totalRecuperado: roundMoney(g.recuperado),
    }))
    .sort((a, b) => b.totalGestiones - a.totalGestiones);

  const totalGestiones = gestiones.length;
  const diasUnicos = new Set(porDia.map((d) => d.fecha)).size;

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoNorm,
    totalGestiones,
    promedioGestionesDia:
      diasUnicos > 0 ? roundMoney(totalGestiones / diasUnicos) : 0,
    porDia,
    porGestor,
  };
}
