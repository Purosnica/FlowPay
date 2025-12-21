/**
 * TRANSACCIONES PRISMA PARA OPERACIONES CRÍTICAS
 * 
 * Este módulo contiene funciones que envuelven operaciones críticas
 * en transacciones Prisma para garantizar atomicidad total.
 * 
 * OPERACIONES CRÍTICAS:
 * 1. Crear préstamo + generar cuotas
 * 2. Registrar pago + aplicar capital/interés/mora
 * 3. Reestructuración de préstamo (ya implementada en mutations.ts)
 * 4. Castigo de cartera
 * 5. Liquidación de terceros (ya implementada en liquidacion.ts)
 */

import { Prisma } from "@prisma/client";
import { EstadoPrestamoEnum, EstadoCuotaEnum, TipoPrestamoEnum, MetodoPagoEnum, TipoCobroEnum } from "@prisma/client";

/**
 * Calcula las fechas de vencimiento de las cuotas
 */
function calcularFechasVencimiento(
  fechaInicio: Date,
  plazoMeses: number,
  diaPago: number = 1
): Date[] {
  const fechas: Date[] = [];
  const fechaBase = new Date(fechaInicio);
  fechaBase.setDate(diaPago);

  for (let i = 0; i < plazoMeses; i++) {
    const fecha = new Date(fechaBase);
    fecha.setMonth(fechaBase.getMonth() + i);
    fechas.push(fecha);
  }

  return fechas;
}

/**
 * Calcula el monto de cada cuota (amortización francesa)
 */
function calcularMontoCuota(
  montoPrincipal: number,
  tasaInteresAnual: number,
  numeroCuotas: number
): number {
  if (numeroCuotas === 0) return 0;
  if (tasaInteresAnual === 0) return montoPrincipal / numeroCuotas;

  const tasaMensual = tasaInteresAnual / 12 / 100;
  const factor = Math.pow(1 + tasaMensual, numeroCuotas);
  const cuota = (montoPrincipal * tasaMensual * factor) / (factor - 1);

  return cuota;
}

/**
 * TRANSACCIÓN 1: Crear préstamo + generar cuotas automáticamente
 * 
 * Esta función garantiza que:
 * - Si falla la creación del préstamo, no se crean cuotas
 * - Si falla la creación de alguna cuota, se revierte todo
 * - La auditoría se registra solo si todo es exitoso
 */
