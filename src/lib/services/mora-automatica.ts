/**
 * SERVICIO DE MORA AUTOMÁTICA
 * 
 * Este servicio implementa la lógica financiera para el cálculo y actualización
 * automática de mora en préstamos y cuotas.
 * 
 * LÓGICA FINANCIERA:
 * 
 * 1. CÁLCULO DE MORA:
 *    - La mora se calcula diariamente sobre el saldo pendiente de capital e interés
 *    - Fórmula: Mora = (Saldo Capital + Saldo Interés) × Tasa Mora Diaria × Días de Atraso
 *    - Tasa Mora Diaria = Tasa Mora Anual / 365 (o 360 según política)
 *    - La mora se acumula desde el día siguiente al vencimiento
 *    - Ejemplo: Si una cuota vence el 1 de enero y hoy es 5 de enero:
 *      * Días de atraso = 4 días
 *      * Saldo pendiente = $1,000 (capital) + $50 (interés) = $1,050
 *      * Tasa mora anual = 36% (0.36)
 *      * Tasa mora diaria = 0.36 / 365 = 0.0009863
 *      * Mora = $1,050 × 0.0009863 × 4 = $4.14
 * 
 * 2. ESTADOS DE CUOTAS:
 *    - PENDIENTE: Cuota no vencida o vencida pero no procesada
 *    - VENCIDA: Cuota con fecha de vencimiento pasada y no pagada completamente
 *    - PARCIAL: Cuota con pago parcial pero no completo
 *    - PAGADA: Cuota completamente pagada
 * 
 * 3. ESTADOS DE PRÉSTAMOS:
 *    - EN_CURSO: Préstamo activo sin cuotas vencidas
 *    - EN_MORA: Préstamo con al menos una cuota vencida
 *    - CASTIGADO: Préstamo con mora excesiva (configurable, ej: >90 días)
 * 
 * 4. PROMESAS DE PAGO:
 *    - PENDIENTE: Promesa activa con fecha futura
 *    - INCUMPLIDA: Promesa con fecha pasada y sin cumplimiento
 *    - CUMPLIDA: Promesa cumplida en fecha
 * 
 * 5. ACTUALIZACIÓN DIARIA:
 *    - Se ejecuta una vez al día (recomendado: madrugada)
 *    - Actualiza todas las cuotas vencidas
 *    - Recalcula mora acumulada
 *    - Actualiza estados de préstamos
 *    - Marca promesas incumplidas
 */

import { prisma } from "@/lib/prisma";
import { EstadoCuotaEnum, EstadoPrestamoEnum, EstadoPromesaEnum, Prisma } from "@prisma/client";
import {
  obtenerTasaMora,
  obtenerDiasGracia,
  obtenerDiasMoraCastigado,
} from "@/lib/config/config-service";

export interface ResultadoMoraAutomatica {
  cuotasActualizadas: number;
  prestamosActualizados: number;
  promesasMarcadas: number;
  moraTotalCalculada: number;
  errores: string[];
}

/**
 * Calcula los días de atraso desde la fecha de vencimiento hasta hoy
 */
function calcularDiasAtraso(fechaVencimiento: Date): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  const diffTime = hoy.getTime() - vencimiento.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Calcula la mora acumulada para una cuota
 * 
 * Fórmula: Mora = (Capital Pendiente + Interés Pendiente) × Tasa Mora Diaria × Días de Atraso
 * 
 * @param capitalPendiente - Capital no pagado de la cuota
 * @param interesPendiente - Interés no pagado de la cuota
 * @param diasAtraso - Días transcurridos desde el vencimiento (después de días de gracia)
 * @param tasaMoraAnual - Tasa de mora anual (ej: 0.36 para 36%)
 * @returns Monto de mora calculado
 */
function calcularMora(
  capitalPendiente: number,
  interesPendiente: number,
  diasAtraso: number,
  tasaMoraAnual: number = 0.36 // 36% anual por defecto
): number {
  if (diasAtraso <= 0) return 0;

  // Tasa de mora diaria (asumiendo año de 365 días)
  const tasaMoraDiaria = tasaMoraAnual / 365;

  // Saldo pendiente total (capital + interés)
  const saldoPendiente = capitalPendiente + interesPendiente;

  // Cálculo de mora: interés simple diario
  // Mora = Saldo × Tasa Diaria × Días
  const mora = saldoPendiente * tasaMoraDiaria * diasAtraso;

  // Redondear a 2 decimales
  return Math.round(mora * 100) / 100;
}

