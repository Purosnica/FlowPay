/**
 * SERVICIO DE CONTROL DE CONCURRENCIA - LOCKS LÓGICOS
 * 
 * Este servicio implementa un sistema de locks lógicos para prevenir
 * operaciones simultáneas sobre el mismo recurso (principalmente préstamos).
 * 
 * LÓGICA DE BLOQUEO:
 * 1. Antes de realizar una operación crítica, se intenta adquirir un lock
 * 2. Si el lock ya existe y está activo, la operación se rechaza
 * 3. El lock se libera automáticamente después de un timeout o manualmente
 * 4. Los locks expiran después de un tiempo configurado para evitar deadlocks
 * 
 * CASOS DE USO:
 * - Evitar doble registro de pago simultáneo
 * - Evitar que dos gestores cambien el mismo préstamo a la vez
 * - Bloquear préstamos durante reestructuración
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TipoRecurso = "PRESTAMO" | "PAGO" | "REESTRUCTURACION";

export interface LockOptions {
  timeoutSegundos?: number; // Tiempo de expiración del lock (default: 300 = 5 minutos)
  idusuario?: number | null; // Usuario que adquiere el lock
  descripcion?: string; // Descripción de la operación
}

const DEFAULT_TIMEOUT = 300; // 5 minutos por defecto

/**
 * Intenta adquirir un lock sobre un recurso
 * 
 * @param tipoRecurso Tipo de recurso (PRESTAMO, PAGO, etc.)
 * @param idrecurso ID del recurso (ej: idprestamo)
 * @param options Opciones del lock
 * @returns true si el lock fue adquirido, false si ya existe un lock activo
 * @throws Error si ocurre un problema al crear el lock
 */
export async function adquirirLock(
  tipoRecurso: TipoRecurso,
  idrecurso: number,
  options: LockOptions = {}
): Promise<{ adquirido: boolean; idlock?: number; mensaje?: string }> {
  const timeoutSegundos = options.timeoutSegundos || DEFAULT_TIMEOUT;
  const fechaExpiracion = new Date(Date.now() + timeoutSegundos * 1000);

  try {
    // 1. Verificar si existe un lock activo para este recurso
    const lockExistente = await prisma.tbl_lock.findFirst({
      where: {
        tipoRecurso,
        idrecurso,
        activo: true,
        fechaExpiracion: {
          gt: new Date(), // Solo locks que no han expirado
        },
      },
    });

    if (lockExistente) {
      // Lock ya existe y está activo
      const tiempoRestante = Math.ceil(
        (lockExistente.fechaExpiracion.getTime() - Date.now()) / 1000
      );
      return {
        adquirido: false,
        mensaje: `El recurso está bloqueado por otra operación. Tiempo restante: ${tiempoRestante} segundos. Usuario: ${lockExistente.idusuario || "Sistema"}`,
      };
    }

    // 2. Limpiar locks expirados para este recurso
    await prisma.tbl_lock.updateMany({
      where: {
        tipoRecurso,
        idrecurso,
        activo: true,
        fechaExpiracion: {
          lte: new Date(), // Locks expirados
        },
      },
      data: {
        activo: false,
        fechaLiberacion: new Date(),
      },
    });

    // 3. Crear nuevo lock
    const nuevoLock = await prisma.tbl_lock.create({
      data: {
        tipoRecurso,
        idrecurso,
        idusuario: options.idusuario || null,
        descripcion: options.descripcion || `Lock para ${tipoRecurso} ${idrecurso}`,
        fechaExpiracion,
        activo: true,
      },
    });

    return {
      adquirido: true,
      idlock: nuevoLock.idlock,
    };
  } catch (error) {
    console.error("Error al adquirir lock:", error);
    throw new Error(`Error al adquirir lock: ${error instanceof Error ? error.message : "Error desconocido"}`);
  }
}

/**
 * Libera un lock específico
 * 
 * @param idlock ID del lock a liberar
 * @param idusuario ID del usuario que libera (opcional, para validación)
 * @returns true si el lock fue liberado, false si no existe o ya estaba liberado
 */
