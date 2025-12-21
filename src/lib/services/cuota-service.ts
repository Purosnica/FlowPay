/**
 * SERVICIO DE GENERACIÓN DE CUOTAS - SEGURO Y TRANSACCIONAL
 * 
 * Este servicio genera cuotas para un préstamo con todas las garantías:
 * - Transacciones atómicas
 * - Validación de duplicados
 * - Cálculo correcto de amortización
 * - Auditoría completa
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EstadoCuotaEnum, EstadoPrestamoEnum } from "@prisma/client";
import { conLock } from "@/lib/locks/lock-service";
import { requerirPermiso } from "@/lib/permissions/permission-service";

export interface DatosGeneracionCuotas {
  idprestamo: number;
  idusuario: number | null;
  diaPago?: number; // Día del mes para pagos (default: 1)
  ip?: string | null;
  userAgent?: string | null;
}

export interface ResultadoGeneracionCuotas {
  cuotasCreadas: any[];
  cuotasExistentes: number;
  totalCuotas: number;
}

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
 * GENERA CUOTAS PARA UN PRÉSTAMO CON VALIDACIONES
 * 
 * Esta función:
 * 1. Valida permisos
 * 2. Adquiere lock sobre el préstamo
 * 3. Valida que el préstamo existe y tiene datos necesarios
 * 4. Verifica que no existan cuotas duplicadas
 * 5. Genera cuotas en transacción
 * 6. Registra auditoría
 * 
 * @param datos Datos para generar cuotas
 * @returns Resultado con cuotas creadas
 */
export async function generarCuotas(
  datos: DatosGeneracionCuotas
): Promise<ResultadoGeneracionCuotas> {
  // Validar permisos
  if (datos.idusuario) {
    await requerirPermiso(datos.idusuario, "CREATE_LOAN");
  }

  return await conLock(
    "PRESTAMO",
    datos.idprestamo,
    async () => {
      return await prisma.$transaction(
        async (tx) => {
          // 1. Validar préstamo
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

          if (!prestamo.plazoMeses || prestamo.plazoMeses <= 0) {
            throw new Error("El préstamo no tiene un plazo válido");
          }

          if (!prestamo.tasaInteresAnual && Number(prestamo.tasaInteresAnual) <= 0) {
            throw new Error("El préstamo no tiene una tasa de interés válida");
          }

          const montoPrincipal =
            Number(prestamo.montoDesembolsado) ||
            Number(prestamo.montoAprobado) ||
            Number(prestamo.montoSolicitado);

          if (!montoPrincipal || montoPrincipal <= 0) {
            throw new Error("El préstamo no tiene un monto válido");
          }

          // 2. Verificar cuotas existentes
          const cuotasExistentes = prestamo.cuotas.length;
          if (cuotasExistentes > 0) {
            // Verificar que no haya duplicados
            const numerosExistentes = new Set(prestamo.cuotas.map((c) => c.numero));
            const numerosEsperados = Array.from(
              { length: prestamo.plazoMeses },
              (_, i) => i + 1
            );

            const faltantes = numerosEsperados.filter((n) => !numerosExistentes.has(n));
            if (faltantes.length === 0) {
              throw new Error(
                `Ya existen ${cuotasExistentes} cuotas para este préstamo. No se pueden generar duplicados.`
              );
            }

            // Solo generar las cuotas faltantes
            const numerosAGenerar = faltantes;
            const montoCuota = calcularMontoCuota(
              montoPrincipal,
              Number(prestamo.tasaInteresAnual),
              prestamo.plazoMeses
            );
            const tasaMensual = Number(prestamo.tasaInteresAnual) / 12 / 100;
            const fechaInicio =
              prestamo.fechaDesembolso ||
              prestamo.fechaAprobacion ||
              prestamo.fechaSolicitud ||
              new Date();
            const fechasVencimiento = calcularFechasVencimiento(
              fechaInicio,
              prestamo.plazoMeses,
              datos.diaPago ?? 1
            );

            // Calcular saldo pendiente considerando cuotas ya pagadas
            let saldoPendiente = montoPrincipal;
            prestamo.cuotas.forEach((c) => {
              saldoPendiente -= Number(c.capitalPagado);
            });

            const cuotasCreadas: any[] = [];

            for (const numero of numerosAGenerar) {
              const interesMensual = saldoPendiente * tasaMensual;
              const capitalMensual = montoCuota - interesMensual;
              saldoPendiente -= capitalMensual;

              const cuota = await tx.tbl_cuota.create({
                data: {
                  idprestamo: datos.idprestamo,
                  numero,
                  fechaVencimiento: fechasVencimiento[numero - 1],
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

              cuotasCreadas.push(cuota);
            }

            // Registrar auditoría
            await tx.tbl_auditoria.create({
              data: {
                idusuario: datos.idusuario,
                entidad: "tbl_cuota",
                entidadId: null,
                accion: "GENERAR_CUOTAS_FALTANTES",
                detalle: `Generadas ${cuotasCreadas.length} cuotas faltantes para préstamo ${prestamo.codigo}. Total cuotas: ${cuotasExistentes + cuotasCreadas.length}`,
                ip: datos.ip || null,
                userAgent: datos.userAgent || null,
              },
            });

            return {
              cuotasCreadas,
              cuotasExistentes,
              totalCuotas: cuotasExistentes + cuotasCreadas.length,
            };
          }

          // 3. Generar todas las cuotas desde cero
          const montoCuota = calcularMontoCuota(
            montoPrincipal,
            Number(prestamo.tasaInteresAnual),
            prestamo.plazoMeses
          );
          const tasaMensual = Number(prestamo.tasaInteresAnual) / 12 / 100;
          const fechaInicio =
            prestamo.fechaDesembolso ||
            prestamo.fechaAprobacion ||
            prestamo.fechaSolicitud ||
            new Date();
          const fechasVencimiento = calcularFechasVencimiento(
            fechaInicio,
            prestamo.plazoMeses,
            datos.diaPago ?? 1
          );

          let saldoPendiente = montoPrincipal;
          const cuotasCreadas: any[] = [];

          for (let i = 0; i < prestamo.plazoMeses; i++) {
            const interesMensual = saldoPendiente * tasaMensual;
            const capitalMensual = montoCuota - interesMensual;
            saldoPendiente -= capitalMensual;

            const cuota = await tx.tbl_cuota.create({
              data: {
                idprestamo: datos.idprestamo,
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

            cuotasCreadas.push(cuota);
          }

          // 4. Registrar auditoría
          await tx.tbl_auditoria.create({
            data: {
              idusuario: datos.idusuario,
              entidad: "tbl_cuota",
              entidadId: null,
              accion: "GENERAR_CUOTAS",
              detalle: `Generadas ${cuotasCreadas.length} cuotas para préstamo ${prestamo.codigo}`,
              ip: datos.ip || null,
              userAgent: datos.userAgent || null,
            },
          });

          return {
            cuotasCreadas,
            cuotasExistentes: 0,
            totalCuotas: cuotasCreadas.length,
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
      descripcion: `Generación de cuotas para préstamo ${datos.idprestamo}`,
      timeoutSegundos: 300,
    }
  );
}

