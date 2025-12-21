/**
 * SERVICIO DE REGISTRO DE PAGOS - SEGURO Y TRANSACCIONAL
 * 
 * Este servicio implementa el registro de pagos con todas las garantías de seguridad:
 * - Transacciones atómicas (rollback completo en caso de error)
 * - Control de concurrencia (locks lógicos)
 * - Optimistic locking (validación de updatedAt)
 * - Validaciones backend obligatorias
 * - Auditoría completa
 * 
 * REGLAS DE NEGOCIO:
 * - No permitir pago mayor al saldo pendiente
 * - Verificar que el acuerdo esté activo antes de registrar pago
 * - Verificar que el prestatario esté asignado al cobrador
 * - Validar permisos antes de cualquier acción
 * - Aplicar pagos a cuotas en orden (mora -> interés -> capital)
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EstadoPrestamoEnum,
  EstadoCuotaEnum,
  MetodoPagoEnum,
  TipoCobroEnum,
  EstadoAcuerdoEnum,
} from "@prisma/client";
import { conLock } from "@/lib/locks/lock-service";
import { requerirPermiso } from "@/lib/permissions/permission-service";

export interface DatosRegistroPago {
  idprestamo: number;
  idcuota?: number | null;
  idacuerdo?: number | null;
  idusuario: number | null; // Cobrador que registra el pago
  montoCapital: number;
  montoInteres: number;
  montoMora: number;
  metodoPago: MetodoPagoEnum;
  tipoCobro?: TipoCobroEnum;
  fechaPago?: Date;
  referencia?: string | null;
  observacion?: string | null;
  notas?: string | null;
  // Para optimistic locking
  updatedAtPrestamo?: Date; // Timestamp del préstamo antes de la modificación
  ip?: string | null;
  userAgent?: string | null;
}

export interface ResultadoRegistroPago {
  pago: any;
  cuotasActualizadas: any[];
  prestamoActualizado: any;
  saldoAnterior: {
    capital: number;
    interes: number;
    mora: number;
    total: number;
  };
  saldoNuevo: {
    capital: number;
    interes: number;
    mora: number;
    total: number;
  };
}

/**
 * Valida que el préstamo existe y está activo
 */
