/**
 * SERVICIO DE CASTIGO DE CARTERA - CONSOLIDADO Y SEGURO
 * 
 * Este servicio implementa la lógica de castigo de cartera con todas las garantías:
 * - Transacciones atómicas
 * - Control de concurrencia (locks lógicos)
 * - Validación de permisos
 * - Validación de estado previo
 * - Cancelación de cuotas pendientes
 * - Actualización de estados
 * - Auditoría completa
 * 
 * REQUISITOS:
 * - Estado CASTIGADO
 * - Registrar motivo
 * - Evitar acciones de pago normales (validado en mutations)
 * - Permitir solo pagos judiciales (validado en mutations)
 * - Mostrar aparte en reportes (filtrado en queries)
 * - Afectar KPI globales (excluidos de cálculos normales)
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EstadoPrestamoEnum, EstadoCuotaEnum } from "@prisma/client";
import { conLock } from "@/lib/locks/lock-service";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import {
  METODOS_PAGO_JUDICIALES,
  TRANSACTION_CONFIG,
  LOCK_CONFIG,
  CASTIGO_RULES,
  ACCIONES_AUDITORIA,
  ENTIDADES_SISTEMA,
} from "@/lib/constants";
import type { IPrestamoRepository, ICuotaRepository } from "@/lib/repositories/interfaces";
import { PrestamoRepository, CuotaRepository } from "@/lib/repositories/prisma";

export interface DatosCastigo {
  idprestamos: number[];
  motivo: string;
  observaciones?: string | null;
  idusuario: number | null;
  fechaCastigo?: Date | null;
}

export interface DatosCastigoPrestamo {
  idprestamo: number;
  motivo: string;
  observaciones?: string | null;
  idusuario: number | null;
  fechaCastigo?: Date;
  ip?: string | null;
  userAgent?: string | null;
}

export interface ResultadoCastigo {
  castigosCreados: any[];
  prestamosCastigados: number;
  cuotasCanceladas: number;
}

export interface ResultadoCastigoPrestamo {
  castigo: any;
  prestamoCastigado: any;
  cuotasCanceladas: number;
}

/**
 * Valida que el préstamo puede ser castigado
 * 
 * @param prestamoRepo Repositorio de préstamos (inyectado para facilitar testing)
 * @param idprestamo ID del préstamo
 * @param permitirRecastigo Si permite recastigar préstamos ya castigados
 */
async function validarPrestamoParaCastigo(
  prestamoRepo: IPrestamoRepository,
  idprestamo: number,
  permitirRecastigo: boolean = false
): Promise<any> {
  const prestamo = await prestamoRepo.findFirst({
    where: { idprestamo },
    include: {
      cuotas: {
        where: { deletedAt: null },
        orderBy: { numero: "asc" },
      },
      cliente: {
        select: {
          idcliente: true,
          primer_nombres: true,
          primer_apellido: true,
        },
      },
    },
  });

  if (!prestamo) {
    throw new Error("Préstamo no encontrado o eliminado");
  }

  if (!permitirRecastigo) {
    if (prestamo.estado === EstadoPrestamoEnum.CASTIGADO) {
      throw new Error("El préstamo ya está castigado");
    }

    if (prestamo.estado === EstadoPrestamoEnum.PAGADO) {
      throw new Error("No se puede castigar un préstamo ya pagado");
    }

    if (prestamo.estado === EstadoPrestamoEnum.CANCELADO) {
      throw new Error("No se puede castigar un préstamo cancelado");
    }
  } else {
    // Para castigo masivo, permitir recastigar pero validar estados válidos
    if (
      prestamo.estado !== EstadoPrestamoEnum.EN_MORA &&
      prestamo.estado !== EstadoPrestamoEnum.EN_CURSO &&
      prestamo.estado !== EstadoPrestamoEnum.CASTIGADO &&
      prestamo.estado !== EstadoPrestamoEnum.PAGADO &&
      prestamo.estado !== EstadoPrestamoEnum.CANCELADO
    ) {
      throw new Error(
        `El préstamo no está en un estado válido para castigo. Estado actual: ${prestamo.estado}`
      );
    }
  }

  return prestamo;
}

/**
 * Castiga uno o más préstamos (versión masiva para transacciones)
 * 
 * PROCESO:
 * 1. Validar préstamos
 * 2. Cancelar cuotas pendientes
 * 3. Actualizar estado a CASTIGADO
 * 4. Crear registro de castigo
 * 5. Registrar auditoría completa
 * 
 * @param tx Cliente de transacción Prisma
 * @param datos Datos del castigo
 * @returns Resultado del castigo
 */