export async function liberarLock(
  idlock: number,
  idusuario?: number | null
): Promise<boolean> {
  try {
    const lock = await prisma.tbl_lock.findUnique({
      where: { idlock },
    });

    if (!lock) {
      return false; // Lock no existe
    }

    if (!lock.activo) {
      return false; // Lock ya estaba liberado
    }

    // Validar que el usuario que libera sea el mismo que adquirió (opcional)
    if (idusuario !== undefined && lock.idusuario !== null && lock.idusuario !== idusuario) {
      throw new Error("No tienes permiso para liberar este lock");
    }

    // Liberar lock
    await prisma.tbl_lock.update({
      where: { idlock },
      data: {
        activo: false,
        fechaLiberacion: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error("Error al liberar lock:", error);
    throw error;
  }
}

/**
 * Libera todos los locks de un recurso específico
 * Útil para limpiar locks después de una operación
 * 
 * @param tipoRecurso Tipo de recurso
 * @param idrecurso ID del recurso
 * @returns Número de locks liberados
 */
export async function liberarLocksRecurso(
  tipoRecurso: TipoRecurso,
  idrecurso: number
): Promise<number> {
  try {
    const resultado = await prisma.tbl_lock.updateMany({
      where: {
        tipoRecurso,
        idrecurso,
        activo: true,
      },
      data: {
        activo: false,
        fechaLiberacion: new Date(),
      },
    });

    return resultado.count;
  } catch (error) {
    console.error("Error al liberar locks del recurso:", error);
    throw error;
  }
}

/**
 * Verifica si un recurso está bloqueado
 * 
 * @param tipoRecurso Tipo de recurso
 * @param idrecurso ID del recurso
 * @returns Información del lock activo o null si no está bloqueado
 */
export async function verificarLock(
  tipoRecurso: TipoRecurso,
  idrecurso: number
): Promise<{
  bloqueado: boolean;
  idlock?: number;
  idusuario?: number | null;
  fechaExpiracion?: Date;
  descripcion?: string;
} | null> {
  try {
    const lock = await prisma.tbl_lock.findFirst({
      where: {
        tipoRecurso,
        idrecurso,
        activo: true,
        fechaExpiracion: {
          gt: new Date(),
        },
      },
      orderBy: {
        fechaCreacion: "desc",
      },
    });

    if (!lock) {
      return { bloqueado: false };
    }

    return {
      bloqueado: true,
      idlock: lock.idlock,
      idusuario: lock.idusuario,
      fechaExpiracion: lock.fechaExpiracion,
      descripcion: lock.descripcion || undefined,
    };
  } catch (error) {
    console.error("Error al verificar lock:", error);
    return { bloqueado: false };
  }
}

/**
 * Limpia todos los locks expirados del sistema
 * Útil para ejecutar periódicamente (ej: en un cron job)
 * 
 * @returns Número de locks limpiados
 */
export async function limpiarLocksExpirados(): Promise<number> {
  try {
    const resultado = await prisma.tbl_lock.updateMany({
      where: {
        activo: true,
        fechaExpiracion: {
          lte: new Date(),
        },
      },
      data: {
        activo: false,
        fechaLiberacion: new Date(),
      },
    });

    return resultado.count;
  } catch (error) {
    console.error("Error al limpiar locks expirados:", error);
    throw error;
  }
}

/**
 * Wrapper para ejecutar una operación con lock automático
 * Adquiere el lock antes de ejecutar y lo libera después (incluso si hay error)
 * 
 * @param tipoRecurso Tipo de recurso
 * @param idrecurso ID del recurso
 * @param operacion Función a ejecutar dentro del lock
 * @param options Opciones del lock
 * @returns Resultado de la operación
 */
export async function conLock<T>(
  tipoRecurso: TipoRecurso,
  idrecurso: number,
  operacion: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  // Adquirir lock
  const lockResult = await adquirirLock(tipoRecurso, idrecurso, options);

  if (!lockResult.adquirido) {
    throw new Error(lockResult.mensaje || "No se pudo adquirir el lock");
  }

  const idlock = lockResult.idlock!;

  try {
    // Ejecutar operación
    const resultado = await operacion();
    return resultado;
  } finally {
    // Siempre liberar el lock, incluso si hay error
    await liberarLock(idlock, options.idusuario || null).catch((error) => {
      console.error("Error al liberar lock en finally:", error);
      // No lanzar error aquí para no ocultar el error original
    });
  }
}

/**
 * Wrapper para ejecutar una operación con lock en transacción
 * Similar a conLock pero dentro de una transacción Prisma
 * 
 * @param tx Cliente de transacción Prisma
 * @param tipoRecurso Tipo de recurso
 * @param idrecurso ID del recurso
 * @param operacion Función a ejecutar dentro del lock
 * @param options Opciones del lock
 * @returns Resultado de la operación
 */
export async function conLockEnTransaccion<T>(
  tx: Prisma.TransactionClient,
  tipoRecurso: TipoRecurso,
  idrecurso: number,
  operacion: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const timeoutSegundos = options.timeoutSegundos || DEFAULT_TIMEOUT;
  const fechaExpiracion = new Date(Date.now() + timeoutSegundos * 1000);

  // Verificar lock existente dentro de la transacción
  const lockExistente = await tx.tbl_lock.findFirst({
    where: {
      tipoRecurso,
      idrecurso,
      activo: true,
      fechaExpiracion: {
        gt: new Date(),
      },
    },
  });

  if (lockExistente) {
    const tiempoRestante = Math.ceil(
      (lockExistente.fechaExpiracion.getTime() - Date.now()) / 1000
    );
    throw new Error(
      `El recurso está bloqueado por otra operación. Tiempo restante: ${tiempoRestante} segundos.`
    );
  }

  // Crear lock dentro de la transacción
  const nuevoLock = await tx.tbl_lock.create({
    data: {
      tipoRecurso,
      idrecurso,
      idusuario: options.idusuario || null,
      descripcion: options.descripcion || `Lock para ${tipoRecurso} ${idrecurso}`,
      fechaExpiracion,
      activo: true,
    },
  });

  try {
    // Ejecutar operación
    const resultado = await operacion();

    // Liberar lock dentro de la transacción
    await tx.tbl_lock.update({
      where: { idlock: nuevoLock.idlock },
      data: {
        activo: false,
        fechaLiberacion: new Date(),
      },
    });

    return resultado;
  } catch (error) {
    // En caso de error, liberar el lock
    await tx.tbl_lock.update({
      where: { idlock: nuevoLock.idlock },
      data: {
        activo: false,
        fechaLiberacion: new Date(),
      },
    }).catch(() => {
      // Ignorar errores al liberar en caso de rollback
    });
    throw error;
  }
}




