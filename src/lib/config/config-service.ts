/**
 * SERVICIO DE CONFIGURACIÓN DEL SISTEMA
 * 
 * Este servicio proporciona acceso global a las configuraciones del sistema
 * desde cualquier módulo de la aplicación.
 * 
 * CARACTERÍSTICAS:
 * - Lectura global sin necesidad de contexto GraphQL
 * - Caché en memoria para mejor rendimiento
 * - Funciones helper tipadas para cada parámetro
 * - Valores por defecto seguros
 * 
 * USO:
 * ```typescript
 * import { obtenerTasaMora, obtenerDiasGracia } from "@/lib/config/config-service";
 * 
 * const tasaMora = await obtenerTasaMora(); // 0.36
 * const diasGracia = await obtenerDiasGracia(); // 0
 * ```
 */

import { prisma } from "@/lib/prisma";

// Cache simple en memoria (se puede mejorar con Redis en producción)
const cache: Map<string, { valor: any; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene el valor de una configuración por clave
 * 
 * @param clave Clave de la configuración
 * @param valorPorDefecto Valor por defecto si no existe
 * @param usarCache Si usar caché (default: true)
 * @returns Valor de la configuración como string
 */
export async function obtenerConfiguracion(
  clave: string,
  valorPorDefecto: string = "",
  usarCache: boolean = true
): Promise<string> {
  // Verificar caché
  if (usarCache) {
    const cached = cache.get(clave);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.valor;
    }
  }

  try {
    const config = await prisma.tbl_configuracion_sistema.findFirst({
      where: { clave, deletedAt: null },
    });

    const valor = config?.valor || valorPorDefecto;

    // Actualizar caché
    if (usarCache) {
      cache.set(clave, { valor, timestamp: Date.now() });
    }

    return valor;
  } catch (error) {
    console.error(`Error al obtener configuración ${clave}:`, error);
    return valorPorDefecto;
  }
}

/**
 * Obtiene el valor de una configuración como número
 * 
 * @param clave Clave de la configuración
 * @param valorPorDefecto Valor por defecto si no existe o no es válido
 * @returns Valor numérico
 */
export async function obtenerConfiguracionNumero(
  clave: string,
  valorPorDefecto: number = 0
): Promise<number> {
  const valor = await obtenerConfiguracion(clave, String(valorPorDefecto));
  const numero = parseFloat(valor);
  return isNaN(numero) ? valorPorDefecto : numero;
}

/**
 * Obtiene el valor de una configuración como decimal
 * 
 * @param clave Clave de la configuración
 * @param valorPorDefecto Valor por defecto si no existe o no es válido
 * @returns Valor decimal
 */
export async function obtenerConfiguracionDecimal(
  clave: string,
  valorPorDefecto: number = 0
): Promise<number> {
  return obtenerConfiguracionNumero(clave, valorPorDefecto);
}

/**
 * Obtiene el valor de una configuración como booleano
 * 
 * @param clave Clave de la configuración
 * @param valorPorDefecto Valor por defecto si no existe o no es válido
 * @returns Valor booleano
 */
export async function obtenerConfiguracionBooleano(
  clave: string,
  valorPorDefecto: boolean = false
): Promise<boolean> {
  const valor = await obtenerConfiguracion(clave, String(valorPorDefecto));
  return valor.toLowerCase() === "true" || valor === "1";
}

/**
 * Obtiene el valor de una configuración como array (separado por comas)
 * 
 * @param clave Clave de la configuración
 * @param valorPorDefecto Valor por defecto si no existe
 * @returns Array de strings
 */
export async function obtenerConfiguracionArray(
  clave: string,
  valorPorDefecto: string[] = []
): Promise<string[]> {
  const valor = await obtenerConfiguracion(clave, valorPorDefecto.join(","));
  if (!valor) return valorPorDefecto;
  return valor.split(",").map((v) => v.trim()).filter((v) => v.length > 0);
}

/**
 * Obtiene el valor de una configuración como JSON
 * 
 * @param clave Clave de la configuración
 * @param valorPorDefecto Valor por defecto si no existe o no es válido
 * @returns Objeto parseado
 */
export async function obtenerConfiguracionJSON<T = any>(
  clave: string,
  valorPorDefecto: T
): Promise<T> {
  const valor = await obtenerConfiguracion(clave, JSON.stringify(valorPorDefecto));
  try {
    return JSON.parse(valor) as T;
  } catch {
    return valorPorDefecto;
  }
}

/**
 * Limpia el caché de configuraciones
 * Útil después de actualizar configuraciones
 */
export function limpiarCacheConfiguracion(clave?: string): void {
  if (clave) {
    cache.delete(clave);
  } else {
    cache.clear();
  }
}

// ============================================
// FUNCIONES HELPER ESPECÍFICAS POR PARÁMETRO
// ============================================