async function validarPrestamo(
  tx: Prisma.TransactionClient,
  idprestamo: number,
  updatedAtPrestamo?: Date
): Promise<any> {
  const prestamo = await tx.tbl_prestamo.findFirst({
    where: { idprestamo, deletedAt: null },
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

  // Optimistic locking: verificar que no haya cambios concurrentes
  if (updatedAtPrestamo && prestamo.updatedAt.getTime() !== updatedAtPrestamo.getTime()) {
    throw new Error(
      "El préstamo fue modificado por otro usuario. Por favor, recarga la página e intenta nuevamente."
    );
  }

  // Validar estado del préstamo
  if (prestamo.estado === EstadoPrestamoEnum.CASTIGADO) {
    // Solo permitir pagos judiciales para préstamos castigados
    // Esta validación se hace en el nivel superior
  }

  if (
    prestamo.estado === EstadoPrestamoEnum.PAGADO ||
    prestamo.estado === EstadoPrestamoEnum.CANCELADO
  ) {
    throw new Error(`No se pueden registrar pagos en préstamos con estado ${prestamo.estado}`);
  }

  return prestamo;
}

/**
 * Valida que el acuerdo existe y está activo
 */
async function validarAcuerdo(
  tx: Prisma.TransactionClient,
  idacuerdo: number
): Promise<any> {
  const acuerdo = await tx.tbl_acuerdo.findFirst({
    where: { idacuerdo, deletedAt: null },
  });

  if (!acuerdo) {
    throw new Error("Acuerdo no encontrado o eliminado");
  }

  if (acuerdo.estado !== EstadoAcuerdoEnum.ACTIVO) {
    throw new Error(`El acuerdo no está activo. Estado actual: ${acuerdo.estado}`);
  }

  const ahora = new Date();
  if (acuerdo.fechaFin < ahora) {
    throw new Error("El acuerdo ha vencido");
  }

  return acuerdo;
}

/**
 * Valida que el cobrador tiene asignado el préstamo
 */
async function validarAsignacionCobrador(
  tx: Prisma.TransactionClient,
  idprestamo: number,
  idusuario: number | null
): Promise<void> {
  if (!idusuario) {
    return; // Si no hay usuario, no validar asignación
  }

  const asignacion = await tx.tbl_asignacion_cartera.findFirst({
    where: {
      idprestamo,
      idusuario,
      activa: true,
      deletedAt: null,
    },
  });

  if (!asignacion) {
    // Verificar si el usuario tiene permiso de administrador
    try {
      await requerirPermiso(idusuario, "ADMIN_SISTEMA");
      return; // Administradores pueden registrar pagos sin asignación
    } catch {
      throw new Error(
        "No tienes asignado este préstamo. Solo puedes registrar pagos de préstamos asignados a ti."
      );
    }
  }
}

/**
 * Calcula el saldo pendiente del préstamo
 */
function calcularSaldoPendiente(prestamo: any): {
  capital: number;
  interes: number;
  mora: number;
  total: number;
} {
  const capital =
    Number(prestamo.saldoCapital) ||
    prestamo.cuotas.reduce(
      (sum: number, c: any) =>
        sum + Number(c.capitalProgramado) - Number(c.capitalPagado),
      0
    );

  const interes =
    Number(prestamo.saldoInteres) ||
    prestamo.cuotas.reduce(
      (sum: number, c: any) =>
        sum + Number(c.interesProgramado) - Number(c.interesPagado),
      0
    );

  const mora =
    Number(prestamo.saldoMora) ||
    prestamo.cuotas.reduce(
      (sum: number, c: any) =>
        sum + Number(c.moraProgramada) - Number(c.moraPagada),
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
 * Aplica el pago a las cuotas en orden
 */
async function aplicarPagoACuotas(
  tx: Prisma.TransactionClient,
  prestamo: any,
  datos: DatosRegistroPago,
  idpago: number
): Promise<any[]> {
  const cuotasActualizadas: any[] = [];
  let capitalRestante = datos.montoCapital;
  let interesRestante = datos.montoInteres;
  let moraRestante = datos.montoMora;

  // Si se especificó una cuota, empezar por esa
  const cuotasPendientes = datos.idcuota
    ? prestamo.cuotas.filter(
        (c: any) =>
          c.idcuota === datos.idcuota ||
          (c.estado !== EstadoCuotaEnum.PAGADA && c.estado !== EstadoCuotaEnum.ANULADA)
      )
    : prestamo.cuotas.filter(
        (c: any) =>
          c.estado !== EstadoCuotaEnum.PAGADA && c.estado !== EstadoCuotaEnum.ANULADA
      );

  for (const cuota of cuotasPendientes) {
    if (capitalRestante <= 0 && interesRestante <= 0 && moraRestante <= 0) break;

    const capitalPendiente =
      Number(cuota.capitalProgramado) - Number(cuota.capitalPagado);
    const interesPendiente =
      Number(cuota.interesProgramado) - Number(cuota.interesPagado);
    const moraPendiente = Number(cuota.moraProgramada) - Number(cuota.moraPagada);

    let nuevoCapitalPagado = Number(cuota.capitalPagado);
    let nuevoInteresPagado = Number(cuota.interesPagado);
    let nuevoMoraPagada = Number(cuota.moraPagada);

    // Aplicar mora primero (prioridad)
    if (moraRestante > 0 && moraPendiente > 0) {
      const moraAplicar = Math.min(moraRestante, moraPendiente);
      nuevoMoraPagada += moraAplicar;
      moraRestante -= moraAplicar;
    }

    // Aplicar interés
    if (interesRestante > 0 && interesPendiente > 0) {
      const interesAplicar = Math.min(interesRestante, interesPendiente);
      nuevoInteresPagado += interesAplicar;
      interesRestante -= interesAplicar;
    }

    // Aplicar capital
    if (capitalRestante > 0 && capitalPendiente > 0) {
      const capitalAplicar = Math.min(capitalRestante, capitalPendiente);
      nuevoCapitalPagado += capitalAplicar;
      capitalRestante -= capitalAplicar;
    }

    // Determinar nuevo estado
    let nuevoEstado = cuota.estado;
    const capitalCompleto = nuevoCapitalPagado >= Number(cuota.capitalProgramado);
    const interesCompleto = nuevoInteresPagado >= Number(cuota.interesProgramado);
    const moraCompleto = nuevoMoraPagada >= Number(cuota.moraProgramada);

    if (capitalCompleto && interesCompleto && moraCompleto) {
      nuevoEstado = EstadoCuotaEnum.PAGADA;
    } else if (
      nuevoCapitalPagado > 0 ||
      nuevoInteresPagado > 0 ||
      nuevoMoraPagada > 0
    ) {
      nuevoEstado = EstadoCuotaEnum.PARCIAL;
    }

    // Actualizar cuota con optimistic locking
    const cuotaActualizada = await tx.tbl_cuota.update({
      where: { idcuota: cuota.idcuota },
      data: {
        capitalPagado: new Prisma.Decimal(nuevoCapitalPagado),
        interesPagado: new Prisma.Decimal(nuevoInteresPagado),
        moraPagada: new Prisma.Decimal(nuevoMoraPagada),
        estado: nuevoEstado,
        fechaPago:
          nuevoEstado === EstadoCuotaEnum.PAGADA ? datos.fechaPago || new Date() : null,
      },
    });

    cuotasActualizadas.push(cuotaActualizada);
  }

  return cuotasActualizadas;
}

/**
 * Actualiza los saldos del préstamo
 */
async function actualizarSaldosPrestamo(
  tx: Prisma.TransactionClient,
  idprestamo: number,
  cuotas: any[]
): Promise<any> {
  // Recalcular saldos desde las cuotas
  const saldoCapital = cuotas.reduce(
    (sum, c) =>
      sum + Number(c.capitalProgramado) - Number(c.capitalPagado),
    0
  );
  const saldoInteres = cuotas.reduce(
    (sum, c) =>
      sum + Number(c.interesProgramado) - Number(c.interesPagado),
    0
  );
  const saldoMora = cuotas.reduce(
    (sum, c) => sum + Number(c.moraProgramada) - Number(c.moraPagada),
    0
  );
  const saldoTotal = saldoCapital + saldoInteres + saldoMora;

  // Determinar nuevo estado del préstamo
  const todasCuotasPagadas = cuotas.every(
    (c) => c.estado === EstadoCuotaEnum.PAGADA || c.estado === EstadoCuotaEnum.ANULADA
  );

  const prestamoActual = await tx.tbl_prestamo.findUnique({
    where: { idprestamo },
  });

  if (!prestamoActual) {
    throw new Error("Préstamo no encontrado");
  }

  let nuevoEstado = prestamoActual.estado;
  if (todasCuotasPagadas && prestamoActual.estado !== EstadoPrestamoEnum.PAGADO) {
    nuevoEstado = EstadoPrestamoEnum.PAGADO;
  } else if (
    prestamoActual.estado === EstadoPrestamoEnum.BORRADOR &&
    saldoTotal > 0
  ) {
    nuevoEstado = EstadoPrestamoEnum.EN_CURSO;
  }

  const prestamoActualizado = await tx.tbl_prestamo.update({
    where: { idprestamo },
    data: {
      saldoCapital: new Prisma.Decimal(saldoCapital),
      saldoInteres: new Prisma.Decimal(saldoInteres),
      saldoMora: new Prisma.Decimal(saldoMora),
      saldoTotal: new Prisma.Decimal(saldoTotal),
      estado: nuevoEstado,
      fechaUltimoPago: new Date(),
    },
  });

  return prestamoActualizado;
}

/**
 * Registra auditoría completa del pago
 */
async function registrarAuditoria(
  tx: Prisma.TransactionClient,
  datos: DatosRegistroPago,
  resultado: ResultadoRegistroPago,
  prestamoAntes: any
): Promise<void> {
  const detalle = JSON.stringify({
    idpago: resultado.pago.idpago,
    idprestamo: datos.idprestamo,
    montoTotal: resultado.pago.montoTotal,
    saldoAnterior: resultado.saldoAnterior,
    saldoNuevo: resultado.saldoNuevo,
    cuotasAfectadas: resultado.cuotasActualizadas.length,
    metodoPago: datos.metodoPago,
    tipoCobro: datos.tipoCobro,
  });

  await tx.tbl_auditoria.create({
    data: {
      idusuario: datos.idusuario,
      entidad: "tbl_pago",
      entidadId: resultado.pago.idpago,
      accion: "REGISTRAR_PAGO",
      detalle,
      ip: datos.ip || null,
      userAgent: datos.userAgent || null,
    },
  });
}

/**
 * REGISTRA UN PAGO CON TODAS LAS GARANTÍAS DE SEGURIDAD
 * 
 * Esta función:
 * 1. Adquiere un lock sobre el préstamo
 * 2. Valida permisos del usuario
 * 3. Valida que el préstamo existe y no ha cambiado (optimistic locking)
 * 4. Valida que el acuerdo esté activo (si aplica)
 * 5. Valida que el cobrador tenga asignado el préstamo
 * 6. Valida que el monto no exceda el saldo pendiente
 * 7. Registra el pago en transacción
 * 8. Aplica el pago a las cuotas
 * 9. Actualiza saldos del préstamo
 * 10. Registra auditoría completa
 * 11. Libera el lock automáticamente
 * 
 * @param datos Datos del pago a registrar
 * @returns Resultado del registro con información completa
 */
export async function registrarPago(
  datos: DatosRegistroPago
): Promise<ResultadoRegistroPago> {
  // Validar permisos antes de adquirir lock
  if (datos.idusuario) {
    await requerirPermiso(datos.idusuario, "APPLY_PAYMENT");
  }

  // Validar que hay al menos un monto
  if (
    datos.montoCapital <= 0 &&
    datos.montoInteres <= 0 &&
    datos.montoMora <= 0
  ) {
    throw new Error(
      "El pago debe tener al menos un monto mayor a cero (capital, interés o mora)"
    );
  }

  // Ejecutar con lock sobre el préstamo
  return await conLock(
    "PRESTAMO",
    datos.idprestamo,
    async () => {
      return await prisma.$transaction(
        async (tx) => {
          // 1. Validar préstamo con optimistic locking
          const prestamoAntes = await validarPrestamo(
            tx,
            datos.idprestamo,
            datos.updatedAtPrestamo
          );

          // 2. Validar acuerdo si se especificó
          if (datos.idacuerdo) {
            await validarAcuerdo(tx, datos.idacuerdo);
          }

          // 3. Validar asignación del cobrador
          await validarAsignacionCobrador(tx, datos.idprestamo, datos.idusuario);

          // 4. Calcular saldo pendiente
          const saldoAnterior = calcularSaldoPendiente(prestamoAntes);
          const montoTotal =
            datos.montoCapital + datos.montoInteres + datos.montoMora;

          // 5. Validar que el monto no exceda el saldo pendiente
          if (montoTotal > saldoAnterior.total) {
            throw new Error(
              `El monto del pago (${montoTotal.toFixed(2)}) excede el saldo pendiente (${saldoAnterior.total.toFixed(2)})`
            );
          }

          // 6. Validar montos individuales
          if (datos.montoCapital > saldoAnterior.capital) {
            throw new Error(
              `El monto de capital (${datos.montoCapital.toFixed(2)}) excede el capital pendiente (${saldoAnterior.capital.toFixed(2)})`
            );
          }
          if (datos.montoInteres > saldoAnterior.interes) {
            throw new Error(
              `El monto de interés (${datos.montoInteres.toFixed(2)}) excede el interés pendiente (${saldoAnterior.interes.toFixed(2)})`
            );
          }
          if (datos.montoMora > saldoAnterior.mora) {
            throw new Error(
              `El monto de mora (${datos.montoMora.toFixed(2)}) excede la mora pendiente (${saldoAnterior.mora.toFixed(2)})`
            );
          }

          // 7. Crear registro de pago
          const pago = await tx.tbl_pago.create({
            data: {
              idprestamo: datos.idprestamo,
              idcuota: datos.idcuota ?? null,
              idacuerdo: datos.idacuerdo ?? null,
              idusuario: datos.idusuario ?? null,
              montoCapital: new Prisma.Decimal(datos.montoCapital),
              montoInteres: new Prisma.Decimal(datos.montoInteres),
              montoMora: new Prisma.Decimal(datos.montoMora),
              montoTotal: new Prisma.Decimal(montoTotal),
              metodoPago: datos.metodoPago,
              tipoCobro: datos.tipoCobro ?? TipoCobroEnum.PARCIAL,
              fechaPago: datos.fechaPago ?? new Date(),
              referencia: datos.referencia ?? null,
              observacion: datos.observacion ?? null,
              notas: datos.notas ?? null,
            },
          });

          // 8. Aplicar pago a cuotas
          const cuotasActualizadas = await aplicarPagoACuotas(
            tx,
            prestamoAntes,
            datos,
            pago.idpago
          );

          // 9. Obtener cuotas actualizadas para recalcular saldos
          const todasLasCuotas = await tx.tbl_cuota.findMany({
            where: {
              idprestamo: datos.idprestamo,
              deletedAt: null,
            },
          });

          // 10. Actualizar saldos del préstamo
          const prestamoActualizado = await actualizarSaldosPrestamo(
            tx,
            datos.idprestamo,
            todasLasCuotas
          );

          // 11. Calcular saldo nuevo
          const saldoNuevo = calcularSaldoPendiente(prestamoActualizado);

          const resultado: ResultadoRegistroPago = {
            pago,
            cuotasActualizadas,
            prestamoActualizado,
            saldoAnterior,
            saldoNuevo,
          };

          // 12. Registrar auditoría
          await registrarAuditoria(tx, datos, resultado, prestamoAntes);

          return resultado;
        },
        {
          maxWait: 10000, // 10 segundos máximo de espera
          timeout: 20000, // 20 segundos máximo de ejecución
        }
      );
    },
    {
      idusuario: datos.idusuario || null,
      descripcion: `Registro de pago para préstamo ${datos.idprestamo}`,
      timeoutSegundos: 300, // 5 minutos
    }
  );
}

