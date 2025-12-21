/**
 * SERVICIO DE REESTRUCTURACIÓN DE PRÉSTAMOS
 * 
 * Este servicio implementa la lógica completa de reestructuración de préstamos,
 * incluyendo:
 * - Cálculo de saldo pendiente
 * - Traslado de saldo al nuevo préstamo
 * - Generación de nuevo cuadro de amortización
 * - Cancelación de cuotas pendientes
 * - Registro completo de auditoría
 * 
 * REQUISITOS:
 * - Crear préstamo nuevo basado en uno vencido
 * - Cancelar cuotas pendientes
 * - Trasladar saldo pendiente
 * - Generar nuevo cuadro de amortización
 * - Registrar motivo, usuario y evidencia
 * - Mantener histórico 100% trazable
 */

import { Prisma } from "@prisma/client";
import {
  EstadoPrestamoEnum,
  EstadoCuotaEnum,
  TipoPrestamoEnum,
} from "@prisma/client";
import { crearPrestamoConCuotas } from "../graphql/resolvers/finanzas/transactions";

export interface SaldoPendiente {
  capitalPendiente: number;
  interesPendiente: number;
  moraPendiente: number;
  totalPendiente: number;
  cuotasPendientes: number;
}

export interface DatosReestructuracion {
  idprestamoOriginal: number;
  idusuarioSolicitante?: number | null;
  idusuarioAutorizador?: number | null;
  motivo: string;
  observaciones?: string | null;
  evidencia?: string | null; // Ruta o referencia a documento de evidencia
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
    diaPago?: number; // Día del mes para pagos
  };
}

export interface ResultadoReestructuracion {
  reestructuracion: any;
  prestamoOriginal: any;
  nuevoPrestamo: any;
  cuotasCanceladas: number;
  cuotasGeneradas: number;
  saldoTrasladado: SaldoPendiente;
}

/**
 * Calcula el saldo pendiente de un préstamo
 * 
 * @param tx Cliente de transacción Prisma
 * @param idprestamo ID del préstamo
 * @returns Saldo pendiente desglosado
 */
export async function calcularSaldoPendiente(
  tx: Prisma.TransactionClient,
  idprestamo: number
): Promise<SaldoPendiente> {
  // Obtener todas las cuotas del préstamo
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

  let capitalPendiente = 0;
  let interesPendiente = 0;
  let moraPendiente = 0;

  for (const cuota of cuotas) {
    const capitalProg = Number(cuota.capitalProgramado);
    const capitalPag = Number(cuota.capitalPagado);
    const interesProg = Number(cuota.interesProgramado);
    const interesPag = Number(cuota.interesPagado);
    const moraProg = Number(cuota.moraProgramada);
    const moraPag = Number(cuota.moraPagada);

    capitalPendiente += Math.max(0, capitalProg - capitalPag);
    interesPendiente += Math.max(0, interesProg - interesPag);
    moraPendiente += Math.max(0, moraProg - moraPag);
  }

  return {
    capitalPendiente,
    interesPendiente,
    moraPendiente,
    totalPendiente: capitalPendiente + interesPendiente + moraPendiente,
    cuotasPendientes: cuotas.length,
  };
}

/**
 * Reestructura un préstamo completo
 * 
 * PROCESO:
 * 1. Validar préstamo original
 * 2. Calcular saldo pendiente
 * 3. Crear nuevo préstamo con saldo trasladado
 * 4. Generar nuevo cuadro de amortización
 * 5. Cancelar cuotas pendientes del préstamo original
 * 6. Actualizar estado del préstamo original
 * 7. Crear registro de reestructuración
 * 8. Registrar auditoría completa
 * 
 * @param tx Cliente de transacción Prisma
 * @param datos Datos de la reestructuración
 * @returns Resultado completo de la reestructuración
 */
