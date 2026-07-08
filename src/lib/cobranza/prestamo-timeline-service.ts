import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber } from './decimal-utils';

export type TimelineEventoTipo =
  | 'ESTADO'
  | 'GESTION'
  | 'PAGO'
  | 'ACUERDO'
  | 'ASIGNACION'
  | 'AUDITORIA';

export interface TimelinePrestamoEvento {
  id: string;
  tipo: TimelineEventoTipo;
  titulo: string;
  descripcion: string;
  usuario: string | null;
  metadata: string | null;
  fecha: Date;
}

export async function obtenerTimelinePrestamo(
  idusuario: number,
  idprestamo: number,
  limite = 50,
): Promise<TimelinePrestamoEvento[]> {
  const prestamo = await prisma.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: { idmandante: true, deletedAt: true },
  });

  if (!prestamo || prestamo.deletedAt) {
    return [];
  }

  await requerirAccesoMandante(idusuario, prestamo.idmandante);

  const [
    estados,
    gestiones,
    pagos,
    acuerdos,
    asignaciones,
    auditoria,
  ] = await Promise.all([
    prisma.tbl_prestamo_estado_historial.findMany({
      where: { idprestamo },
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: { usuario: { select: { nombre: true } } },
    }),
    prisma.tbl_gestion.findMany({
      where: { idprestamo, deletedAt: null },
      orderBy: { fechaGestion: 'desc' },
      take: limite,
      include: {
        gestor: { select: { nombre: true } },
        codresult: { select: { descripcion: true, codigo: true } },
        codaccion: { select: { descripcion: true } },
      },
    }),
    prisma.tbl_pago.findMany({
      where: { idprestamo, deletedAt: null },
      orderBy: { fechaPago: 'desc' },
      take: limite,
      include: { gestor: { select: { nombre: true } } },
    }),
    prisma.tbl_acuerdo.findMany({
      where: { idprestamo, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limite,
    }),
    prisma.tbl_prestamo_asignacion_historial.findMany({
      where: { idprestamo },
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: {
        gestorAnterior: { select: { nombre: true } },
        gestorNuevo: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
      },
    }),
    prisma.tbl_auditoria.findMany({
      where: {
        entidad: 'prestamo',
        entidadId: idprestamo,
      },
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: { usuario: { select: { nombre: true } } },
    }),
  ]);

  const eventos: TimelinePrestamoEvento[] = [];

  for (const e of estados) {
    const transicion = e.estadoAnterior
      ? `${e.estadoAnterior} → ${e.estadoNuevo}`
      : e.estadoNuevo;
    eventos.push({
      id: `estado-${e.idhistorial}`,
      tipo: 'ESTADO',
      titulo: `Estado: ${transicion}`,
      descripcion: e.motivo ?? 'Cambio de estado',
      usuario: e.usuario?.nombre ?? null,
      metadata: null,
      fecha: e.createdAt,
    });
  }

  for (const g of gestiones) {
    const resultado = g.codresult
      ? `${g.codresult.codigo} — ${g.codresult.descripcion}`
      : 'Sin resultado';
    eventos.push({
      id: `gestion-${g.idgestion}`,
      tipo: 'GESTION',
      titulo: `Gestión: ${resultado}`,
      descripcion: g.nota.slice(0, 200),
      usuario: g.gestor.nombre,
      metadata: g.montoPromesa
        ? `Promesa: ${decimalToNumber(g.montoPromesa)}`
        : null,
      fecha: g.fechaGestion,
    });
  }

  for (const p of pagos) {
    eventos.push({
      id: `pago-${p.idpago}`,
      tipo: 'PAGO',
      titulo: `Pago ${p.aplicado ? 'aplicado' : 'registrado'}`,
      descripcion: `${decimalToNumber(p.monto)} ${p.moneda}${p.medio ? ` · ${p.medio}` : ''}`,
      usuario: p.gestor?.nombre ?? null,
      metadata: null,
      fecha: p.fechaPago,
    });
  }

  for (const a of acuerdos) {
    eventos.push({
      id: `acuerdo-${a.idacuerdo}`,
      tipo: 'ACUERDO',
      titulo: `Acuerdo ${a.estado}`,
      descripcion: `${decimalToNumber(a.montoAcordado)} en ${a.numeroCuotas} cuota(s), desc. ${decimalToNumber(a.porcentajeDesc)}%`,
      usuario: null,
      metadata: null,
      fecha: a.fechaInicio,
    });
  }

  for (const h of asignaciones) {
    const anterior = h.gestorAnterior?.nombre ?? 'Sin asignar';
    eventos.push({
      id: `asignacion-${h.idhistorial}`,
      tipo: 'ASIGNACION',
      titulo: `Asignación: ${anterior} → ${h.gestorNuevo.nombre}`,
      descripcion: h.motivo ?? 'Reasignación de cartera',
      usuario: h.usuario.nombre,
      metadata: null,
      fecha: h.createdAt,
    });
  }

  for (const a of auditoria) {
    eventos.push({
      id: `auditoria-${a.idauditoria}`,
      tipo: 'AUDITORIA',
      titulo: `Auditoría: ${a.accion}`,
      descripcion: a.detalle ?? a.accion,
      usuario: a.usuario?.nombre ?? null,
      metadata: null,
      fecha: a.createdAt,
    });
  }

  return eventos
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    .slice(0, limite);
}
