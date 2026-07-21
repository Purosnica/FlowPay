/**
 * Alerta por email a ADMIN/GERENTE cuando el cron maestro falla o queda parcial.
 */

import { prisma } from '@/lib/prisma';
import { ROL } from '@/lib/permissions/role-codes';
import {
  enviarEmailOperativo,
  smtpDisponible,
} from '@/lib/services/email-service';
import { registrarAuditoria } from '@/lib/cobranza/auditoria-service';
import {
  CLAVE_CRON_ALERTA_EMAIL_ACTIVA,
  obtenerConfigBooleana,
} from '@/lib/cobranza/configuracion-cobranza-service';
import type {
  CronEstadoEjecucion,
  CronJobRunSummary,
  CronTrigger,
} from '@/lib/cron/cron-types';

export type CronAlertaEmailResultado = {
  enviada: boolean;
  omitida: boolean;
  motivoOmitida?: string;
  destinatarios: number;
  enviados: number;
  errores: number;
};

/** Estados del master que disparan alerta email. */
export function cronEstadoRequiereAlerta(
  estado: CronEstadoEjecucion,
): boolean {
  return (
    estado === 'ERROR' || estado === 'PARCIAL' || estado === 'TIMEOUT'
  );
}

function construirCuerpoAlerta(params: {
  estado: CronEstadoEjecucion;
  trigger: CronTrigger;
  idejecucion: number;
  duracionMs: number;
  jobs: CronJobRunSummary[];
}): string {
  const fallidos = params.jobs.filter(
    (j) => j.estado === 'ERROR' || j.estado === 'TIMEOUT',
  );
  const lineasFallidos =
    fallidos.length === 0
      ? ['  (sin detalle de subjobs)']
      : fallidos.map(
          (j) =>
            `  - ${j.codigo}: ${j.estado}` +
            (j.error ? ` — ${j.error}` : ''),
        );

  return [
    'Alerta FlowPay — cron operaciones_cobranza',
    '',
    `Estado: ${params.estado}`,
    `Trigger: ${params.trigger}`,
    `Ejecución ID: ${params.idejecucion}`,
    `Duración: ${Math.round(params.duracionMs / 1000)}s`,
    '',
    'Subjobs con fallo:',
    ...lineasFallidos,
    '',
    'Revise Configuración → Cron y los logs del servidor.',
  ].join('\n');
}

/**
 * Notifica a ADMIN/GERENTE si el orquestador terminó en ERROR/PARCIAL/TIMEOUT.
 * No lanza: fallos de SMTP se registran en el resultado.
 */
export async function notificarFalloCronOperaciones(params: {
  estado: CronEstadoEjecucion;
  trigger: CronTrigger;
  idejecucion: number;
  duracionMs: number;
  jobs: CronJobRunSummary[];
}): Promise<CronAlertaEmailResultado> {
  if (!cronEstadoRequiereAlerta(params.estado)) {
    return {
      enviada: false,
      omitida: true,
      motivoOmitida: 'estado_ok',
      destinatarios: 0,
      enviados: 0,
      errores: 0,
    };
  }

  const activa = await obtenerConfigBooleana(CLAVE_CRON_ALERTA_EMAIL_ACTIVA);
  if (!activa) {
    return {
      enviada: false,
      omitida: true,
      motivoOmitida: 'config_desactivada',
      destinatarios: 0,
      enviados: 0,
      errores: 0,
    };
  }

  if (!smtpDisponible()) {
    return {
      enviada: false,
      omitida: true,
      motivoOmitida: 'smtp_no_disponible',
      destinatarios: 0,
      enviados: 0,
      errores: 0,
    };
  }

  const usuarios = await prisma.tbl_usuario.findMany({
    where: {
      activo: true,
      deletedAt: null,
      rol: { codigo: { in: [ROL.ADMIN, ROL.GERENTE] } },
    },
    select: { idusuario: true, email: true, nombre: true },
  });

  const destinatarios = usuarios
    .map((u) => ({
      idusuario: u.idusuario,
      email: u.email.trim(),
      nombre: u.nombre,
    }))
    .filter((u) => u.email.length > 0);

  if (destinatarios.length === 0) {
    return {
      enviada: false,
      omitida: true,
      motivoOmitida: 'sin_destinatarios',
      destinatarios: 0,
      enviados: 0,
      errores: 0,
    };
  }

  const subject = `[FlowPay] Cron operaciones ${params.estado} (#${params.idejecucion})`;
  const body = construirCuerpoAlerta(params);

  let enviados = 0;
  let errores = 0;

  for (const dest of destinatarios) {
    try {
      await enviarEmailOperativo({
        to: dest.email,
        subject,
        body,
      });
      enviados += 1;
    } catch {
      errores += 1;
    }
  }

  await registrarAuditoria(prisma, {
    entidad: 'tbl_cron_ejecucion',
    entidadId: params.idejecucion,
    accion: 'CRON_ALERTA_EMAIL',
    detalle: JSON.stringify({
      estado: params.estado,
      trigger: params.trigger,
      destinatarios: destinatarios.length,
      enviados,
      errores,
    }),
  });

  return {
    enviada: enviados > 0,
    omitida: false,
    destinatarios: destinatarios.length,
    enviados,
    errores,
  };
}