/**
 * Procesa el cálculo y actualización de mora para todas las cuotas vencidas
 * 
 * Esta función:
 * 1. Obtiene todas las cuotas vencidas de préstamos activos
 * 2. Calcula días de atraso (considerando días de gracia)
 * 3. Calcula mora diaria configurable
 * 4. Actualiza estados de cuotas (PENDIENTE/PARCIAL → VENCIDA)
 * 5. Registra eventos en auditoría
 */
async function procesarCuotasVencidas(tx?: Prisma.TransactionClient): Promise<{
  cuotasActualizadas: number;
  moraTotal: number;
  errores: string[];
}> {
  const db = tx || prisma;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let cuotasActualizadas = 0;
  let moraTotal = 0;
  const errores: string[] = [];

  try {
    // Obtener tasa de mora y días de gracia desde configuración
    const tasaMoraAnual = await obtenerTasaMora();
    const diasGracia = await obtenerDiasGracia();

    // Obtener todas las cuotas que:
    // 1. No están eliminadas
    // 2. Están en estado PENDIENTE o PARCIAL
    // 3. Tienen fecha de vencimiento pasada
    // 4. Pertenecen a préstamos activos (EN_CURSO o EN_MORA)
    const cuotasVencidas = await db.tbl_cuota.findMany({
      where: {
        deletedAt: null,
        estado: {
          in: [EstadoCuotaEnum.PENDIENTE, EstadoCuotaEnum.PARCIAL],
        },
        fechaVencimiento: {
          lt: hoy,
        },
        prestamo: {
          deletedAt: null,
          estado: {
            in: [EstadoPrestamoEnum.EN_CURSO, EstadoPrestamoEnum.EN_MORA],
          },
        },
      },
      include: {
        prestamo: {
          select: {
            idprestamo: true,
            codigo: true,
            estado: true,
            tasaInteresAnual: true,
          },
        },
      },
    });

    // Procesar cada cuota vencida
    for (const cuota of cuotasVencidas) {
      try {
        // Calcular días de atraso desde fecha de vencimiento
        const diasAtrasoBruto = calcularDiasAtraso(cuota.fechaVencimiento);
        
        // Aplicar días de gracia: mora solo se calcula después de los días de gracia
        const diasAtrasoEfectivo = Math.max(0, diasAtrasoBruto - diasGracia);
        
        // Calcular saldos pendientes
        const capitalPendiente =
          Number(cuota.capitalProgramado) - Number(cuota.capitalPagado);
        const interesPendiente =
          Number(cuota.interesProgramado) - Number(cuota.interesPagado);

        // Si la cuota está completamente pagada, saltarla
        if (capitalPendiente <= 0 && interesPendiente <= 0) {
          continue;
        }

        // Calcular mora acumulada (solo si hay días de atraso efectivo)
        const moraCalculada = calcularMora(
          capitalPendiente,
          interesPendiente,
          diasAtrasoEfectivo,
          tasaMoraAnual
        );

        // Actualizar cuota en transacción
        await db.tbl_cuota.update({
          where: { idcuota: cuota.idcuota },
          data: {
            estado: EstadoCuotaEnum.VENCIDA,
            diasMoraAcumulados: diasAtrasoBruto, // Guardar días totales de atraso
            moraProgramada: new Prisma.Decimal(moraCalculada),
          },
        });

        // Registrar auditoría
        await db.tbl_auditoria.create({
          data: {
            idusuario: null, // Sistema automático
            entidad: "tbl_cuota",
            entidadId: cuota.idcuota,
            accion: "CALCULAR_MORA_AUTOMATICA",
            detalle: `Mora automática calculada: ${moraCalculada.toFixed(2)}. Días de atraso: ${diasAtrasoBruto} (efectivo: ${diasAtrasoEfectivo}). Préstamo: ${cuota.prestamo.codigo}`,
          },
        });

        cuotasActualizadas++;
        moraTotal += moraCalculada;
      } catch (error) {
        errores.push(
          `Error procesando cuota ${cuota.idcuota}: ${error instanceof Error ? error.message : "Error desconocido"}`
        );
      }
    }
  } catch (error) {
    errores.push(
      `Error obteniendo cuotas vencidas: ${error instanceof Error ? error.message : "Error desconocido"}`
    );
  }

  return { cuotasActualizadas, moraTotal, errores };
}

