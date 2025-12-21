/**
 * SERVICIO DE CREACIÓN DE ACUERDOS - SEGURO Y TRANSACCIONAL
 * 
 * Este servicio crea acuerdos de pago con todas las garantías:
 * - Transacciones atómicas
 * - Validación de préstamo activo
 * - Validación de montos
 * - Validación de fechas
 * - Auditoría completa
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EstadoPrestamoEnum,
  TipoAcuerdoEnum,
  EstadoAcuerdoEnum,
} from "@prisma/client";
import { conLock } from "@/lib/locks/lock-service";
import { requerirPermiso } from "@/lib/permissions/permission-service";

export interface DatosCreacionAcuerdo {
  idprestamo: number;
  idusuario: number | null;
  tipoAcuerdo: TipoAcuerdoEnum;
  montoAcordado: number;
  numeroCuotas: number;
  fechaInicio: Date;
  fechaFin: Date;
  fechasPagoProgramadas?: string[]; // Array de fechas en formato ISO string
  observacion?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface ResultadoCreacionAcuerdo {
  acuerdo: any;
  prestamo: any;
}

/**
 * Valida que el préstamo puede tener un acuerdo
 */
async function validarPrestamoParaAcuerdo(
  tx: Prisma.TransactionClient,
  idprestamo: number
): Promise<any> {
  const prestamo = await tx.tbl_prestamo.findFirst({
    where: { idprestamo, deletedAt: null },
    include: {
      cuotas: {
        where: { deletedAt: null },
        orderBy: { numero: "asc" },
      },
    },
  });

  if (!prestamo) {
    throw new Error("Préstamo no encontrado o eliminado");
  }

  if (
    prestamo.estado === EstadoPrestamoEnum.PAGADO ||
    prestamo.estado === EstadoPrestamoEnum.CANCELADO
  ) {
    throw new Error(
      `No se pueden crear acuerdos para préstamos con estado ${prestamo.estado}`
    );
  }

  // Calcular saldo pendiente
  const saldoCapital = prestamo.cuotas.reduce(
    (sum, c) => sum + Number(c.capitalProgramado) - Number(c.capitalPagado),
    0
  );
  const saldoInteres = prestamo.cuotas.reduce(
    (sum, c) => sum + Number(c.interesProgramado) - Number(c.interesPagado),
    0
  );
  const saldoMora = prestamo.cuotas.reduce(
    (sum, c) => sum + Number(c.moraProgramada) - Number(c.moraPagada),
    0
  );
  const saldoTotal = saldoCapital + saldoInteres + saldoMora;

  return { prestamo, saldoTotal };
}

/**
 * Valida que no haya acuerdos activos conflictivos
 */
async function validarAcuerdosExistentes(
  tx: Prisma.TransactionClient,
  idprestamo: number,
  fechaInicio: Date,
  fechaFin: Date
): Promise<void> {
  const acuerdosActivos = await tx.tbl_acuerdo.findMany({
    where: {
      idprestamo,
      estado: EstadoAcuerdoEnum.ACTIVO,
      deletedAt: null,
      OR: [
        {
          AND: [
            { fechaInicio: { lte: fechaFin } },
            { fechaFin: { gte: fechaInicio } },
          ],
        },
      ],
    },
  });

  if (acuerdosActivos.length > 0) {
    throw new Error(
      `Ya existe un acuerdo activo para este préstamo en el período especificado. Acuerdo ID: ${acuerdosActivos[0].idacuerdo}`
    );
  }
}

/**
 * CREA UN ACUERDO DE PAGO CON VALIDACIONES COMPLETAS
 * 
 * Esta función:
 * 1. Valida permisos
 * 2. Adquiere lock sobre el préstamo
 * 3. Valida que el préstamo existe y puede tener acuerdos
 * 4. Valida que no haya acuerdos activos conflictivos
 * 5. Valida que el monto acordado no exceda el saldo pendiente
 * 6. Valida que las fechas sean válidas
 * 7. Crea el acuerdo en transacción
 * 8. Registra auditoría
 * 
 * @param datos Datos del acuerdo a crear
 * @returns Resultado con acuerdo creado
 */
export async function crearAcuerdo(
  datos: DatosCreacionAcuerdo
): Promise<ResultadoCreacionAcuerdo> {
  // Validar permisos
  if (datos.idusuario) {
    await requerirPermiso(datos.idusuario, "CREAR_ACUERDO");
  }

  // Validaciones básicas
  if (datos.montoAcordado <= 0) {
    throw new Error("El monto acordado debe ser mayor a cero");
  }

  if (datos.numeroCuotas <= 0) {
    throw new Error("El número de cuotas debe ser mayor a cero");
  }

  if (datos.fechaFin <= datos.fechaInicio) {
    throw new Error("La fecha de fin debe ser posterior a la fecha de inicio");
  }

  if (datos.fechaInicio < new Date()) {
    throw new Error("La fecha de inicio no puede ser anterior a hoy");
  }

  return await conLock(
    "PRESTAMO",
    datos.idprestamo,
    async () => {
      return await prisma.$transaction(
        async (tx) => {
          // 1. Validar préstamo y calcular saldo
          const { prestamo, saldoTotal } = await validarPrestamoParaAcuerdo(
            tx,
            datos.idprestamo
          );

          // 2. Validar que el monto acordado no exceda el saldo pendiente
          if (datos.montoAcordado > saldoTotal) {
            throw new Error(
              `El monto acordado (${datos.montoAcordado.toFixed(2)}) excede el saldo pendiente (${saldoTotal.toFixed(2)})`
            );
          }

          // 3. Validar acuerdos existentes
          await validarAcuerdosExistentes(
            tx,
            datos.idprestamo,
            datos.fechaInicio,
            datos.fechaFin
          );

          // 4. Preparar fechas de pago programadas
          const fechasPagoProgramadas = datos.fechasPagoProgramadas
            ? JSON.stringify(datos.fechasPagoProgramadas)
            : null;

          // 5. Crear acuerdo
          const acuerdo = await tx.tbl_acuerdo.create({
            data: {
              idprestamo: datos.idprestamo,
              idusuario: datos.idusuario ?? null,
              tipoAcuerdo: datos.tipoAcuerdo,
              estado: EstadoAcuerdoEnum.ACTIVO,
              montoAcordado: new Prisma.Decimal(datos.montoAcordado),
              numeroCuotas: datos.numeroCuotas,
              fechasPagoProgramadas,
              fechaInicio: datos.fechaInicio,
              fechaFin: datos.fechaFin,
              observacion: datos.observacion ?? null,
            },
          });

          // 6. Registrar auditoría
          await tx.tbl_auditoria.create({
            data: {
              idusuario: datos.idusuario,
              entidad: "tbl_acuerdo",
              entidadId: acuerdo.idacuerdo,
              accion: "CREAR_ACUERDO",
              detalle: `Acuerdo ${datos.tipoAcuerdo} creado para préstamo ${prestamo.codigo}. Monto: ${datos.montoAcordado.toFixed(2)}, Cuotas: ${datos.numeroCuotas}`,
              ip: datos.ip || null,
              userAgent: datos.userAgent || null,
            },
          });

          return {
            acuerdo,
            prestamo,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );
    },
    {
      idusuario: datos.idusuario || null,
      descripcion: `Creación de acuerdo para préstamo ${datos.idprestamo}`,
      timeoutSegundos: 300,
    }
  );
}

