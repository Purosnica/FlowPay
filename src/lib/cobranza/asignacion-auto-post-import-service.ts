/**
 * Asignación automática post-importación de cartera (H23).
 * Reutiliza ejecutarAsignacionCartera; no inventa motor nuevo.
 */

import { prisma } from '@/lib/prisma';
import { ROL } from '@/lib/permissions/role-codes';
import { ejecutarAsignacionCartera } from '@/lib/cobranza/asignacion-cartera-service';
import {
  CLAVE_ASIGNACION_AUTO_POST_IMPORT,
  CLAVE_ASIGNACION_AUTO_METODO,
  obtenerConfigBooleanaMandante,
  obtenerConfigCobranza,
  claveMetaMandante,
} from '@/lib/cobranza/configuracion-cobranza-service';
import type { MetodoAsignacion } from '@/lib/cobranza/asignacion-cartera-service';

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
        estado: true,
        rol: { codigo: ROL.COBRADOR },
      },
    },
    select: { idusuario: true },
  });
  return rows.map((r) => r.idusuario);
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
    `Asignación automática post-import job #${params.idjob}`,
  );

  return { asignados, omitido: false };
}