export async function castigarCartera(
  tx: Prisma.TransactionClient,
  datos: DatosCastigo
): Promise<ResultadoCastigo> {
  const fechaCastigo = datos.fechaCastigo || new Date();
  const castigosCreados: any[] = [];
  let cuotasCanceladas = 0;

  // Crear repositorios para esta transacción
  const prestamoRepo = new PrestamoRepository(tx);
  const cuotaRepo = new CuotaRepository(tx);

  for (const idprestamo of datos.idprestamos) {
    try {
      // 1. Validar préstamo (permitir recastigo en versión masiva)
      const prestamo = await validarPrestamoParaCastigo(prestamoRepo, idprestamo, true);

      // Si ya está castigado, crear nuevo registro de castigo pero no cancelar cuotas
      const yaCastigado = prestamo.estado === EstadoPrestamoEnum.CASTIGADO;

      // 2. Cancelar cuotas pendientes si no está ya castigado
      if (!yaCastigado) {
        const resultadoCuotas = await cuotaRepo.updateMany({
          where: {
            idprestamo,
            estado: {
              in: [EstadoCuotaEnum.PENDIENTE, EstadoCuotaEnum.PARCIAL, EstadoCuotaEnum.VENCIDA],
            },
          },
          data: {
            estado: EstadoCuotaEnum.CASTIGADA,
            // Nota: tbl_cuota no tiene campo observaciones en el schema
          },
        });

        cuotasCanceladas += resultadoCuotas.count;

        // Registrar auditoría por cuotas canceladas
        if (resultadoCuotas.count > 0) {
          await tx.tbl_auditoria.create({
            data: {
              idusuario: datos.idusuario,
              entidad: ENTIDADES_SISTEMA.CUOTA,
              entidadId: null, // Operación masiva
              accion: ACCIONES_AUDITORIA.CANCELAR_CUOTAS_CASTIGO,
              detalle: `${resultadoCuotas.count} cuotas canceladas por castigo del préstamo ${prestamo.codigo}. Motivo: ${datos.motivo}`,
            },
          });
        }
      }

      // 3. Actualizar estado del préstamo a CASTIGADO
      const prestamoActualizado = await prestamoRepo.update({
        where: { idprestamo },
        data: {
          estado: EstadoPrestamoEnum.CASTIGADO,
          observaciones: `Préstamo castigado el ${fechaCastigo.toISOString()}. Motivo: ${datos.motivo}. ${datos.observaciones || ""} ${prestamo.observaciones || ""}`.trim(),
        },
      });

      // 4. Crear registro de castigo
      const castigo = await tx.tbl_castigo.create({
        data: {
          idprestamo,
          motivo: datos.motivo,
          observaciones: datos.observaciones,
          fechaCastigo: fechaCastigo,
          idusuario: datos.idusuario,
        },
      });

      castigosCreados.push(castigo);

      // 5. Registrar auditoría
      await tx.tbl_auditoria.create({
        data: {
          idusuario: datos.idusuario,
          entidad: ENTIDADES_SISTEMA.PRESTAMO,
          entidadId: idprestamo,
          accion: ACCIONES_AUDITORIA.CASTIGAR_CARTERA,
          detalle: `Préstamo ${prestamo.codigo} castigado. Motivo: ${datos.motivo}. ${yaCastigado ? "Recastigado" : ""}`,
        },
      });

      await tx.tbl_auditoria.create({
        data: {
          idusuario: datos.idusuario,
          entidad: ENTIDADES_SISTEMA.CASTIGO,
          entidadId: castigo.idcastigo,
          accion: ACCIONES_AUDITORIA.CREAR_CASTIGO,
          detalle: `Castigo creado para préstamo ${prestamo.codigo}. Motivo: ${datos.motivo}`,
        },
      });
    } catch (error) {
      // En versión masiva, continuar con el siguiente préstamo si hay error
      // El error se propagará si es crítico
      throw error;
    }
  }

  return {
    castigosCreados,
    prestamosCastigados: castigosCreados.length,
    cuotasCanceladas,
  };
}

/**
 * CASTIGA UN PRÉSTAMO INDIVIDUAL CON VALIDACIONES COMPLETAS Y LOCKS
 * 
 * Esta función:
 * 1. Valida permisos
 * 2. Adquiere lock sobre el préstamo
 * 3. Valida que el préstamo puede ser castigado
 * 4. Cancela todas las cuotas pendientes
 * 5. Actualiza estado del préstamo a CASTIGADO
 * 6. Crea registro de castigo
 * 7. Registra auditoría completa
 * 
 * @param datos Datos del castigo
 * @returns Resultado con castigo y préstamo actualizado
 */