/**
 * Actualiza el estado de préstamos que tienen cuotas vencidas
 * 
 * Cambios de estado:
 * - EN_CURSO → EN_MORA (si tiene cuotas vencidas)
 * - EN_MORA → CASTIGADO (si tiene mora excesiva configurable)
 */
async function actualizarEstadosPrestamos(tx?: Prisma.TransactionClient): Promise<{
  prestamosActualizados: number;
  errores: string[];
}> {
  const db = tx || prisma;
  let prestamosActualizados = 0;
  const errores: string[] = [];

  try {
    // Obtener días de mora para castigo desde configuración
    const diasMoraCastigado = await obtenerDiasMoraCastigado();

    // Obtener préstamos activos (EN_CURSO) que tienen cuotas vencidas
    const prestamosEnCurso = await db.tbl_prestamo.findMany({
      where: {
        deletedAt: null,
        estado: EstadoPrestamoEnum.EN_CURSO,
      },
      include: {
        cuotas: {
          where: {
            deletedAt: null,
            estado: EstadoCuotaEnum.VENCIDA,
          },
        },
      },
    });

    // Actualizar préstamos que tienen al menos una cuota vencida
    for (const prestamo of prestamosEnCurso) {
      if (prestamo.cuotas.length > 0) {
        try {
          // Encontrar la cuota con más días de mora
          const cuotaMasVencida = prestamo.cuotas.reduce((max, cuota) => {
            const diasMax = max.diasMoraAcumulados || 0;
            const diasCuota = cuota.diasMoraAcumulados || 0;
            return diasCuota > diasMax ? cuota : max;
          }, prestamo.cuotas[0]);

          const diasMoraMaximos = cuotaMasVencida.diasMoraAcumulados || 0;

          // Determinar nuevo estado
          let nuevoEstado: EstadoPrestamoEnum = EstadoPrestamoEnum.EN_MORA;
          if (diasMoraMaximos >= diasMoraCastigado) {
            nuevoEstado = EstadoPrestamoEnum.CASTIGADO;
          }

          // Actualizar estado del préstamo
          await db.tbl_prestamo.update({
            where: { idprestamo: prestamo.idprestamo },
            data: {
              estado: nuevoEstado as EstadoPrestamoEnum,
            },
          });

          // Registrar auditoría
          await db.tbl_auditoria.create({
            data: {
              idusuario: null, // Sistema automático
              entidad: "tbl_prestamo",
              entidadId: prestamo.idprestamo,
              accion: "ACTUALIZAR_ESTADO_MORA",
              detalle: `Estado actualizado de ${prestamo.estado} a ${nuevoEstado}. Días de mora máximo: ${diasMoraMaximos}. Préstamo: ${prestamo.codigo}`,
            },
          });

          prestamosActualizados++;
        } catch (error) {
          errores.push(
            `Error actualizando préstamo ${prestamo.idprestamo}: ${error instanceof Error ? error.message : "Error desconocido"}`
          );
        }
      }
    }

    // También verificar préstamos EN_MORA que deben pasar a CASTIGADO
    const prestamosEnMora = await db.tbl_prestamo.findMany({
      where: {
        deletedAt: null,
        estado: EstadoPrestamoEnum.EN_MORA,
      },
      include: {
        cuotas: {
          where: {
            deletedAt: null,
            estado: EstadoCuotaEnum.VENCIDA,
          },
        },
      },
    });

    for (const prestamo of prestamosEnMora) {
      if (prestamo.cuotas.length > 0) {
        try {
          const cuotaMasVencida = prestamo.cuotas.reduce((max, cuota) => {
            const diasMax = max.diasMoraAcumulados || 0;
            const diasCuota = cuota.diasMoraAcumulados || 0;
            return diasCuota > diasMax ? cuota : max;
          }, prestamo.cuotas[0]);

          const diasMoraMaximos = cuotaMasVencida.diasMoraAcumulados || 0;

          // Si supera el límite de castigo, actualizar
          if (diasMoraMaximos >= diasMoraCastigado) {
            await db.tbl_prestamo.update({
              where: { idprestamo: prestamo.idprestamo },
              data: {
                estado: EstadoPrestamoEnum.CASTIGADO,
              },
            });

            await db.tbl_auditoria.create({
              data: {
                idusuario: null,
                entidad: "tbl_prestamo",
                entidadId: prestamo.idprestamo,
                accion: "CASTIGAR_PRESTAMO_MORA",
                detalle: `Préstamo castigado automáticamente. Días de mora: ${diasMoraMaximos}. Préstamo: ${prestamo.codigo}`,
              },
            });

            prestamosActualizados++;
          }
        } catch (error) {
          errores.push(
            `Error actualizando préstamo ${prestamo.idprestamo}: ${error instanceof Error ? error.message : "Error desconocido"}`
          );
        }
      }
    }
  } catch (error) {
    errores.push(
      `Error obteniendo préstamos: ${error instanceof Error ? error.message : "Error desconocido"}`
    );
  }

  return { prestamosActualizados, errores };
}

