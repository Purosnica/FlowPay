/**
 * Outbox de emails ligados a tbl_notificacion (I033).
 */

import { prisma } from '@/lib/prisma';
import { enviarEmailOperativo, smtpDisponible } from '@/lib/services/email-service';
import { isShuttingDown } from '@/lib/scalability/graceful-shutdown';

const MAX_BATCH = 20;

export async function procesarOutboxEmailNotificaciones(): Promise<{
  enviados: number;
  fallidos: number;
}> {
  if (!smtpDisponible()) {
    return { enviados: 0, fallidos: 0 };
  }

  const pendientes = await prisma.tbl_notificacion.findMany({
    where: { emailEstado: 'PENDIENTE' },
    orderBy: { createdAt: 'asc' },
    take: MAX_BATCH,
    include: {
      usuario: { select: { email: true, activo: true, deletedAt: true } },
    },
  });

  let enviados = 0;
  let fallidos = 0;

  for (const n of pendientes) {
    if (isShuttingDown()) {
      break;
    }
    const email = n.usuario.email;
    if (!n.usuario.activo || n.usuario.deletedAt || !email) {
      await prisma.tbl_notificacion.update({
        where: { idnotificacion: n.idnotificacion },
        data: {
          emailEstado: 'FALLIDO',
          emailError: 'Usuario sin email activo',
          emailIntentos: { increment: 1 },
        },
      });
      fallidos += 1;
      continue;
    }

    try {
      await enviarEmailOperativo({
        to: email,
        subject: n.titulo.slice(0, 200),
        body: n.mensaje,
      });
      await prisma.tbl_notificacion.update({
        where: { idnotificacion: n.idnotificacion },
        data: {
          emailEstado: 'ENVIADO',
          emailError: null,
          emailIntentos: { increment: 1 },
        },
      });
      enviados += 1;
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : 'Error enviando email outbox';
      await prisma.tbl_notificacion.update({
        where: { idnotificacion: n.idnotificacion },
        data: {
          emailEstado: 'FALLIDO',
          emailError: mensaje.slice(0, 2000),
          emailIntentos: { increment: 1 },
        },
      });
      fallidos += 1;
    }
  }

  return { enviados, fallidos };
}