export async function castigarPrestamo(
  datos: DatosCastigoPrestamo
): Promise<ResultadoCastigoPrestamo> {
  // Validar permisos
  if (datos.idusuario) {
    await requerirPermiso(datos.idusuario, "ADMIN_SISTEMA");
  }

  // Validaciones básicas
  if (
    !datos.motivo ||
    datos.motivo.trim().length < CASTIGO_RULES.MOTIVO_MIN_LENGTH
  ) {
    throw new Error("El motivo del castigo es obligatorio");
  }

  if (datos.motivo.trim().length > CASTIGO_RULES.MOTIVO_MAX_LENGTH) {
    throw new Error(
      `El motivo del castigo no puede exceder ${CASTIGO_RULES.MOTIVO_MAX_LENGTH} caracteres`
    );
  }

  const fechaCastigo = datos.fechaCastigo || new Date();

  return await conLock(
    "PRESTAMO",
    datos.idprestamo,
    async () => {
      return await prisma.$transaction(
        async (tx) => {
          // Crear repositorios para esta transacción
          const prestamoRepo = new PrestamoRepository(tx);
          const cuotaRepo = new CuotaRepository(tx);

          // 1. Validar préstamo
          const prestamoAntes = await validarPrestamoParaCastigo(
            prestamoRepo,
            datos.idprestamo,
            false
          );

          // 2. Cancelar cuotas pendientes
          const resultadoCancelacion = await cuotaRepo.updateMany({
            where: {
              idprestamo: datos.idprestamo,
              estado: {
                in: [
                  EstadoCuotaEnum.PENDIENTE,
                  EstadoCuotaEnum.PARCIAL,
                  EstadoCuotaEnum.VENCIDA,
                ],
              },
            },
            data: {
              estado: EstadoCuotaEnum.CASTIGADA,
            },
          });

          // 3. Actualizar estado del préstamo
          const prestamoCastigado = await prestamoRepo.update({
            where: { idprestamo: datos.idprestamo },
            data: {
              estado: EstadoPrestamoEnum.CASTIGADO,
              observaciones: `Préstamo castigado el ${fechaCastigo.toISOString()}. Motivo: ${datos.motivo}. ${prestamoAntes.observaciones || ""}`,
            },
          });

          // 4. Crear registro de castigo
          const castigo = await tx.tbl_castigo.create({
            data: {
              idprestamo: datos.idprestamo,
              motivo: datos.motivo,
              observaciones: datos.observaciones,
              fechaCastigo,
              idusuario: datos.idusuario,
            },
          });

          // 5. Registrar auditoría
          await tx.tbl_auditoria.create({
            data: {
              idusuario: datos.idusuario,
              entidad: ENTIDADES_SISTEMA.CASTIGO,
              entidadId: castigo.idcastigo,
              accion: ACCIONES_AUDITORIA.CASTIGAR_PRESTAMO,
              detalle: `Préstamo ${prestamoAntes.codigo} castigado. Motivo: ${datos.motivo}. Cuotas canceladas: ${resultadoCancelacion.count}`,
              ip: datos.ip || null,
              userAgent: datos.userAgent || null,
            },
          });

          return {
            castigo,
            prestamoCastigado,
            cuotasCanceladas: resultadoCancelacion.count,
          };
        },
        {
          maxWait: TRANSACTION_CONFIG.MAX_WAIT,
          timeout: TRANSACTION_CONFIG.TIMEOUT,
        }
      );
    },
    {
      idusuario: datos.idusuario || null,
      descripcion: `Castigo del préstamo ${datos.idprestamo}`,
      timeoutSegundos: LOCK_CONFIG.TIMEOUT_DEFAULT,
    }
  );
}

/**
 * Verifica si un préstamo está castigado
 * 
 * @param tx Cliente de transacción Prisma
 * @param idprestamo ID del préstamo
 * @returns true si está castigado
 */
export async function estaPrestamoCastigado(
  tx: Prisma.TransactionClient,
  idprestamo: number
): Promise<boolean> {
  const prestamoRepo = new PrestamoRepository(tx);
  const prestamo = await prestamoRepo.findUnique({
    where: { idprestamo },
    include: undefined,
  });

  return prestamo?.estado === EstadoPrestamoEnum.CASTIGADO;
}

/**
 * Valida si un pago puede ser registrado para un préstamo castigado
 * Solo se permiten pagos judiciales para préstamos castigados
 * 
 * @param metodoPago Método de pago
 * @param estaCastigado Si el préstamo está castigado
 * @throws Error si el pago no es válido
 */
export function validarPagoPrestamoCastigado(
  metodoPago: string,
  estaCastigado: boolean
): void {
  if (!estaCastigado) {
    return; // No hay restricción si no está castigado
  }

  if (!METODOS_PAGO_JUDICIALES.includes(metodoPago.toUpperCase() as typeof METODOS_PAGO_JUDICIALES[number])) {
    throw new Error(
      `Los préstamos castigados solo permiten pagos judiciales. Métodos permitidos: ${METODOS_PAGO_JUDICIALES.join(", ")}. Método proporcionado: ${metodoPago}`
    );
  }
}




