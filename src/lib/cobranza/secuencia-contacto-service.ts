import { prisma } from '@/lib/prisma';
import { filtroMandante, requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import type { AgendaSecuenciaItem } from '@/types/cobranza';

export type { AgendaSecuenciaItem };

export interface PasoSecuenciaInput {
  orden: number;
  diasDesdeInicio: number;
  canal: string;
  accion?: string | null;
  idplantilla?: number | null;
}

export interface SecuenciaContactoResumen {
  idsecuencia: number;
  idcampana: number;
  idmandante: number;
  nombre: string;
  estado: string;
  pasos: Array<{
    idpaso: number;
    orden: number;
    diasDesdeInicio: number;
    canal: string;
    accion: string | null;
    idplantilla: number | null;
    plantillaNombre: string | null;
  }>;
}

export async function crearSecuenciaContacto(
  idusuario: number,
  params: {
    idcampana: number;
    idmandante: number;
    nombre: string;
    pasos: PasoSecuenciaInput[];
  },
): Promise<SecuenciaContactoResumen> {
  await requerirAccesoMandante(idusuario, params.idmandante);

  const campana = await prisma.tbl_campana.findFirst({
    where: {
      idcampana: params.idcampana,
      idmandante: params.idmandante,
      deletedAt: null,
    },
  });
  if (!campana) {
    throw new Error('Campaña no encontrada.');
  }

  if (params.pasos.length === 0) {
    throw new Error('La secuencia debe tener al menos un paso.');
  }

  const secuencia = await prisma.$transaction(async (tx) => {
    const creada = await tx.tbl_secuencia_contacto.create({
      data: {
        idcampana: params.idcampana,
        idmandante: params.idmandante,
        nombre: params.nombre,
        estado: 'ACTIVA',
      },
    });

    await tx.tbl_secuencia_contacto_paso.createMany({
      data: params.pasos.map((p) => ({
        idsecuencia: creada.idsecuencia,
        orden: p.orden,
        diasDesdeInicio: p.diasDesdeInicio,
        canal: p.canal,
        accion: p.accion ?? null,
        idplantilla: p.idplantilla ?? null,
      })),
    });

    return creada;
  });

  const detalle = await obtenerSecuenciaPorId(secuencia.idsecuencia, idusuario);
  if (!detalle) {
    throw new Error('No se pudo cargar la secuencia creada.');
  }
  return detalle;
}

export async function obtenerSecuenciaPorId(
  idsecuencia: number,
  idusuario: number,
): Promise<SecuenciaContactoResumen | null> {
  const row = await prisma.tbl_secuencia_contacto.findFirst({
    where: { idsecuencia, deletedAt: null },
    include: {
      pasos: {
        orderBy: { orden: 'asc' },
        include: { plantilla: { select: { nombre: true } } },
      },
    },
  });
  if (!row) {
    return null;
  }
  await requerirAccesoMandante(idusuario, row.idmandante);
  return mapSecuencia(row);
}

export async function listarSecuenciasPorCampana(
  idusuario: number,
  idcampana: number,
): Promise<SecuenciaContactoResumen[]> {
  const campana = await prisma.tbl_campana.findUnique({
    where: { idcampana },
  });
  if (!campana) {
    return [];
  }
  await requerirAccesoMandante(idusuario, campana.idmandante);

  const rows = await prisma.tbl_secuencia_contacto.findMany({
    where: { idcampana, deletedAt: null },
    include: {
      pasos: {
        orderBy: { orden: 'asc' },
        include: { plantilla: { select: { nombre: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(mapSecuencia);
}

export async function listarSecuenciasPorMandante(
  idusuario: number,
  idmandante: number,
): Promise<Array<SecuenciaContactoResumen & { campanaNombre: string }>> {
  await requerirAccesoMandante(idusuario, idmandante);

  const rows = await prisma.tbl_secuencia_contacto.findMany({
    where: { idmandante, deletedAt: null },
    include: {
      pasos: {
        orderBy: { orden: 'asc' },
        include: { plantilla: { select: { nombre: true } } },
      },
      campana: { select: { nombre: true, estado: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return rows.map((row) => ({
    ...mapSecuencia(row),
    campanaNombre: row.campana.nombre,
  }));
}

export async function obtenerAgendaSecuenciaHoy(
  idusuario: number,
  idcampana?: number,
): Promise<AgendaSecuenciaItem[]> {
  const mandanteFilter = await filtroMandante(idusuario);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const secuencias = await prisma.tbl_secuencia_contacto.findMany({
    where: {
      deletedAt: null,
      estado: 'ACTIVA',
      idmandante: mandanteFilter,
      idcampana: idcampana ?? undefined,
      campana: { estado: 'ACTIVA', deletedAt: null },
    },
    include: {
      pasos: { orderBy: { orden: 'asc' } },
      campana: { select: { fechaCarga: true } },
    },
  });

  const items: AgendaSecuenciaItem[] = [];

  if (secuencias.length === 0) {
    return items;
  }

  const idcampanas = secuencias.map((s) => s.idcampana);
  const todosPrestamos = await prisma.tbl_prestamo.findMany({
    where: {
      idcampana: { in: idcampanas },
      deletedAt: null,
      saldoTotal: { gt: 0 },
      idgestorAsignado: idusuario,
    },
    include: {
      cliente: {
        select: {
          primer_nombres: true,
          primer_apellido: true,
        },
      },
    },
  });

  const prestamosPorCampana = new Map<number, typeof todosPrestamos>();
  for (const prestamo of todosPrestamos) {
    if (!prestamo.idcampana) {
      continue;
    }
    const lista = prestamosPorCampana.get(prestamo.idcampana) ?? [];
    lista.push(prestamo);
    prestamosPorCampana.set(prestamo.idcampana, lista);
  }

  for (const sec of secuencias) {
    const inicio = new Date(sec.campana.fechaCarga);
    inicio.setHours(0, 0, 0, 0);
    const diasTranscurridos = Math.floor(
      (hoy.getTime() - inicio.getTime()) / 86400000,
    );

    const pasosHoy = sec.pasos.filter(
      (p) => p.diasDesdeInicio === diasTranscurridos,
    );
    if (pasosHoy.length === 0) {
      continue;
    }

    const prestamos = (prestamosPorCampana.get(sec.idcampana) ?? []).slice(
      0,
      200,
    );

    for (const prestamo of prestamos) {
      for (const paso of pasosHoy) {
        const nombreCliente = [
          prestamo.cliente.primer_nombres,
          prestamo.cliente.primer_apellido,
        ]
          .filter(Boolean)
          .join(' ');
        items.push({
          idprestamo: prestamo.idprestamo,
          noPrestamo: prestamo.noPrestamo,
          canal: paso.canal,
          accion: paso.accion,
          diasDesdeInicio: paso.diasDesdeInicio,
          nombreCliente,
        });
      }
    }
  }

  return items;
}

function mapSecuencia(row: {
  idsecuencia: number;
  idcampana: number;
  idmandante: number;
  nombre: string;
  estado: string;
  pasos: Array<{
    idpaso: number;
    orden: number;
    diasDesdeInicio: number;
    canal: string;
    accion: string | null;
    idplantilla: number | null;
    plantilla: { nombre: string } | null;
  }>;
}): SecuenciaContactoResumen {
  return {
    idsecuencia: row.idsecuencia,
    idcampana: row.idcampana,
    idmandante: row.idmandante,
    nombre: row.nombre,
    estado: row.estado,
    pasos: row.pasos.map((p) => ({
      idpaso: p.idpaso,
      orden: p.orden,
      diasDesdeInicio: p.diasDesdeInicio,
      canal: p.canal,
      accion: p.accion,
      idplantilla: p.idplantilla,
      plantillaNombre: p.plantilla?.nombre ?? null,
    })),
  };
}