export async function crearPrestamoConCuotas(
  tx: Prisma.TransactionClient,
  data: {
    // Datos del préstamo
    idcliente: number;
    idusuarioCreador?: number | null;
    tipoprestamo: TipoPrestamoEnum;
    codigo: string;
    referencia?: string | null;
    montoSolicitado: number;
    montoAprobado?: number | null;
    montoDesembolsado?: number | null;
    tasaInteresAnual: number;
    plazoMeses: number;
    fechaSolicitud?: Date;
    fechaAprobacion?: Date | null;
    fechaDesembolso?: Date | null;
    fechaVencimiento?: Date | null;
    observaciones?: string | null;
    idusuarioGestor?: number | null;
  },
  opciones?: {
    diaPago?: number; // Día del mes para pagos (default: 1)
    generarCuotas?: boolean; // Si debe generar cuotas automáticamente (default: true)
  }
): Promise<{ prestamo: any; cuotas: any[] }> {
  const generarCuotas = opciones?.generarCuotas !== false;
  const diaPago = opciones?.diaPago ?? 1;

  // 1. Crear préstamo
  const prestamo = await tx.tbl_prestamo.create({
    data: {
      idcliente: data.idcliente,
      idusuarioCreador: data.idusuarioCreador,
      tipoprestamo: data.tipoprestamo,
      codigo: data.codigo,
      referencia: data.referencia,
      montoSolicitado: new Prisma.Decimal(data.montoSolicitado),
      montoAprobado: data.montoAprobado ? new Prisma.Decimal(data.montoAprobado) : null,
      montoDesembolsado: data.montoDesembolsado ? new Prisma.Decimal(data.montoDesembolsado) : null,
      tasaInteresAnual: new Prisma.Decimal(data.tasaInteresAnual),
      plazoMeses: data.plazoMeses,
      estado: EstadoPrestamoEnum.BORRADOR,
      fechaSolicitud: data.fechaSolicitud ?? new Date(),
      fechaAprobacion: data.fechaAprobacion,
      fechaDesembolso: data.fechaDesembolso,
      fechaVencimiento: data.fechaVencimiento,
      observaciones: data.observaciones,
      idusuarioGestor: data.idusuarioGestor,
    },
  });

  const cuotas: any[] = [];

  // 2. Generar cuotas si está habilitado
  if (generarCuotas && data.plazoMeses > 0) {
    const montoPrincipal = data.montoDesembolsado || data.montoAprobado || data.montoSolicitado;
    const montoCuota = calcularMontoCuota(
      Number(montoPrincipal),
      data.tasaInteresAnual,
      data.plazoMeses
    );
    const tasaMensual = data.tasaInteresAnual / 12 / 100;
    const fechaInicio = data.fechaDesembolso || data.fechaAprobacion || data.fechaSolicitud || new Date();
    const fechasVencimiento = calcularFechasVencimiento(fechaInicio, data.plazoMeses, diaPago);

    let saldoPendiente = Number(montoPrincipal);

    for (let i = 0; i < data.plazoMeses; i++) {
      const interesMensual = saldoPendiente * tasaMensual;
      const capitalMensual = montoCuota - interesMensual;
      saldoPendiente -= capitalMensual;

      const cuota = await tx.tbl_cuota.create({
        data: {
          idprestamo: prestamo.idprestamo,
          numero: i + 1,
          fechaVencimiento: fechasVencimiento[i],
          capitalProgramado: new Prisma.Decimal(capitalMensual),
          interesProgramado: new Prisma.Decimal(interesMensual),
          moraProgramada: new Prisma.Decimal(0),
          capitalPagado: new Prisma.Decimal(0),
          interesPagado: new Prisma.Decimal(0),
          moraPagada: new Prisma.Decimal(0),
          diasMoraAcumulados: 0,
          estado: EstadoCuotaEnum.PENDIENTE,
        },
      });

      cuotas.push(cuota);
    }
  }

  // 3. Registrar auditoría (dentro de la transacción)
  await tx.tbl_auditoria.create({
    data: {
      idusuario: data.idusuarioCreador,
      entidad: "tbl_prestamo",
      entidadId: prestamo.idprestamo,
      accion: "CREAR_PRESTAMO_CON_CUOTAS",
      detalle: `Préstamo ${prestamo.codigo} creado con ${cuotas.length} cuotas`,
    },
  });

  return { prestamo, cuotas };
}

/**
 * TRANSACCIÓN 2: Registrar pago + aplicar capital/interés/mora a cuotas
 * 
 * Esta función garantiza que:
 * - El pago se registre correctamente
 * - Los montos se apliquen a las cuotas en orden
 * - Los estados de cuotas se actualicen correctamente
 * - El estado del préstamo se actualice si corresponde
 * - Todo se revierte si algo falla
 */
