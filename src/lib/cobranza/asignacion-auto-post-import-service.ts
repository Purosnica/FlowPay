/**
 * Asignación automática post-import y cron (H23).
 * Reutiliza ejecutarAsignacionCartera; no inventa motor nuevo.
 */

import { prisma } from '@/lib/prisma';
import { ROL } from '@/lib/permissions/role-codes';
import { ejecutarAsignacionCartera } from '@/lib/cobranza/asignacion-cartera-service';
import {
  CLAVE_ASIGNACION_AUTO_POST_IMPORT,
  CLAVE_ASIGNACION_AUTO_METODO,
  CLAVE_ASIGNACION_AUTO_CRON,
  obtenerConfigBooleanaMandante,
  obtenerConfigCobranza,
  claveMetaMandante,
} from '@/lib/cobranza/configuracion-cobranza-service';
import type { MetodoAsignacion } from '@/lib/cobranza/asignacion-cartera-service';
import { logger } from '@/lib/utils/logger';

const METODOS_VALIDOS: MetodoAsignacion[] = [
  'POR_MORA',
  'ALEATORIO',
  'POR_CANTIDAD',
  'POR_MONTO',
];

async function resolverMetodo(
  idmandante: number,
): Promise<MetodoAsignacion> {
  const especifica = await obtenerConfigCobranza(
    claveMetaMandante(CLAVE_ASIGNACION_AUTO_METODO, idmandante),
  );
  const global = especifica
    ? especifica
    : await obtenerConfigCobranza(CLAVE_ASIGNACION_AUTO_METODO);
  const raw = (global || 'POR_CANTIDAD').toUpperCase();
  if (METODOS_VALIDOS.includes(raw as MetodoAsignacion)) {
    return raw as MetodoAsignacion;
  }
  return 'POR_CANTIDAD';
}

async function listarCobradoresMandante(
  idmandante: number,
): Promise<number[]> {
  const rows = await prisma.tbl_usuario_mandante.findMany({
    where: {
      idmandante,
      usuario: {
        deletedAt: null,
        activo: true,
        rol: { codigo: ROL.COBRADOR },
      },
    },
    select: { idusuario: true },
  });
  return rows.map((r) => r.idusuario);
}

async function resolverActorMandante(
  idmandante: number,
): Promise<number | null> {
  const row = await prisma.tbl_usuario_mandante.findFirst({
    where: {
      idmandante,
      usuario: {
        deletedAt: null,
        activo: true,
        rol: {
          codigo: { in: [ROL.ADMIN, ROL.GERENTE, ROL.SUPERVISOR] },
        },
      },
    },
    select: { idusuario: true },
    orderBy: { idusuario: 'asc' },
  });
  return row?.idusuario ?? null;
}

export async function asignarSinGestorAutomatico(params: {
  idmandante: number;
  idusuario: number;
  motivo: string;
}): Promise<{ asignados: number; omitido: boolean; motivo?: string }> {
  const gestores = await listarCobradoresMandante(params.idmandante);
  if (gestores.length === 0) {
    return { asignados: 0, omitido: true, motivo: 'sin_cobradores' };
  }

  const metodo = await resolverMetodo(params.idmandante);
  const { asignados } = await ejecutarAsignacionCartera(
    params.idusuario,
    { idmandante: params.idmandante, sinAsignar: true },
    gestores,
    metodo,
    params.motivo,
  );

  return { asignados, omitido: false };
}

/**
 * Si la config del mandante lo habilita, reparte préstamos sin gestor.
 * Errores se registran pero no fallan la importación.
 */
export async function intentarAsignacionAutoPostImport(params: {
  idmandante: number;
  idusuario: number;
  idjob: number;
}): Promise<{ asignados: number; omitido: boolean; motivo?: string }> {
  const habilitada = await obtenerConfigBooleanaMandante(
    CLAVE_ASIGNACION_AUTO_POST_IMPORT,
    params.idmandante,
  );
  if (!habilitada) {
    return { asignados: 0, omitido: true, motivo: 'config_deshabilitada' };
  }

  return asignarSinGestorAutomatico({
    idmandante: params.idmandante,
    idusuario: params.idusuario,
    motivo: `Asignación automática post-import job #${params.idjob}`,
  });
}

export interface ResultadoAsignacionAutoCron {
  mandantes: number;
  asignados: number;
  omitidos: number;
  errores: number;
}

/**
 * Cron: asigna cartera sin gestor en mandantes con
 * `cobranza.asignacion_auto_cron` (o override por mandante).
 */
export async function procesarAsignacionAutoCron(): Promise<ResultadoAsignacionAutoCron> {
  const mandantes = await prisma.tbl_mandante.findMany({
    where: { deletedAt: null, estado: true },
    select: { idmandante: true },
  });

  let asignados = 0;
  let omitidos = 0;
  let errores = 0;

  for (const m of mandantes) {
    const habilitada = await obtenerConfigBooleanaMandante(
      CLAVE_ASIGNACION_AUTO_CRON,
      m.idmandante,
    );
    if (!habilitada) {
      omitidos++;
      continue;
    }

    const actor = await resolverActorMandante(m.idmandante);
    if (actor == null) {
      omitidos++;
      continue;
    }

    try {
      const r = await asignarSinGestorAutomatico({
        idmandante: m.idmandante,
        idusuario: actor,
        motivo: 'Asignación automática cron (rebalanceo sin gestor)',
      });
      if (r.omitido) {
        omitidos++;
      } else {
        asignados += r.asignados;
      }
    } catch (err) {
      errores++;
      logger.error(
        'Asignación auto cron falló',
        err instanceof Error ? err : undefined,
        { idmandante: m.idmandante },
      );
    }
  }

  return {
    mandantes: mandantes.length,
    asignados,
    omitidos,
    errores,
  };
}
