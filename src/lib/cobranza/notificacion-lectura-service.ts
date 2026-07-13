import { prisma } from '@/lib/prisma';
import {
  esIdNotificacionPersistida,
  marcarNotificacionesPersistidasLeidas,
} from './notificacion-service';

export async function obtenerIdsNotificacionesLeidas(
  idusuario: number,
  notificacionIds: string[],
): Promise<Set<string>> {
  if (notificacionIds.length === 0) {
    return new Set();
  }

  const rows = await prisma.tbl_notificacion_lectura.findMany({
    where: {
      idusuario,
      notificacionId: { in: notificacionIds },
    },
    select: { notificacionId: true },
  });

  return new Set(rows.map((r: { notificacionId: string }) => r.notificacionId));
}

export async function marcarNotificacionesLeidas(
  idusuario: number,
  notificacionIds: string[],
): Promise<number> {
  if (notificacionIds.length === 0) {
    return 0;
  }

  const persistidas = notificacionIds.filter(esIdNotificacionPersistida);
  const sinteticas = notificacionIds.filter((id) => !esIdNotificacionPersistida(id));

  let marcadas = await marcarNotificacionesPersistidasLeidas(
    idusuario,
    persistidas,
  );

  for (const notificacionId of sinteticas) {
    await prisma.tbl_notificacion_lectura.upsert({
      where: {
        idusuario_notificacionId: {
          idusuario,
          notificacionId,
        },
      },
      create: { idusuario, notificacionId },
      update: { leidaEn: new Date() },
    });
    marcadas += 1;
  }

  return marcadas;
}
