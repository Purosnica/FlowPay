/**
 * SERVICIO DE APLICACIÓN DE MORA - SEGURO Y TRANSACCIONAL
 * 
 * Este servicio aplica mora automáticamente a las cuotas vencidas:
 * - Transacciones atómicas
 * - Cálculo correcto de días de mora
 * - Actualización de estados
 * - Auditoría completa
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EstadoCuotaEnum, EstadoPrestamoEnum } from "@prisma/client";
import { conLock } from "@/lib/locks/lock-service";

export interface ConfiguracionMora {
  tasaMoraDiaria?: number; // Porcentaje diario de mora (ej: 0.1 = 0.1% por día)
  diasGracia?: number; // Días de gracia antes de aplicar mora
  montoMinimoMora?: number; // Monto mínimo de mora a aplicar
}

export interface DatosAplicacionMora {
  idprestamo: number;
  configuracion?: ConfiguracionMora;
  fechaCalculo?: Date; // Fecha base para calcular mora (default: hoy)
  idusuario?: number | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface ResultadoAplicacionMora {
  cuotasActualizadas: any[];
  moraTotalAplicada: number;
  prestamoActualizado: any;
}

/**
 * Calcula los días de mora desde la fecha de vencimiento
 */
function calcularDiasMora(fechaVencimiento: Date, fechaCalculo: Date): number {
  const diffTime = fechaCalculo.getTime() - fechaVencimiento.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Calcula el monto de mora según la configuración
 */
function calcularMontoMora(
  capitalPendiente: number,
  interesPendiente: number,
  diasMora: number,
  config: ConfiguracionMora
): number {
  if (diasMora <= (config.diasGracia || 0)) {
    return 0;
  }

  const diasMoraEfectivos = diasMora - (config.diasGracia || 0);
  const tasaMoraDiaria = config.tasaMoraDiaria || 0.1; // 0.1% por defecto
  const baseCalculo = capitalPendiente + interesPendiente;
  const moraCalculada = baseCalculo * (tasaMoraDiaria / 100) * diasMoraEfectivos;
  const montoMinimo = config.montoMinimoMora || 0;

  return Math.max(moraCalculada, montoMinimo);
}

/**
 * APLICA MORA AUTOMÁTICAMENTE A LAS CUOTAS VENCIDAS
 * 
 * Esta función:
 * 1. Adquiere lock sobre el préstamo
 * 2. Obtiene todas las cuotas vencidas
 * 3. Calcula mora para cada cuota
 * 4. Actualiza cuotas en transacción
 * 5. Actualiza estado del préstamo si corresponde
 * 6. Registra auditoría
 * 
 * @param datos Datos para aplicar mora
 * @returns Resultado con cuotas actualizadas
 */
export async function aplicarMora(
  datos: DatosAplicacionMora
): Promise<ResultadoAplicacionMora> {
  const fechaCalculo = datos.fechaCalculo || new Date();
  const config: ConfiguracionMora = {
    tasaMoraDiaria: 0.1, // 0.1% por día por defecto
    diasGracia: 0,
    montoMinimoMora: 0,
    ...datos.configuracion,
  };

  return await conLock(
    "PRESTAMO",
    datos.idprestamo,
    async () => {
      return await prisma.$transaction(
        async (tx) => {
          // 1. Obtener préstamo con cuotas
          const prestamo = await tx.tbl_prestamo.findFirst({
            where: { idprestamo: datos.idprestamo, deletedAt: null },
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

          // 2. Filtrar cuotas vencidas y no pagadas completamente
          const cuotasVencidas = prestamo.cuotas.filter((cuota) => {
            const fechaVencimiento = new Date(cuota.fechaVencimiento);
            const estaVencida = fechaVencimiento < fechaCalculo;
            const noEstaPagada =
              cuota.estado !== EstadoCuotaEnum.PAGADA &&
              cuota.estado !== EstadoCuotaEnum.ANULADA;
            return estaVencida && noEstaPagada;
          });

          if (cuotasVencidas.length === 0) {
            return {
              cuotasActualizadas: [],
              moraTotalAplicada: 0,
              prestamoActualizado: prestamo,
            };
          }

          // 3. Calcular y aplicar mora a cada cuota
          const cuotasActualizadas: any[] = [];
          let moraTotalAplicada = 0;

          for (const cuota of cuotasVencidas) {
            const diasMora = calcularDiasMora(
              new Date(cuota.fechaVencimiento),
              fechaCalculo
            );
            const diasMoraAcumulados = cuota.diasMoraAcumulados + diasMora;

            const capitalPendiente =
              Number(cuota.capitalProgramado) - Number(cuota.capitalPagado);
            const interesPendiente =
              Number(cuota.interesProgramado) - Number(cuota.interesPagado);
            const moraPendiente =
              Number(cuota.moraProgramada) - Number(cuota.moraPagada);

            // Calcular nueva mora solo sobre lo pendiente
            const nuevaMora = calcularMontoMora(
              capitalPendiente,
              interesPendiente,
              diasMora,
              config
            );

            const moraProgramadaTotal =
              Number(cuota.moraProgramada) + nuevaMora;

            moraTotalAplicada += nuevaMora;

            // Determinar nuevo estado
            let nuevoEstado = cuota.estado;
            if (cuota.estado === EstadoCuotaEnum.PENDIENTE) {
              nuevoEstado = EstadoCuotaEnum.VENCIDA;
            }

            // Actualizar cuota
            const cuotaActualizada = await tx.tbl_cuota.update({
              where: { idcuota: cuota.idcuota },
              data: {
                moraProgramada: new Prisma.Decimal(moraProgramadaTotal),
                diasMoraAcumulados,
                estado: nuevoEstado,
              },
            });

            cuotasActualizadas.push(cuotaActualizada);
          }

          // 4. Actualizar estado del préstamo si tiene cuotas vencidas
          let nuevoEstadoPrestamo = prestamo.estado;
          if (
            cuotasVencidas.length > 0 &&
            prestamo.estado !== EstadoPrestamoEnum.CASTIGADO &&
            prestamo.estado !== EstadoPrestamoEnum.PAGADO
          ) {
            nuevoEstadoPrestamo = EstadoPrestamoEnum.EN_MORA;
          }

          // Recalcular saldos
          const todasLasCuotas = await tx.tbl_cuota.findMany({
            where: {
              idprestamo: datos.idprestamo,
              deletedAt: null,
            },
          });

          const saldoCapital = todasLasCuotas.reduce(
            (sum, c) =>
              sum + Number(c.capitalProgramado) - Number(c.capitalPagado),
            0
          );
          const saldoInteres = todasLasCuotas.reduce(
            (sum, c) =>
              sum + Number(c.interesProgramado) - Number(c.interesPagado),
            0
          );
          const saldoMora = todasLasCuotas.reduce(
            (sum, c) => sum + Number(c.moraProgramada) - Number(c.moraPagada),
            0
          );
          const saldoTotal = saldoCapital + saldoInteres + saldoMora;

          const prestamoActualizado = await tx.tbl_prestamo.update({
            where: { idprestamo: datos.idprestamo },
            data: {
              estado: nuevoEstadoPrestamo,
              saldoCapital: new Prisma.Decimal(saldoCapital),
              saldoInteres: new Prisma.Decimal(saldoInteres),
              saldoMora: new Prisma.Decimal(saldoMora),
              saldoTotal: new Prisma.Decimal(saldoTotal),
            },
          });

          // 5. Registrar auditoría
          await tx.tbl_auditoria.create({
            data: {
              idusuario: datos.idusuario,
              entidad: "tbl_prestamo",
              entidadId: datos.idprestamo,
              accion: "APLICAR_MORA",
              detalle: `Mora aplicada a ${cuotasActualizadas.length} cuotas. Total mora aplicada: ${moraTotalAplicada.toFixed(2)}`,
              ip: datos.ip || null,
              userAgent: datos.userAgent || null,
            },
          });

          return {
            cuotasActualizadas,
            moraTotalAplicada,
            prestamoActualizado,
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
      descripcion: `Aplicación de mora para préstamo ${datos.idprestamo}`,
      timeoutSegundos: 300,
    }
  );
}