/**
 * Obtiene la tasa de mora anual
 * @returns Tasa de mora como decimal (ej: 0.36 = 36%)
 */
export async function obtenerTasaMora(): Promise<number> {
  return obtenerConfiguracionDecimal("TASA_MORA", 0.36);
}

/**
 * Obtiene los días de gracia antes de aplicar mora
 * @returns Número de días de gracia
 */
export async function obtenerDiasGracia(): Promise<number> {
  return obtenerConfiguracionNumero("DIAS_GRACIA", 0);
}

/**
 * Obtiene los horarios permitidos para cobranza
 * @returns Objeto con horaInicio y horaFin (formato HH:mm)
 */
export async function obtenerHorariosPermitidosCobranza(): Promise<{
  horaInicio: string;
  horaFin: string;
  diasPermitidos: number[];
}> {
  const horaInicio = await obtenerConfiguracion("HORARIO_COBRANZA_INICIO", "08:00");
  const horaFin = await obtenerConfiguracion("HORARIO_COBRANZA_FIN", "18:00");
  const diasPermitidosStr = await obtenerConfiguracion("DIAS_COBRANZA_PERMITIDOS", "1,2,3,4,5");
  const diasPermitidos = diasPermitidosStr
    .split(",")
    .map((d) => parseInt(d.trim()))
    .filter((d) => !isNaN(d));

  return {
    horaInicio,
    horaFin,
    diasPermitidos: diasPermitidos.length > 0 ? diasPermitidos : [1, 2, 3, 4, 5],
  };
}

/**
 * Obtiene el máximo número de reestructuraciones permitidas
 * @returns Número máximo de reestructuraciones
 */
export async function obtenerMaximoReestructuraciones(): Promise<number> {
  return obtenerConfiguracionNumero("MAXIMO_REESTRUCTURACIONES", 2);
}

/**
 * Obtiene el límite máximo de monto para préstamos
 * @returns Monto máximo en decimal
 */
export async function obtenerLimiteMontoPrestamo(): Promise<number> {
  return obtenerConfiguracionDecimal("LIMITE_MONTO_PRESTAMO", 1000000);
}

/**
 * Obtiene los días de mora para considerar un préstamo como castigado
 * @returns Número de días de mora para castigo
 */
export async function obtenerDiasMoraCastigado(): Promise<number> {
  return obtenerConfiguracionNumero("DIAS_MORA_CASTIGADO", 90);
}

/**
 * Obtiene los métodos de pago habilitados
 * @returns Array de códigos de métodos de pago habilitados
 */
export async function obtenerMetodosPagoHabilitados(): Promise<string[]> {
  return obtenerConfiguracionArray("METODOS_PAGO_HABILITADOS", [
    "EFECTIVO",
    "TRANSFERENCIA",
    "TARJETA",
    "CHEQUE",
  ]);
}

/**
 * Valida si un método de pago está habilitado
 * @param metodoPago Código del método de pago
 * @returns true si está habilitado
 */
export async function esMetodoPagoHabilitado(metodoPago: string): Promise<boolean> {
  const metodosHabilitados = await obtenerMetodosPagoHabilitados();
  return metodosHabilitados.includes(metodoPago.toUpperCase());
}

/**
 * Valida si la hora actual está dentro del horario permitido para cobranza
 * @param fechaHora Fecha y hora a validar (default: ahora)
 * @returns true si está dentro del horario permitido
 */
export async function esHorarioPermitidoCobranza(fechaHora?: Date): Promise<boolean> {
  const horarios = await obtenerHorariosPermitidosCobranza();
  const ahora = fechaHora || new Date();
  const diaSemana = ahora.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  const diaSemanaAjustado = diaSemana === 0 ? 7 : diaSemana; // Convertir a 1-7

  // Validar día de la semana
  if (!horarios.diasPermitidos.includes(diaSemanaAjustado)) {
    return false;
  }

  // Validar hora
  const horaActual = ahora.getHours() * 100 + ahora.getMinutes(); // HHmm
  const [horaInicioH, horaInicioM] = horarios.horaInicio.split(":").map(Number);
  const [horaFinH, horaFinM] = horarios.horaFin.split(":").map(Number);
  const horaInicio = horaInicioH * 100 + horaInicioM;
  const horaFin = horaFinH * 100 + horaFinM;

  return horaActual >= horaInicio && horaActual <= horaFin;
}

/**
 * Obtiene todas las configuraciones del sistema
 * @param categoria Opcional: filtrar por categoría
 * @returns Array de configuraciones
 */
export async function obtenerTodasLasConfiguraciones(categoria?: string) {
  const where: any = { deletedAt: null };
  if (categoria) {
    where.categoria = categoria;
  }

  return prisma.tbl_configuracion_sistema.findMany({
    where,
    orderBy: [{ categoria: "asc" }, { clave: "asc" }],
  });
}

