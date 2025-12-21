/**
 * SERVICIO DE REFINANCIAMIENTO - SEGURO Y TRANSACCIONAL
 * 
 * Este servicio refinancia préstamos con todas las garantías:
 * - Transacciones atómicas
 * - Cálculo correcto de saldo pendiente
 * - Cancelación de cuotas pendientes
 * - Creación de nuevo préstamo
 * - Auditoría completa
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EstadoPrestamoEnum,
  EstadoCuotaEnum,
  TipoPrestamoEnum,
} from "@prisma/client";
import { conLock } from "@/lib/locks/lock-service";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { crearPrestamoConCuotas } from "../graphql/resolvers/finanzas/transactions";

export interface DatosRefinanciamiento {
  idprestamoOriginal: number;
  idusuarioSolicitante: number | null;
  idusuarioAutorizador: number | null;
  motivo: string;
  observaciones?: string | null;
  evidencia?: string | null;
  nuevoPrestamo: {
    codigo: string;
    referencia?: string | null;
    tipoprestamo: TipoPrestamoEnum;
    montoSolicitado: number;
    montoAprobado?: number | null;
    montoDesembolsado?: number | null;
    tasaInteresAnual: number;
    plazoMeses: number;
    fechaSolicitud?: Date | null;
    fechaAprobacion?: Date | null;
    fechaDesembolso?: Date | null;
    fechaVencimiento?: Date | null;
    observaciones?: string | null;
    diaPago?: number;
  };
  ip?: string | null;
  userAgent?: string | null;
}

export interface ResultadoRefinanciamiento {
  reestructuracion: any;
  prestamoOriginal: any;
  nuevoPrestamo: any;
  cuotasCanceladas: number;
  cuotasGeneradas: number;
  saldoTrasladado: {
    capital: number;
    interes: number;
    mora: number;
    total: number;
  };
}

/**
 * Calcula el saldo pendiente del préstamo original
 */
async function calcularSaldoPendiente(
  tx: Prisma.TransactionClient,
  idprestamo: number
): Promise<{
  capital: number;
  interes: number;
  mora: number;
  total: number;
}> {
  const cuotas = await tx.tbl_cuota.findMany({
    where: {
      idprestamo,
      deletedAt: null,
      estado: {
        in: [
          EstadoCuotaEnum.PENDIENTE,
          EstadoCuotaEnum.PARCIAL,
          EstadoCuotaEnum.VENCIDA,
        ],
      },
    },
  });

  const capital = cuotas.reduce(
    (sum, c) => sum + Number(c.capitalProgramado) - Number(c.capitalPagado),
    0
  );
  const interes = cuotas.reduce(
    (sum, c) => sum + Number(c.interesProgramado) - Number(c.interesPagado),
    0
  );
  const mora = cuotas.reduce(
    (sum, c) => sum + Number(c.moraProgramada) - Number(c.moraPagada),
    0
  );

  return {
    capital,
    interes,
    mora,
    total: capital + interes + mora,
  };
}

/**
 * REFINANCIA UN PRÉSTAMO CON VALIDACIONES COMPLETAS
 * 
 * Esta función:
 * 1. Valida permisos de ambos usuarios
 * 2. Adquiere lock sobre el préstamo original
 * 3. Valida que el préstamo puede ser refinanciado
 * 4. Calcula saldo pendiente
 * 5. Cancela cuotas pendientes del préstamo original
 * 6. Crea nuevo préstamo con el saldo trasladado
 * 7. Genera cuotas para el nuevo préstamo
 * 8. Crea registro de reestructuración
 * 9. Actualiza estado del préstamo original
 * 10. Registra auditoría completa
 * 
 * @param datos Datos del refinanciamiento
 * @returns Resultado con préstamos y reestructuración
 */
