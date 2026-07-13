export const TIPO_NOTIFICACION = {
  ASIGNACION_CREDITO: 'ASIGNACION_CREDITO',
  GESTION_CREADA: 'GESTION_CREADA',
  PROMESA_CREADA: 'PROMESA_CREADA',
  PAGO_REGISTRADO: 'PAGO_REGISTRADO',
  ACUERDO_CREADO: 'ACUERDO_CREADO',
} as const;

export type TipoNotificacion =
  (typeof TIPO_NOTIFICACION)[keyof typeof TIPO_NOTIFICACION];

export type SeveridadNotificacion = 'info' | 'warning' | 'critical';

export interface NotificacionPersistida {
  id: string;
  tipo: string;
  severidad: SeveridadNotificacion;
  titulo: string;
  mensaje: string;
  url?: string | null;
  createdAt: Date;
  leida: boolean;
}

export interface CrearNotificacionInput {
  idusuario: number;
  tipo: TipoNotificacion;
  severidad?: SeveridadNotificacion;
  titulo: string;
  mensaje: string;
  url?: string | null;
  entidad?: string | null;
  entidadId?: number | null;
}
