import { prisma } from '@/lib/prisma';

export const CLAVE_PAGO_AUTO_APLICAR = 'cobranza.pago_auto_aplicar';
export const CLAVE_MAX_CONTACTOS_DIA = 'cobranza.max_contactos_dia_deudor';
export const CLAVE_ACUERDO_DIAS_GRACIA = 'cobranza.acuerdo_dias_gracia_cuota';
export const CLAVE_DIAS_SIN_GESTION_ALERTA = 'cobranza.dias_sin_gestion_alerta';
export const CLAVE_DIAS_MORA_CASTIGO = 'cobranza.dias_mora_castigo';
export const CLAVE_MORA_DIAS_GRACIA = 'cobranza.mora_dias_gracia';
export const CLAVE_ACUERDO_DESCUENTO_MAX_SIN_APROBACION =
  'cobranza.acuerdo_descuento_max_sin_aprobacion';
export const CLAVE_META_GESTIONES_SEMANA = 'cobranza.meta_gestiones_semana';
export const CLAVE_META_RECUPERACION_SEMANA = 'cobranza.meta_recuperacion_semana';
export const CLAVE_META_RECUPERACION_MES = 'cobranza.meta_recuperacion_mes';
export const CLAVE_CRON_ALERTA_EMAIL_ACTIVA =
  'cobranza.cron_alerta_email_activa';

const DEFAULTS: Record<string, string> = {
  [CLAVE_PAGO_AUTO_APLICAR]: 'true',
  [CLAVE_MAX_CONTACTOS_DIA]: '5',
  [CLAVE_ACUERDO_DIAS_GRACIA]: '3',
  [CLAVE_DIAS_SIN_GESTION_ALERTA]: '7',
  [CLAVE_DIAS_MORA_CASTIGO]: '180',
  [CLAVE_MORA_DIAS_GRACIA]: '0',
  [CLAVE_ACUERDO_DESCUENTO_MAX_SIN_APROBACION]: '15',
  [CLAVE_META_GESTIONES_SEMANA]: '25',
  [CLAVE_META_RECUPERACION_SEMANA]: '50000',
  [CLAVE_META_RECUPERACION_MES]: '200000',
  [CLAVE_CRON_ALERTA_EMAIL_ACTIVA]: 'true',
};

export async function obtenerConfigCobranza(clave: string): Promise<string> {
  const config = await prisma.tbl_configuracion_sistema.findFirst({
    where: { clave, deletedAt: null },
  });
  if (config) {
    return config.valor;
  }
  return DEFAULTS[clave] ?? '';
}

export async function obtenerConfigBooleana(clave: string): Promise<boolean> {
  const valor = await obtenerConfigCobranza(clave);
  return valor === 'true' || valor === '1';
}

export async function obtenerConfigNumerica(clave: string): Promise<number> {
  const valor = await obtenerConfigCobranza(clave);
  const n = Number(valor);
  return Number.isFinite(n) ? n : Number(DEFAULTS[clave] ?? 0);
}

export function claveMetaMandante(claveBase: string, idmandante: number): string {
  return `${claveBase}.mandante.${idmandante}`;
}

export function claveMetaUsuario(claveBase: string, idusuario: number): string {
  return `${claveBase}.usuario.${idusuario}`;
}

export async function obtenerConfigNumericaConFallback(
  claveEspecifica: string,
  claveGlobal: string,
): Promise<number> {
  const config = await prisma.tbl_configuracion_sistema.findFirst({
    where: { clave: claveEspecifica, deletedAt: null },
  });
  if (config?.valor) {
    const n = Number(config.valor);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return obtenerConfigNumerica(claveGlobal);
}

export async function obtenerMetaRecuperacionMes(
  idmandante?: number,
): Promise<number> {
  if (idmandante) {
    return obtenerConfigNumericaConFallback(
      claveMetaMandante(CLAVE_META_RECUPERACION_MES, idmandante),
      CLAVE_META_RECUPERACION_MES,
    );
  }
  return obtenerConfigNumerica(CLAVE_META_RECUPERACION_MES);
}

export async function obtenerMetaGestionesSemanaUsuario(
  idusuario: number,
): Promise<number> {
  return obtenerConfigNumericaConFallback(
    claveMetaUsuario(CLAVE_META_GESTIONES_SEMANA, idusuario),
    CLAVE_META_GESTIONES_SEMANA,
  );
}

export async function obtenerMetaRecuperacionSemanaUsuario(
  idusuario: number,
): Promise<number> {
  return obtenerConfigNumericaConFallback(
    claveMetaUsuario(CLAVE_META_RECUPERACION_SEMANA, idusuario),
    CLAVE_META_RECUPERACION_SEMANA,
  );
}

export async function guardarConfigCobranza(
  clave: string,
  valor: string,
  idusuario?: number,
): Promise<void> {
  await prisma.tbl_configuracion_sistema.upsert({
    where: { clave },
    create: {
      clave,
      valor,
      tipo: 'texto',
      categoria: 'cobranza',
      idusuarioMod: idusuario ?? null,
    },
    update: {
      valor,
      idusuarioMod: idusuario ?? null,
      deletedAt: null,
    },
  });
}

export async function asegurarConfigsCobranzaDefault(): Promise<void> {
  for (const [clave, valor] of Object.entries(DEFAULTS)) {
    const existe = await prisma.tbl_configuracion_sistema.findFirst({
      where: { clave, deletedAt: null },
    });
    if (!existe) {
      await prisma.tbl_configuracion_sistema.create({
        data: {
          clave,
          valor,
          tipo: clave.includes('auto') ? 'booleano' : 'numero',
          categoria: 'cobranza',
          descripcion: `Parámetro operativo: ${clave}`,
        },
      });
    }
  }
}
