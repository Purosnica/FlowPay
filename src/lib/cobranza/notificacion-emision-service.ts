import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  CLIENTE_NOMBRE_SELECT,
  formatNombreClienteDisplay,
} from '@/lib/logic/cliente-tipo-persona-logic';
import { ROL } from '@/lib/permissions/role-codes';
import { decimalToNumber } from './decimal-utils';
import { crearNotificacion } from './notificacion-service';
import { TIPO_NOTIFICACION } from '@/types/notificacion';

type DbClient = Prisma.TransactionClient | typeof prisma;

async function obtenerSupervisorCobrador(
  idusuarioCobrador: number,
): Promise<number | null> {
  const usuario = await prisma.tbl_usuario.findUnique({
    where: { idusuario: idusuarioCobrador },
    select: {
      idsupervisor: true,
      rol: { select: { codigo: true } },
    },
  });

  if (!usuario?.idsupervisor || usuario.rol?.codigo !== ROL.COBRADOR) {
    return null;
  }

  return usuario.idsupervisor;
}

export async function emitirNotificacionAsignacion(
  idgestorDestino: number,
  idusuarioAsignador: number,
  idprestamos: number[],
  db: DbClient = prisma,
): Promise<void> {
  if (idgestorDestino === idusuarioAsignador || idprestamos.length === 0) {
    return;
  }

  const asignador = await db.tbl_usuario.findUnique({
    where: { idusuario: idusuarioAsignador },
    select: { nombre: true },
  });

  if (!asignador) {
    return;
  }

  if (idprestamos.length === 1) {
    const prestamo = await db.tbl_prestamo.findUnique({
      where: { idprestamo: idprestamos[0] },
      select: {
        idprestamo: true,
        noPrestamo: true,
        mandante: { select: { nombre: true } },
        cliente: { select: CLIENTE_NOMBRE_SELECT },
      },
    });

    if (!prestamo) {
      return;
    }

    const deudor = prestamo.cliente
      ? formatNombreClienteDisplay(prestamo.cliente) || '—'
      : '—';
    await crearNotificacion(
      {
        idusuario: idgestorDestino,
        tipo: TIPO_NOTIFICACION.ASIGNACION_CREDITO,
        titulo: 'Crédito asignado',
        mensaje: `${prestamo.mandante.nombre} · ${prestamo.noPrestamo} · ${deudor} — por ${asignador.nombre}`,
        url: `/cobranza/prestamos/${prestamo.idprestamo}`,
        entidad: 'prestamo',
        entidadId: prestamo.idprestamo,
      },
      db,
    );
    return;
  }

  await crearNotificacion(
    {
      idusuario: idgestorDestino,
      tipo: TIPO_NOTIFICACION.ASIGNACION_CREDITO,
      titulo: 'Créditos asignados',
      mensaje: `${asignador.nombre} te asignó ${idprestamos.length} crédito(s)`,
      url: '/cobranza/bandeja',
      entidad: 'asignacion_cartera',
      entidadId: idprestamos.length,
    },
    db,
  );
}

export async function emitirNotificacionGestion(
  idgestion: number,
  db: DbClient = prisma,
): Promise<void> {
  const gestion = await db.tbl_gestion.findUnique({
    where: { idgestion },
    include: {
      gestor: { select: { idusuario: true, nombre: true } },
      mandante: { select: { nombre: true } },
      prestamo: {
        select: {
          idprestamo: true,
          noPrestamo: true,
          cliente: { select: CLIENTE_NOMBRE_SELECT },
        },
      },
    },
  });

  if (!gestion) {
    return;
  }

  const idsupervisor = await obtenerSupervisorCobrador(gestion.idgestor);
  if (!idsupervisor) {
    return;
  }

  const deudor = gestion.prestamo.cliente
    ? formatNombreClienteDisplay(gestion.prestamo.cliente) || '—'
    : '—';
  const base = `${gestion.mandante.nombre} · ${gestion.prestamo.noPrestamo} · ${deudor}`;
  const cobrador = gestion.gestor.nombre;

  if (gestion.montoPromesa !== null && gestion.fechaPromesa !== null) {
    const monto = decimalToNumber(gestion.montoPromesa);
    await crearNotificacion(
      {
        idusuario: idsupervisor,
        tipo: TIPO_NOTIFICACION.PROMESA_CREADA,
        titulo: 'Nueva promesa de pago',
        mensaje: `${base} — ${cobrador} · C$ ${monto.toLocaleString('es-NI')}`,
        url: `/cobranza/prestamos/${gestion.prestamo.idprestamo}`,
        entidad: 'tbl_gestion',
        entidadId: gestion.idgestion,
      },
      db,
    );
    return;
  }

  await crearNotificacion(
    {
      idusuario: idsupervisor,
      tipo: TIPO_NOTIFICACION.GESTION_CREADA,
      titulo: 'Nueva gestión',
      mensaje: `${base} — ${cobrador}`,
      url: `/cobranza/prestamos/${gestion.prestamo.idprestamo}`,
      entidad: 'tbl_gestion',
      entidadId: gestion.idgestion,
    },
    db,
  );
}