export async function registrarPagoConAplicacion(
  tx: Prisma.TransactionClient,
  data: {
    idprestamo: number;
    idcuota?: number | null; // Si se especifica, se aplica a esa cuota primero
    idacuerdo?: number | null;
    montoCapital: number;
    montoInteres: number;
    montoMora: number;
    metodoPago: MetodoPagoEnum;
    tipoCobro?: TipoCobroEnum;
    fechaPago?: Date;
    referencia?: string | null;
    observacion?: string | null;
    observaciones?: string | null;
    idusuario?: number | null;
  }
): Promise<{ pago: any; cuotasActualizadas: any[]; prestamoActualizado: any }> {
  // 1. Validar préstamo
  const prestamo = await tx.tbl_prestamo.findFirst({
    where: { idprestamo: data.idprestamo, deletedAt: null },
    include: {
      cuotas: {
        where: { deletedAt: null },
        orderBy: { numero: "asc" },
      },
    },
  });

  if (!prestamo) {
    throw new Error("Préstamo no encontrado");
  }

  // 2. Crear registro de pago
  const montoTotal = data.montoCapital + data.montoInteres + data.montoMora;
  const pago = await tx.tbl_pago.create({
    data: {
      idprestamo: data.idprestamo,
      idcuota: data.idcuota ?? null,
      idacuerdo: data.idacuerdo ?? null,
      idusuario: data.idusuario ?? null,
      montoCapital: new Prisma.Decimal(data.montoCapital),
      montoInteres: new Prisma.Decimal(data.montoInteres),
      montoMora: new Prisma.Decimal(data.montoMora),
      montoTotal: new Prisma.Decimal(montoTotal),
      metodoPago: data.metodoPago,
      tipoCobro: data.tipoCobro ?? TipoCobroEnum.PARCIAL,
      fechaPago: data.fechaPago ?? new Date(),
      referencia: data.referencia ?? null,
      observacion: data.observacion ?? data.observaciones ?? null,
      notas: data.observaciones ?? null,
    },
  });

  // 3. Aplicar pagos a cuotas
  const cuotasActualizadas: any[] = [];
  let capitalRestante = data.montoCapital;
  let interesRestante = data.montoInteres;
  let moraRestante = data.montoMora;

  // Si se especificó una cuota, empezar por esa
  const cuotasPendientes = data.idcuota
    ? prestamo.cuotas.filter((c) => c.idcuota === data.idcuota || c.estado !== EstadoCuotaEnum.PAGADA)
    : prestamo.cuotas.filter((c) => c.estado !== EstadoCuotaEnum.PAGADA);

  for (const cuota of cuotasPendientes) {
    if (capitalRestante <= 0 && interesRestante <= 0 && moraRestante <= 0) break;

    const capitalPendiente = Number(cuota.capitalProgramado) - Number(cuota.capitalPagado);
    const interesPendiente = Number(cuota.interesProgramado) - Number(cuota.interesPagado);
    const moraPendiente = Number(cuota.moraProgramada) - Number(cuota.moraPagada);

    let nuevoCapitalPagado = Number(cuota.capitalPagado);
    let nuevoInteresPagado = Number(cuota.interesPagado);
    let nuevoMoraPagada = Number(cuota.moraPagada);

    // Aplicar mora primero
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
    } else if (nuevoCapitalPagado > 0 || nuevoInteresPagado > 0 || nuevoMoraPagada > 0) {
      nuevoEstado = EstadoCuotaEnum.PARCIAL;
    }

    // Actualizar cuota
    const cuotaActualizada = await tx.tbl_cuota.update({
      where: { idcuota: cuota.idcuota },
      data: {
        capitalPagado: new Prisma.Decimal(nuevoCapitalPagado),
        interesPagado: new Prisma.Decimal(nuevoInteresPagado),
        moraPagada: new Prisma.Decimal(nuevoMoraPagada),
        estado: nuevoEstado,
      },
    });

    cuotasActualizadas.push(cuotaActualizada);
  }

  // 4. Actualizar estado del préstamo
  const todasCuotasPagadas = prestamo.cuotas.every(
    (c) => c.estado === EstadoCuotaEnum.PAGADA || cuotasActualizadas.some((ca) => ca.idcuota === c.idcuota && ca.estado === EstadoCuotaEnum.PAGADA)
  );

  let nuevoEstadoPrestamo = prestamo.estado;
  if (todasCuotasPagadas && prestamo.estado !== EstadoPrestamoEnum.PAGADO) {
    nuevoEstadoPrestamo = EstadoPrestamoEnum.PAGADO;
  } else if (prestamo.estado === EstadoPrestamoEnum.BORRADOR && data.fechaPago) {
    nuevoEstadoPrestamo = EstadoPrestamoEnum.EN_CURSO;
  }

  const prestamoActualizado = await tx.tbl_prestamo.update({
    where: { idprestamo: data.idprestamo },
    data: { estado: nuevoEstadoPrestamo },
  });

  // 5. Registrar auditoría (dentro de la transacción)
  await tx.tbl_auditoria.create({
    data: {
      idusuario: data.idusuario,
      entidad: "tbl_pago",
      entidadId: pago.idpago,
      accion: "REGISTRAR_PAGO_CON_APLICACION",
      detalle: `Pago ${pago.idpago} registrado y aplicado a ${cuotasActualizadas.length} cuotas del préstamo ${prestamo.codigo}`,
    },
  });

  return { pago, cuotasActualizadas, prestamoActualizado };
}

