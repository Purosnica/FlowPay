import { prisma } from '@/lib/prisma';
import {
  CLIENTE_NOMBRE_SELECT,
  formatNombreClienteDisplay,
} from '@/lib/logic/cliente-tipo-persona-logic';
import { filtroMandante } from './mandante-scope';
import { obtenerIdsEquipo } from './equipo-scope';
import { contarPromesasVencidas } from './promesas-vencidas-service';
import {
  CLAVE_DIAS_SIN_GESTION_ALERTA,
  obtenerConfigNumerica,
} from './configuracion-cobranza-service';
import {
  obtenerIdsNotificacionesLeidas,
} from './notificacion-lectura-service';
import { obtenerNotificacionesPersistidas } from './notificacion-service';

export interface NotificacionOperativa {
  id: string;
  tipo: string;
  severidad: 'info' | 'warning' | 'critical';
  titulo: string;
  mensaje: string;
  url?: string | null;
  createdAt: Date;
  leida: boolean;
}

interface NotificacionOperativaBase {
  id: string;
  tipo: string;
  severidad: 'info' | 'warning' | 'critical';
  titulo: string;
  mensaje: string;
  url?: string | null;
  createdAt: Date;
}

export async function obtenerNotificacionesOperativas(
  idusuario: number,
  limite = 15,
): Promise<NotificacionOperativa[]> {
  const mandanteFilter = await filtroMandante(idusuario);
  const equipoIds = await obtenerIdsEquipo(idusuario);
  const ahora = new Date();
  const notificaciones: NotificacionOperativaBase[] = [];
  const diasSinGestionAlerta = await obtenerConfigNumerica(
    CLAVE_DIAS_SIN_GESTION_ALERTA,
  );
  const desdeGestion = new Date(
    ahora.getTime() - diasSinGestionAlerta * 86400000,
  );

  const [
    reclamosSla,
    promesasVencidas,
    acuerdosRiesgo,
    sinGestion,
    persistidas,
  ] = await Promise.all([
      prisma.tbl_reclamo.findMany({
        where: {
          deletedAt: null,
          idmandante: mandanteFilter,
          estado: { in: ['ABIERTO', 'EN_PROCESO'] },
          fechaLimite: { lt: ahora },
        },
        take: 5,
        orderBy: { fechaLimite: 'asc' },
        include: {
          cliente: {
            select: { ...CLIENTE_NOMBRE_SELECT },
          },
        },
      }),
      contarPromesasVencidas(idusuario, false),
      prisma.tbl_acuerdo.count({
        where: {
          deletedAt: null,
          estado: 'VIGENTE',
          idmandante: mandanteFilter,
          prestamo: { idgestorAsignado: { in: equipoIds } },
          cuotas: { some: { estado: 'VENCIDA' } },
        },
      }),
      prisma.tbl_prestamo.count({
        where: {
          deletedAt: null,
          idmandante: mandanteFilter,
          idgestorAsignado: { in: equipoIds },
          saldoTotal: { gt: 0 },
          gestiones: {
            none: { fechaGestion: { gte: desdeGestion } },
          },
        },
      }),
    obtenerNotificacionesPersistidas(idusuario, limite),
  ]);

  notificaciones.push(...persistidas);

  const leidasPersistidas = new Map(
    persistidas.map((n) => [n.id, n.leida]),
  );

  for (const r of reclamosSla) {
    const nombre = formatNombreClienteDisplay(r.cliente) || 'Cliente';
    notificaciones.push({
      id: `reclamo-${r.idreclamo}`,
      tipo: 'RECLAMO_SLA',
      severidad: 'critical',
      titulo: 'Reclamo fuera de SLA',
      mensaje: `${nombre}: límite ${r.fechaLimite.toLocaleDateString('es-NI')}`,
      url: '/cobranza/reclamos',
      createdAt: r.createdAt,
    });
  }

  if (promesasVencidas > 0) {
    notificaciones.push({
      id: 'promesas-vencidas',
      tipo: 'PROMESA_VENCIDA',
      severidad: 'warning',
      titulo: 'Promesas vencidas',
      mensaje: `${promesasVencidas} promesa(s) sin cumplir en tu cartera`,
      url: '/cobranza/bandeja?soloPromesaVencida=1',
      createdAt: ahora,
    });
  }

  if (acuerdosRiesgo > 0) {
    notificaciones.push({
      id: 'acuerdos-riesgo',
      tipo: 'ACUERDO_RIESGO',
      severidad: 'warning',
      titulo: 'Acuerdos en riesgo',
      mensaje: `${acuerdosRiesgo} acuerdo(s) con cuotas vencidas`,
      url: '/cobranza/cartera?estado=Con%20acuerdo',
      createdAt: ahora,
    });
  }

  if (sinGestion > 0) {
    notificaciones.push({
      id: 'sin-gestion',
      tipo: 'SIN_GESTION',
      severidad: 'info',
      titulo: 'Casos sin gestión',
      mensaje: `${sinGestion} préstamo(s) sin gestión en ${diasSinGestionAlerta} días`,
      url: '/cobranza/bandeja?soloSinGestion=1',
      createdAt: ahora,
    });
  }

  const ordenadas = notificaciones
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limite);

  const sinteticas = ordenadas.filter(
    (n) => !n.id.startsWith('notif-'),
  );
  const leidasSinteticas = await obtenerIdsNotificacionesLeidas(
    idusuario,
    sinteticas.map((n) => n.id),
  );
  return ordenadas.map((n) => ({
    ...n,
    leida: leidasPersistidas.has(n.id)
      ? (leidasPersistidas.get(n.id) ?? false)
      : leidasSinteticas.has(n.id),
  }));
}