export async function refinanciarPrestamo(
  datos: DatosRefinanciamiento
): Promise<ResultadoRefinanciamiento> {
  // Validar permisos
  if (datos.idusuarioSolicitante) {
    await requerirPermiso(datos.idusuarioSolicitante, "RESTRUCTURE_LOAN");
  }
  if (datos.idusuarioAutorizador) {
    await requerirPermiso(datos.idusuarioAutorizador, "RESTRUCTURE_LOAN");
  }

  return await conLock(
    "PRESTAMO",
    datos.idprestamoOriginal,
    async () => {
      return await prisma.$transaction(
        async (tx) => {
          // 1. Validar préstamo original
          const prestamoOriginal = await tx.tbl_prestamo.findFirst({
            where: {
              idprestamo: datos.idprestamoOriginal,
              deletedAt: null,
            },
            include: {
              cliente: true,
              cuotas: {
                where: { deletedAt: null },
                orderBy: { numero: "asc" },
              },
            },
          });

          if (!prestamoOriginal) {
            throw new Error("Préstamo original no encontrado o eliminado");
          }

          if (prestamoOriginal.estado === EstadoPrestamoEnum.PAGADO) {
            throw new Error("No se puede refinanciar un préstamo ya pagado");
          }

          if (prestamoOriginal.estado === EstadoPrestamoEnum.CASTIGADO) {
            throw new Error("No se puede refinanciar un préstamo castigado");
          }

          // 2. Calcular saldo pendiente
          const saldoPendiente = await calcularSaldoPendiente(
            tx,
            datos.idprestamoOriginal
          );

          if (saldoPendiente.total <= 0) {
            throw new Error(
              "El préstamo no tiene saldo pendiente para refinanciar"
            );
          }

          // 3. Validar que el monto del nuevo préstamo cubra el saldo pendiente
          const montoNuevoPrestamo =
            datos.nuevoPrestamo.montoDesembolsado ||
            datos.nuevoPrestamo.montoAprobado ||
            datos.nuevoPrestamo.montoSolicitado;

          if (montoNuevoPrestamo < saldoPendiente.total) {
            throw new Error(
              `El monto del nuevo préstamo (${montoNuevoPrestamo.toFixed(2)}) debe ser al menos igual al saldo pendiente (${saldoPendiente.total.toFixed(2)})`
            );
          }

          // 4. Cancelar cuotas pendientes del préstamo original
          const cuotasPendientes = prestamoOriginal.cuotas.filter(
            (c) =>
              c.estado === EstadoCuotaEnum.PENDIENTE ||
              c.estado === EstadoCuotaEnum.PARCIAL ||
              c.estado === EstadoCuotaEnum.VENCIDA
          );

          const resultadoCancelacion = await tx.tbl_cuota.updateMany({
            where: {
              idprestamo: datos.idprestamoOriginal,
              estado: {
                in: [
                  EstadoCuotaEnum.PENDIENTE,
                  EstadoCuotaEnum.PARCIAL,
                  EstadoCuotaEnum.VENCIDA,
                ],
              },
              deletedAt: null,
            },
            data: {
              estado: EstadoCuotaEnum.REPROGRAMADA,
            },
          });

          // 5. Crear nuevo préstamo con el saldo trasladado
          const nuevoPrestamoData = {
            idcliente: prestamoOriginal.idcliente,
            idusuarioCreador: datos.idusuarioSolicitante,
            tipoprestamo: datos.nuevoPrestamo.tipoprestamo,
            codigo: datos.nuevoPrestamo.codigo,
            referencia: datos.nuevoPrestamo.referencia,
            montoSolicitado: montoNuevoPrestamo,
            montoAprobado:
              datos.nuevoPrestamo.montoAprobado || montoNuevoPrestamo,
            montoDesembolsado:
              datos.nuevoPrestamo.montoDesembolsado || montoNuevoPrestamo,
            tasaInteresAnual: datos.nuevoPrestamo.tasaInteresAnual,
            plazoMeses: datos.nuevoPrestamo.plazoMeses,
            fechaSolicitud:
              datos.nuevoPrestamo.fechaSolicitud || new Date(),
            fechaAprobacion: datos.nuevoPrestamo.fechaAprobacion,
            fechaDesembolso: datos.nuevoPrestamo.fechaDesembolso,
            fechaVencimiento: datos.nuevoPrestamo.fechaVencimiento,
            observaciones: `Refinanciamiento del préstamo ${prestamoOriginal.codigo}. ${datos.nuevoPrestamo.observaciones || ""}`,
            idusuarioGestor: prestamoOriginal.idusuarioGestor,
          };

          const { prestamo: nuevoPrestamo, cuotas: cuotasGeneradas } =
            await crearPrestamoConCuotas(tx, nuevoPrestamoData, {
              diaPago: datos.nuevoPrestamo.diaPago,
              generarCuotas: true,
            });

          // 6. Actualizar estado del préstamo original
          const prestamoOriginalActualizado = await tx.tbl_prestamo.update({
            where: { idprestamo: datos.idprestamoOriginal },
            data: {
              estado: EstadoPrestamoEnum.REFINANCIADO,
              observaciones: `Refinanciado el ${new Date().toISOString()}. Nuevo préstamo: ${datos.nuevoPrestamo.codigo}. Motivo: ${datos.motivo}. ${prestamoOriginal.observaciones || ""}`,
            },
          });

          // 7. Crear registro de reestructuración
          const reestructuracion = await tx.tbl_reestructuracion.create({
            data: {
              idprestamoOriginal: datos.idprestamoOriginal,
              idprestamoNuevo: nuevoPrestamo.idprestamo,
              idusuarioSolicitante: datos.idusuarioSolicitante,
              idusuarioAutorizador: datos.idusuarioAutorizador,
              motivo: datos.motivo,
              observaciones: datos.observaciones,
              evidencia: datos.evidencia,
              fechaReestructuracion: new Date(),
            },
          });

          // 8. Registrar auditoría completa
          await tx.tbl_auditoria.create({
            data: {
              idusuario: datos.idusuarioSolicitante,
              entidad: "tbl_reestructuracion",
              entidadId: reestructuracion.idreestructuracion,
              accion: "REFINANCIAR_PRESTAMO",
              detalle: `Préstamo ${prestamoOriginal.codigo} refinanciado. Nuevo préstamo: ${datos.nuevoPrestamo.codigo}. Saldo trasladado: ${saldoPendiente.total.toFixed(2)}. Cuotas canceladas: ${resultadoCancelacion.count}. Cuotas generadas: ${cuotasGeneradas.length}`,
              ip: datos.ip || null,
              userAgent: datos.userAgent || null,
            },
          });

          return {
            reestructuracion,
            prestamoOriginal: prestamoOriginalActualizado,
            nuevoPrestamo,
            cuotasCanceladas: resultadoCancelacion.count,
            cuotasGeneradas: cuotasGeneradas.length,
            saldoTrasladado: saldoPendiente,
          };
        },
        {
          maxWait: 15000,
          timeout: 30000, // 30 segundos para refinanciamiento
        }
      );
    },
    {
      idusuario: datos.idusuarioSolicitante || null,
      descripcion: `Refinanciamiento del préstamo ${datos.idprestamoOriginal}`,
      timeoutSegundos: 600, // 10 minutos para refinanciamiento
    }
  );
}