export async function reestructurarPrestamo(
  tx: Prisma.TransactionClient,
  datos: DatosReestructuracion
): Promise<ResultadoReestructuracion> {
  // 1. Validar préstamo original
  const prestamoOriginal = await tx.tbl_prestamo.findUnique({
    where: { idprestamo: datos.idprestamoOriginal },
    include: {
      cliente: {
        select: {
          idcliente: true,
          primer_nombres: true,
          primer_apellido: true,
        },
      },
    },
  });

  if (!prestamoOriginal) {
    throw new Error("Préstamo original no encontrado");
  }

  if (prestamoOriginal.deletedAt) {
    throw new Error("El préstamo original está eliminado");
  }

  // Validar que el préstamo puede ser reestructurado
  if (
    prestamoOriginal.estado !== EstadoPrestamoEnum.EN_CURSO &&
    prestamoOriginal.estado !== EstadoPrestamoEnum.EN_MORA
  ) {
    throw new Error(
      `El préstamo debe estar en estado EN_CURSO o EN_MORA para ser reestructurado. Estado actual: ${prestamoOriginal.estado}`
    );
  }

  // 2. Calcular saldo pendiente del préstamo original
  const saldoPendiente = await calcularSaldoPendiente(
    tx,
    prestamoOriginal.idprestamo
  );

  // 3. Determinar monto del nuevo préstamo
  // Si no se especifica montoDesembolsado, usar el saldo pendiente total
  const montoNuevoPrestamo =
    datos.nuevoPrestamo.montoDesembolsado ||
    datos.nuevoPrestamo.montoAprobado ||
    datos.nuevoPrestamo.montoSolicitado ||
    saldoPendiente.totalPendiente;

  // Validar que el monto del nuevo préstamo cubra el saldo pendiente
  if (montoNuevoPrestamo < saldoPendiente.totalPendiente) {
    throw new Error(
      `El monto del nuevo préstamo (${montoNuevoPrestamo}) debe ser al menos igual al saldo pendiente (${saldoPendiente.totalPendiente.toFixed(2)})`
    );
  }

  // 4. Crear nuevo préstamo con cuotas
  const { prestamo: nuevoPrestamo, cuotas: cuotasGeneradas } =
    await crearPrestamoConCuotas(
      tx,
      {
        idcliente: prestamoOriginal.idcliente,
        idusuarioCreador:
          datos.idusuarioSolicitante || prestamoOriginal.idusuarioCreador,
        tipoprestamo: datos.nuevoPrestamo.tipoprestamo,
        codigo: datos.nuevoPrestamo.codigo,
        referencia: datos.nuevoPrestamo.referencia,
        montoSolicitado: datos.nuevoPrestamo.montoSolicitado,
        montoAprobado:
          datos.nuevoPrestamo.montoAprobado || montoNuevoPrestamo,
        montoDesembolsado: montoNuevoPrestamo,
        tasaInteresAnual: datos.nuevoPrestamo.tasaInteresAnual,
        plazoMeses: datos.nuevoPrestamo.plazoMeses,
        fechaSolicitud:
          datos.nuevoPrestamo.fechaSolicitud || new Date(),
        fechaAprobacion: datos.nuevoPrestamo.fechaAprobacion,
        fechaDesembolso: datos.nuevoPrestamo.fechaDesembolso,
        fechaVencimiento: datos.nuevoPrestamo.fechaVencimiento,
        observaciones:
          datos.nuevoPrestamo.observaciones ||
          `Reestructuración de préstamo ${prestamoOriginal.codigo}. Saldo trasladado: ${saldoPendiente.totalPendiente.toFixed(2)}. Motivo: ${datos.motivo}`,
      },
      {
        diaPago: datos.nuevoPrestamo.diaPago || 1,
        generarCuotas: true,
      }
    );

  // 5. Cancelar cuotas pendientes del préstamo original
  const cuotasPendientes = await tx.tbl_cuota.findMany({
    where: {
      idprestamo: prestamoOriginal.idprestamo,
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

  let cuotasCanceladas = 0;
  for (const cuota of cuotasPendientes) {
    await tx.tbl_cuota.update({
      where: { idcuota: cuota.idcuota },
      data: {
        estado: EstadoCuotaEnum.ANULADA,
        // Nota: tbl_cuota no tiene campo observaciones en el schema
      },
    });

    // Registrar auditoría por cuota cancelada
    await tx.tbl_auditoria.create({
      data: {
        idusuario: datos.idusuarioSolicitante || prestamoOriginal.idusuarioCreador,
        entidad: "tbl_cuota",
        entidadId: cuota.idcuota,
        accion: "CANCELAR_CUOTA_REESTRUCTURACION",
        detalle: `Cuota ${cuota.numero} cancelada por reestructuración. Nuevo préstamo: ${nuevoPrestamo.codigo}`,
      },
    });

    cuotasCanceladas++;
  }

  // 6. Actualizar estado del préstamo original
  await tx.tbl_prestamo.update({
    where: { idprestamo: prestamoOriginal.idprestamo },
    data: {
      estado: EstadoPrestamoEnum.REFINANCIADO,
      observaciones: `Reestructurado. Nuevo préstamo: ${nuevoPrestamo.codigo}. Saldo trasladado: ${saldoPendiente.totalPendiente.toFixed(2)}. Motivo: ${datos.motivo}. ${prestamoOriginal.observaciones || ""}`,
    },
  });

  // 7. Crear registro de reestructuración
  const reestructuracion = await tx.tbl_reestructuracion.create({
    data: {
      idprestamoOriginal: prestamoOriginal.idprestamo,
      idprestamoNuevo: nuevoPrestamo.idprestamo,
      idusuarioSolicitante:
        datos.idusuarioSolicitante || prestamoOriginal.idusuarioCreador,
      idusuarioAutorizador: datos.idusuarioAutorizador,
      motivo: datos.motivo,
      observaciones: datos.observaciones,
      evidencia: datos.evidencia, // Ruta o referencia a documento de evidencia
      fechaReestructuracion: new Date(),
    },
  });

  // 8. Registrar auditoría completa
  // Auditoría de reestructuración
  await tx.tbl_auditoria.create({
    data: {
      idusuario: datos.idusuarioSolicitante || prestamoOriginal.idusuarioCreador,
      entidad: "tbl_reestructuracion",
      entidadId: reestructuracion.idreestructuracion,
      accion: "CREAR_REESTRUCTURACION",
      detalle: `Reestructuración de préstamo ${prestamoOriginal.codigo} a ${nuevoPrestamo.codigo}. Motivo: ${datos.motivo}. Saldo trasladado: Capital: ${saldoPendiente.capitalPendiente.toFixed(2)}, Interés: ${saldoPendiente.interesPendiente.toFixed(2)}, Mora: ${saldoPendiente.moraPendiente.toFixed(2)}, Total: ${saldoPendiente.totalPendiente.toFixed(2)}. Cuotas canceladas: ${cuotasCanceladas}. Cuotas generadas: ${cuotasGeneradas.length}. Evidencia: ${datos.evidencia || "No especificada"}`,
    },
  });

  // Auditoría del préstamo original
  await tx.tbl_auditoria.create({
    data: {
      idusuario: datos.idusuarioSolicitante || prestamoOriginal.idusuarioCreador,
      entidad: "tbl_prestamo",
      entidadId: prestamoOriginal.idprestamo,
      accion: "REESTRUCTURAR_PRESTAMO",
      detalle: `Préstamo reestructurado. Nuevo préstamo: ${nuevoPrestamo.codigo}. Estado cambiado a REFINANCIADO. Saldo pendiente trasladado: ${saldoPendiente.totalPendiente.toFixed(2)}. Motivo: ${datos.motivo}. Usuario solicitante: ${datos.idusuarioSolicitante || prestamoOriginal.idusuarioCreador}. Usuario autorizador: ${datos.idusuarioAutorizador || "No especificado"}`,
    },
  });

  // Auditoría del nuevo préstamo
  await tx.tbl_auditoria.create({
    data: {
      idusuario: datos.idusuarioSolicitante || prestamoOriginal.idusuarioCreador,
      entidad: "tbl_prestamo",
      entidadId: nuevoPrestamo.idprestamo,
      accion: "CREAR_PRESTAMO_REESTRUCTURACION",
      detalle: `Nuevo préstamo creado por reestructuración de ${prestamoOriginal.codigo}. Saldo trasladado: ${saldoPendiente.totalPendiente.toFixed(2)}. Desglose: Capital: ${saldoPendiente.capitalPendiente.toFixed(2)}, Interés: ${saldoPendiente.interesPendiente.toFixed(2)}, Mora: ${saldoPendiente.moraPendiente.toFixed(2)}. Cuotas generadas: ${cuotasGeneradas.length}. Motivo: ${datos.motivo}`,
    },
  });

  return {
    reestructuracion,
    prestamoOriginal,
    nuevoPrestamo,
    cuotasCanceladas,
    cuotasGeneradas: cuotasGeneradas.length,
    saldoTrasladado: saldoPendiente,
  };
}