/**
 * Detecta y marca promesas de pago vencidas como incumplidas
 * 
 * Registra eventos en auditoría para trazabilidad
 */
async function procesarPromesasVencidas(tx?: Prisma.TransactionClient): Promise<{
  promesasMarcadas: number;
  errores: string[];
}> {
  const db = tx || prisma;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let promesasMarcadas = 0;
  const errores: string[] = [];

  try {
    // Obtener promesas que:
    // 1. Están en estado PENDIENTE
    // 2. Tienen fecha de promesa pasada
    // 3. No tienen fecha de cumplimiento
    const promesasVencidas = await db.tbl_promesa_pago.findMany({
      where: {
        estado: EstadoPromesaEnum.PENDIENTE,
        fechaPromesa: {
          lt: hoy,
        },
        fechaCumplimiento: null,
      },
      include: {
        prestamo: {
          select: {
            idprestamo: true,
            codigo: true,
          },
        },
      },
    });

    // Marcar promesas como incumplidas
    for (const promesa of promesasVencidas) {
      try {
        await db.tbl_promesa_pago.update({
          where: { idpromesa: promesa.idpromesa },
          data: {
            estado: EstadoPromesaEnum.INCUMPLIDA,
          },
        });

        // Registrar auditoría
        await db.tbl_auditoria.create({
          data: {
            idusuario: null, // Sistema automático
            entidad: "tbl_promesa_pago",
            entidadId: promesa.idpromesa,
            accion: "MARCAR_PROMESA_INCUMPLIDA",
            detalle: `Promesa marcada como incumplida automáticamente. Fecha promesa: ${promesa.fechaPromesa.toISOString()}. Préstamo: ${promesa.prestamo.codigo}`,
          },
        });

        promesasMarcadas++;
      } catch (error) {
        errores.push(
          `Error marcando promesa ${promesa.idpromesa}: ${error instanceof Error ? error.message : "Error desconocido"}`
        );
      }
    }
  } catch (error) {
    errores.push(
      `Error obteniendo promesas vencidas: ${error instanceof Error ? error.message : "Error desconocido"}`
    );
  }

  return { promesasMarcadas, errores };
}

/**
 * Función principal que ejecuta todo el proceso de mora automática
 * 
 * Este proceso debe ejecutarse diariamente (recomendado: una vez al día en horario de baja actividad)
 * 
 * PROCESO:
 * 1. Recorre préstamos activos (EN_CURSO, EN_MORA)
 * 2. Calcula días de atraso para cuotas vencidas
 * 3. Aplica mora diaria configurable (considerando días de gracia)
 * 4. Cambia estados de cuotas (PENDIENTE/PARCIAL → VENCIDA)
 * 5. Cambia estados de préstamos (EN_CURSO → EN_MORA → CASTIGADO)
 * 6. Marca promesas vencidas como incumplidas
 * 7. Registra todos los eventos en auditoría
 * 
 * @param usarTransaccion Si usar transacción única para todo el proceso (default: false)
 * @returns Resultado del proceso con estadísticas y errores
 */
