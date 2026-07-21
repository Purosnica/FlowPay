/**
 * Digest diario por email para supervisores y gerentes.
 * Reutiliza dashboard + alertas operativas; SMTP vía email-service.
 */

import { prisma } from '@/lib/prisma';
import { ROL } from '@/lib/permissions/role-codes';
import {
  enviarEmailOperativo,
  smtpDisponible,
} from '@/lib/services/email-service';
import { formatearMoneda } from '@/types/cobranza';
import { obtenerDashboardSupervisor } from './dashboard-supervisor-service';
import { obtenerNotificacionesOperativas } from './notificacion-operativa-service';

export type DigestEmailResultado = {
  destinatarios: number;
  enviados: number;
  omitidosSinEmail: number;
  omitidosSmtp: boolean;
  errores: number;
};

function construirCuerpoDigest(params: {
  nombre: string;
  fechaLabel: string;
  gestionesHoy: number;
  gestionesAyer: number;
  montoRecuperadoMes: number;
  promesasVencidas: number;
  casosSinGestion7d: number;
  tasaContactoPct: number;
  alertas: Array<{ severidad: string; titulo: string; mensaje: string }>;
}): string {
  const lineasAlertas =
    params.alertas.length === 0
      ? ['  (sin alertas pendientes)']
      : params.alertas.map(
          (a) => `  [${a.severidad}] ${a.titulo}: ${a.mensaje}`,
        );

  return [
    `Hola ${params.nombre},`,
    '',
    `Resumen operativo — ${params.fechaLabel}`,
    '',
    `Gestiones hoy: ${params.gestionesHoy}`,
    `Gestiones ayer: ${params.gestionesAyer}`,
    `Recuperado del mes: ${formatearMoneda(params.montoRecuperadoMes)}`,
    `Promesas vencidas (equipo): ${params.promesasVencidas}`,
    `Casos sin gestión 7d: ${params.casosSinGestion7d}`,
    `Tasa de contacto equipo: ${params.tasaContactoPct.toFixed(1)}%`,
    '',
    'Alertas:',
    ...lineasAlertas,
    '',
    'Ingrese a FlowPay para gestionar el detalle.',
  ].join('\n');
}

/**
 * Envía un digest matutino a SUPERVISOR / GERENTE / ADMIN activos con email.
 */
export async function procesarDigestEmailSupervisores(): Promise<DigestEmailResultado> {
  if (!smtpDisponible()) {
    return {
      destinatarios: 0,
      enviados: 0,
      omitidosSinEmail: 0,
      omitidosSmtp: true,
      errores: 0,
    };
  }

  const destinatarios = await prisma.tbl_usuario.findMany({
    where: {
      activo: true,
      deletedAt: null,
      rol: {
        codigo: { in: [ROL.SUPERVISOR, ROL.GERENTE, ROL.ADMIN] },
      },
    },
    select: {
      idusuario: true,
      nombre: true,
      email: true,
    },
  });

  const fechaLabel = new Date().toLocaleDateString('es-NI', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let enviados = 0;
  let omitidosSinEmail = 0;
  let errores = 0;

  for (const usuario of destinatarios) {
    const email = usuario.email?.trim();
    if (!email) {
      omitidosSinEmail += 1;
      continue;
    }

    try {
      const [dashboard, alertas] = await Promise.all([
        obtenerDashboardSupervisor(usuario.idusuario),
        obtenerNotificacionesOperativas(usuario.idusuario, 10),
      ]);

      const noLeidas = alertas.filter((a) => !a.leida).slice(0, 8);
      const cuerpo = construirCuerpoDigest({
        nombre: usuario.nombre,
        fechaLabel,
        gestionesHoy: dashboard.gestionesHoy,
        gestionesAyer: dashboard.gestionesAyer,
        montoRecuperadoMes: dashboard.montoRecuperadoMes,
        promesasVencidas: dashboard.promesasVencidasEquipo,
        casosSinGestion7d: dashboard.casosSinGestion7d,
        tasaContactoPct: dashboard.tasaContactoEquipoPct,
        alertas: noLeidas.map((a) => ({
          severidad: a.severidad,
          titulo: a.titulo,
          mensaje: a.mensaje,
        })),
      });

      await enviarEmailOperativo({
        to: email,
        subject: `Resumen operativo — ${fechaLabel}`.slice(0, 200),
        body: cuerpo,
      });
      enviados += 1;
    } catch {
      errores += 1;
    }
  }

  return {
    destinatarios: destinatarios.length,
    enviados,
    omitidosSinEmail,
    omitidosSmtp: false,
    errores,
  };
}