/**
 * TRANSACCIÓN 3: Castigo de cartera
 * 
 * Marca préstamos en mora como castigados y cancela cuotas pendientes.
 * Esta función garantiza atomicidad en el proceso de castigo.
 */
export async function castigarCartera(
  tx: Prisma.TransactionClient,
  data: {
    idprestamos: number[]; // IDs de préstamos a castigar
    fechaCastigo: Date;
    motivo: string;
    observaciones?: string | null;
    idusuario?: number | null;
  }
): Promise<{ prestamosCastigados: any[]; cuotasCanceladas: number }> {
  const prestamosCastigados: any[] = [];
  let cuotasCanceladas = 0;

  for (const idprestamo of data.idprestamos) {
    // 1. Validar préstamo
    const prestamo = await tx.tbl_prestamo.findFirst({
      where: { idprestamo, deletedAt: null },
      include: {
        cuotas: {
          where: {
            deletedAt: null,
            estado: {
              in: [EstadoCuotaEnum.PENDIENTE, EstadoCuotaEnum.VENCIDA, EstadoCuotaEnum.PARCIAL],
            },
          },
        },
      },
    });

    if (!prestamo) {
      throw new Error(`Préstamo ${idprestamo} no encontrado`);
    }

    if (prestamo.estado === EstadoPrestamoEnum.CASTIGADO) {
      continue; // Ya está castigado
    }

    // 2. Cancelar cuotas pendientes
    const resultado = await tx.tbl_cuota.updateMany({
      where: {
        idprestamo,
        estado: {
          in: [EstadoCuotaEnum.PENDIENTE, EstadoCuotaEnum.VENCIDA, EstadoCuotaEnum.PARCIAL],
        },
        deletedAt: null,
      },
      data: {
        estado: EstadoCuotaEnum.ANULADA,
      },
    });

    cuotasCanceladas += resultado.count;

    // 3. Marcar préstamo como castigado
    const prestamoCastigado = await tx.tbl_prestamo.update({
      where: { idprestamo },
      data: {
        estado: EstadoPrestamoEnum.CASTIGADO,
        observaciones: `Préstamo castigado el ${data.fechaCastigo.toISOString()}. Motivo: ${data.motivo}. ${prestamo.observaciones || ""}`,
      },
    });

    prestamosCastigados.push(prestamoCastigado);

    // 4. Registrar auditoría por préstamo
    await tx.tbl_auditoria.create({
      data: {
        idusuario: data.idusuario,
        entidad: "tbl_prestamo",
        entidadId: idprestamo,
        accion: "CASTIGAR_CARTERA",
        detalle: `Préstamo ${prestamo.codigo} castigado. ${resultado.count} cuotas canceladas. Motivo: ${data.motivo}`,
      },
    });
  }

  return { prestamosCastigados, cuotasCanceladas };
}