export async function ejecutarMoraAutomatica(
  usarTransaccion: boolean = false
): Promise<ResultadoMoraAutomatica> {
  const inicio = new Date();
  const errores: string[] = [];

  console.log(`[MORA AUTOMÁTICA] Iniciando proceso a las ${inicio.toISOString()}`);

  // Registrar inicio en auditoría
  try {
    await prisma.tbl_auditoria.create({
      data: {
        idusuario: null,
        entidad: "SISTEMA",
        entidadId: null,
        accion: "INICIAR_MORA_AUTOMATICA",
        detalle: `Inicio del proceso automático de cálculo de mora`,
      },
    });
  } catch (error) {
    console.error("[MORA AUTOMÁTICA] Error registrando inicio:", error);
  }

  if (usarTransaccion) {
    // Ejecutar todo en una transacción única
    try {
      const resultado = await prisma.$transaction(async (tx) => {
        // 1. Procesar cuotas vencidas
        console.log("[MORA AUTOMÁTICA] Procesando cuotas vencidas...");
        const { cuotasActualizadas, moraTotal, errores: erroresCuotas } =
          await procesarCuotasVencidas(tx);
        errores.push(...erroresCuotas);

        // 2. Actualizar estados de préstamos
        console.log("[MORA AUTOMÁTICA] Actualizando estados de préstamos...");
        const { prestamosActualizados, errores: erroresPrestamos } =
          await actualizarEstadosPrestamos(tx);
        errores.push(...erroresPrestamos);

        // 3. Procesar promesas vencidas
        console.log("[MORA AUTOMÁTICA] Procesando promesas vencidas...");
        const { promesasMarcadas, errores: erroresPromesas } =
          await procesarPromesasVencidas(tx);
        errores.push(...erroresPromesas);

        return {
          cuotasActualizadas,
          prestamosActualizados,
          promesasMarcadas,
          moraTotalCalculada: moraTotal,
          errores,
        };
      });

      const fin = new Date();
      const duracion = fin.getTime() - inicio.getTime();

      console.log(`[MORA AUTOMÁTICA] Proceso completado en ${duracion}ms`);
      console.log(`[MORA AUTOMÁTICA] Resultado:`, resultado);

      // Registrar fin en auditoría
      try {
        await prisma.tbl_auditoria.create({
          data: {
            idusuario: null,
            entidad: "SISTEMA",
            entidadId: null,
            accion: "FINALIZAR_MORA_AUTOMATICA",
            detalle: `Proceso completado. Cuotas: ${resultado.cuotasActualizadas}, Préstamos: ${resultado.prestamosActualizados}, Promesas: ${resultado.promesasMarcadas}, Mora: ${resultado.moraTotalCalculada.toFixed(2)}`,
          },
        });
      } catch (error) {
        console.error("[MORA AUTOMÁTICA] Error registrando fin:", error);
      }

      return resultado;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      errores.push(`Error en transacción: ${errorMsg}`);
      console.error("[MORA AUTOMÁTICA] Error en transacción:", error);

      return {
        cuotasActualizadas: 0,
        prestamosActualizados: 0,
        promesasMarcadas: 0,
        moraTotalCalculada: 0,
        errores,
      };
    }
  } else {
    // Ejecutar sin transacción (más flexible, permite continuar aunque falle una parte)
    // 1. Procesar cuotas vencidas (calcular mora y actualizar estados)
    console.log("[MORA AUTOMÁTICA] Procesando cuotas vencidas...");
    const { cuotasActualizadas, moraTotal, errores: erroresCuotas } =
      await procesarCuotasVencidas();
    errores.push(...erroresCuotas);

    // 2. Actualizar estados de préstamos
    console.log("[MORA AUTOMÁTICA] Actualizando estados de préstamos...");
    const { prestamosActualizados, errores: erroresPrestamos } =
      await actualizarEstadosPrestamos();
    errores.push(...erroresPrestamos);

    // 3. Procesar promesas vencidas
    console.log("[MORA AUTOMÁTICA] Procesando promesas vencidas...");
    const { promesasMarcadas, errores: erroresPromesas } =
      await procesarPromesasVencidas();
    errores.push(...erroresPromesas);

    const fin = new Date();
    const duracion = fin.getTime() - inicio.getTime();

    const resultado: ResultadoMoraAutomatica = {
      cuotasActualizadas,
      prestamosActualizados,
      promesasMarcadas,
      moraTotalCalculada: moraTotal,
      errores,
    };

    console.log(`[MORA AUTOMÁTICA] Proceso completado en ${duracion}ms`);
    console.log(`[MORA AUTOMÁTICA] Resultado:`, resultado);

    // Registrar fin en auditoría
    try {
      await prisma.tbl_auditoria.create({
        data: {
          idusuario: null,
          entidad: "SISTEMA",
          entidadId: null,
          accion: "FINALIZAR_MORA_AUTOMATICA",
          detalle: `Proceso completado. Cuotas: ${cuotasActualizadas}, Préstamos: ${prestamosActualizados}, Promesas: ${promesasMarcadas}, Mora: ${moraTotal.toFixed(2)}`,
        },
      });
    } catch (error) {
      console.error("[MORA AUTOMÁTICA] Error registrando fin:", error);
    }

    return resultado;
  }
}