export async function emitirNotificacionPago(
  idpago: number,
  db: DbClient = prisma,
): Promise<void> {
  const pago = await db.tbl_pago.findUnique({
    where: { idpago },
    include: {
      gestor: { select: { idusuario: true, nombre: true } },
      mandante: { select: { nombre: true } },
      prestamo: {
        select: {
          idprestamo: true,
          noPrestamo: true,
          cliente: { select: CLIENTE_NOMBRE_SELECT },
        },
      },
    },
  });

  if (!pago?.idgestor) {
    return;
  }

  const idsupervisor = await obtenerSupervisorCobrador(pago.idgestor);
  if (!idsupervisor) {
    return;
  }

  const deudor = pago.prestamo.cliente
    ? formatNombreClienteDisplay(pago.prestamo.cliente) || '—'
    : '—';
  const monto = decimalToNumber(pago.monto);
  const cobrador = pago.gestor?.nombre ?? 'Cobrador';

  await crearNotificacion(
    {
      idusuario: idsupervisor,
      tipo: TIPO_NOTIFICACION.PAGO_REGISTRADO,
      titulo: 'Pago registrado',
      mensaje: `${pago.mandante.nombre} · ${pago.prestamo.noPrestamo} · ${deudor} — ${cobrador} · C$ ${monto.toLocaleString('es-NI')}`,
      url: `/cobranza/prestamos/${pago.prestamo.idprestamo}`,
      entidad: 'tbl_pago',
      entidadId: pago.idpago,
    },
    db,
  );
}

export async function emitirNotificacionAcuerdo(
  idacuerdo: number,
  idusuarioCreador: number,
  db: DbClient = prisma,
): Promise<void> {
  const idsupervisor = await obtenerSupervisorCobrador(idusuarioCreador);
  if (!idsupervisor) {
    return;
  }

  const acuerdo = await db.tbl_acuerdo.findUnique({
    where: { idacuerdo },
    include: {
      mandante: { select: { nombre: true } },
      prestamo: {
        select: {
          idprestamo: true,
          noPrestamo: true,
          cliente: { select: CLIENTE_NOMBRE_SELECT },
        },
      },
    },
  });

  if (!acuerdo) {
    return;
  }

  const creador = await db.tbl_usuario.findUnique({
    where: { idusuario: idusuarioCreador },
    select: { nombre: true },
  });

  const deudor = acuerdo.prestamo.cliente
    ? formatNombreClienteDisplay(acuerdo.prestamo.cliente) || '—'
    : '—';
  const cobrador = creador?.nombre ?? 'Cobrador';

  await crearNotificacion(
    {
      idusuario: idsupervisor,
      tipo: TIPO_NOTIFICACION.ACUERDO_CREADO,
      titulo: 'Nuevo acuerdo',
      mensaje: `${acuerdo.mandante.nombre} · ${acuerdo.prestamo.noPrestamo} · ${deudor} — ${cobrador}`,
      url: `/cobranza/prestamos/${acuerdo.prestamo.idprestamo}`,
      entidad: 'tbl_acuerdo',
      entidadId: acuerdo.idacuerdo,
    },
    db,
  );
}
