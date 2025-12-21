/**
 * RESOLVERS PARA REPORTES Y KPIs
 * 
 * Este módulo implementa reportes avanzados con queries optimizadas para grandes volúmenes.
 * 
 * OPTIMIZACIONES:
 * - Uso de agregaciones SQL cuando es posible
 * - Índices en campos clave
 * - Cálculos en base de datos cuando es factible
 * - Paginación y límites para evitar sobrecarga
 */

import { builder } from "../../builder";
import {
  ReporteFiltersInput,
  AgingCartera,
  AgingCarteraItem,
  RecuperacionRealVsEsperada,
  RecuperacionItem,
  RankingGestores,
  RankingGestorItem,
  MoraPromedio,
  MoraPromedioItem,
  DashboardKPIs,
  PrestamosUltimos30Dias,
  PromesasVencidasHoy,
} from "./types";
import { EstadoPrestamoEnum, EstadoCuotaEnum, TipoPrestamoEnum, EstadoPromesaEnum, Prisma } from "@prisma/client";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { GraphQLAuthenticationError } from "@/lib/errors/graphql-errors";

/**
 * Calcula días de atraso desde una fecha de vencimiento
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
 * Query optimizada para Aging de Cartera
 * 
 * Agrupa préstamos por rangos de días de atraso:
 * - 0-30 días
 * - 31-60 días
 * - 61-90 días
 * - 91-120 días
 * - Más de 120 días
 */
builder.queryField("agingCartera", (t) =>
  t.field({
    type: AgingCartera,
    args: {
      filters: t.arg({ type: ReporteFiltersInput, required: false }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Obtener idusuario del contexto o de args
      const idusuario = ctx.usuario?.idusuario || args.idusuario;
      
      // Validar permiso (requerido para ver reportes)
      if (!idusuario) {
        throw new GraphQLAuthenticationError("Debes estar autenticado para ver los reportes del dashboard");
      }
      
      await requerirPermiso(idusuario, "VIEW_REPORTS");
      const filters = (args.filters || {}) as { tipoprestamo?: string; [key: string]: any };

      const where: Prisma.tbl_prestamoWhereInput = {
        deletedAt: null,
        estado: {
          in: [EstadoPrestamoEnum.EN_CURSO, EstadoPrestamoEnum.EN_MORA],
        },
      };

      if (filters.tipoprestamo) where.tipoprestamo = filters.tipoprestamo as any;
      if (filters.idusuarioGestor) where.idusuarioGestor = filters.idusuarioGestor;

      // Obtener préstamos con sus cuotas vencidas (optimizado)
      const prestamos = await ctx.prisma.tbl_prestamo.findMany({
        where,
        select: {
          idprestamo: true,
          montoDesembolsado: true,
          cuotas: {
            where: {
              deletedAt: null,
              estado: {
                in: [EstadoCuotaEnum.VENCIDA, EstadoCuotaEnum.PENDIENTE],
              },
              fechaVencimiento: {
                lt: new Date(),
              },
            },
            select: {
              fechaVencimiento: true,
              capitalProgramado: true,
              capitalPagado: true,
            },
            orderBy: { fechaVencimiento: "desc" },
            take: 1, // Solo la cuota más reciente vencida
          },
        },
      });

      // Definir rangos de aging
      const rangos = [
        { nombre: "0-30 días", min: 0, max: 30 },
        { nombre: "31-60 días", min: 31, max: 60 },
        { nombre: "61-90 días", min: 61, max: 90 },
        { nombre: "91-120 días", min: 91, max: 120 },
        { nombre: "Más de 120 días", min: 121, max: Infinity },
      ];

      // Inicializar contadores
      const agingData = rangos.map((rango) => ({
        rango: rango.nombre,
        diasMin: rango.min,
        diasMax: rango.max === Infinity ? 9999 : rango.max,
        cantidad: 0,
        monto: 0,
        porcentaje: 0,
      }));

      let total = 0;
      let montoTotal = 0;

      // Procesar cada préstamo
      for (const prestamo of prestamos) {
        if (prestamo.cuotas.length === 0) continue;

        const cuotaVencida = prestamo.cuotas[0];
        const diasAtraso = calcularDiasAtraso(cuotaVencida.fechaVencimiento);
        const saldoPendiente =
          Number(cuotaVencida.capitalProgramado) - Number(cuotaVencida.capitalPagado);
        const monto = prestamo.montoDesembolsado
          ? Number(prestamo.montoDesembolsado)
          : saldoPendiente;

        // Encontrar rango
        const rangoIndex = rangos.findIndex(
          (r) => diasAtraso >= r.min && (r.max === Infinity || diasAtraso <= r.max)
        );

        if (rangoIndex >= 0) {
          agingData[rangoIndex].cantidad++;
          agingData[rangoIndex].monto += monto;
          total++;
          montoTotal += monto;
        }
      }

      // Calcular porcentajes
      if (montoTotal > 0) {
        agingData.forEach((item) => {
          item.porcentaje = (item.monto / montoTotal) * 100;
        });
      }

      return {
        items: agingData,
        total,
        montoTotal,
      };
    },
  })
);

/**
 * Query para Recuperación Real vs Esperada
 * 
 * Compara los pagos reales recibidos vs los pagos programados en cuotas
 */
builder.queryField("recuperacionRealVsEsperada", (t) =>
  t.field({
    type: RecuperacionRealVsEsperada,
    args: {
      filters: t.arg({ type: ReporteFiltersInput, required: false }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Obtener idusuario del contexto o de args
      const idusuario = ctx.usuario?.idusuario || args.idusuario;
      
      // Validar permiso (requerido para ver reportes)
      if (!idusuario) {
        throw new GraphQLAuthenticationError("Debes estar autenticado para ver los reportes del dashboard");
      }
      
      await requerirPermiso(idusuario, "VIEW_REPORTS");
      const filters = (args.filters || {}) as { tipoprestamo?: string; [key: string]: any };

      const fechaDesde = filters.fechaDesde || new Date(new Date().getFullYear(), 0, 1); // Inicio del año
      const fechaHasta = filters.fechaHasta || new Date();

      const where: Prisma.tbl_prestamoWhereInput = {
        deletedAt: null,
        estado: {
          in: [EstadoPrestamoEnum.EN_CURSO, EstadoPrestamoEnum.EN_MORA, EstadoPrestamoEnum.PAGADO],
        },
      };

      if (filters.tipoprestamo) where.tipoprestamo = filters.tipoprestamo as any;

      // Obtener cuotas con pagos (optimizado)
      const cuotas = await ctx.prisma.tbl_cuota.findMany({
        where: {
          deletedAt: null,
          fechaVencimiento: {
            gte: fechaDesde,
            lte: fechaHasta,
          },
          prestamo: where,
        },
        select: {
          fechaVencimiento: true,
          capitalProgramado: true,
          interesProgramado: true,
          capitalPagado: true,
          interesPagado: true,
          pagos: {
            where: { deletedAt: null },
            select: {
              montoCapital: true,
              montoInteres: true,
              fechaPago: true,
            },
          },
        },
      });

      // Agrupar por mes
      const porMes = new Map<string, { esperado: number; real: number }>();

      for (const cuota of cuotas) {
        const mes = cuota.fechaVencimiento.toISOString().substring(0, 7); // YYYY-MM
        const montoEsperado =
          Number(cuota.capitalProgramado) + Number(cuota.interesProgramado);

        if (!porMes.has(mes)) {
          porMes.set(mes, { esperado: 0, real: 0 });
        }

        const mesData = porMes.get(mes)!;
        mesData.esperado += montoEsperado;

        // Sumar pagos reales
        const montoReal = cuota.pagos.reduce(
          (sum, p) => sum + Number(p.montoCapital) + Number(p.montoInteres),
          0
        );
        mesData.real += montoReal;
      }

      // Convertir a array y calcular métricas
      const items = Array.from(porMes.entries())
        .map(([periodo, datos]) => {
          const porcentaje = datos.esperado > 0 ? (datos.real / datos.esperado) * 100 : 0;
          return {
            periodo,
            montoEsperado: datos.esperado,
            montoReal: datos.real,
            porcentajeRecuperacion: porcentaje,
            diferencia: datos.real - datos.esperado,
          };
        })
        .sort((a, b) => a.periodo.localeCompare(b.periodo));

      const montoTotalEsperado = items.reduce((sum, item) => sum + item.montoEsperado, 0);
      const montoTotalReal = items.reduce((sum, item) => sum + item.montoReal, 0);
      const porcentajeTotal =
        montoTotalEsperado > 0 ? (montoTotalReal / montoTotalEsperado) * 100 : 0;

      return {
        items,
        montoTotalEsperado,
        montoTotalReal,
        porcentajeTotalRecuperacion: porcentajeTotal,
      };
    },
  })
);

/**
 * Query optimizada para Ranking de Gestores
 * 
 * Calcula métricas por gestor: cantidad de préstamos, monto total, recuperación, mora promedio
 */
builder.queryField("rankingGestores", (t) =>
  t.field({
    type: RankingGestores,
    args: {
      filters: t.arg({ type: ReporteFiltersInput, required: false }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Obtener idusuario del contexto o de args
      const idusuario = ctx.usuario?.idusuario || args.idusuario;
      
      // Validar permiso (requerido para ver reportes)
      if (!idusuario) {
        throw new GraphQLAuthenticationError("Debes estar autenticado para ver los reportes del dashboard");
      }
      
      await requerirPermiso(idusuario, "VIEW_REPORTS");
      const filters = (args.filters || {}) as { tipoprestamo?: string; [key: string]: any };

      const fechaDesde = filters.fechaDesde || new Date(new Date().getFullYear(), 0, 1);
      const fechaHasta = filters.fechaHasta || new Date();

      const where: Prisma.tbl_prestamoWhereInput = {
        deletedAt: null,
        idusuarioGestor: { not: null },
        estado: {
          in: [EstadoPrestamoEnum.EN_CURSO, EstadoPrestamoEnum.EN_MORA, EstadoPrestamoEnum.PAGADO],
        },
        createdAt: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      };

      if (filters.tipoprestamo) where.tipoprestamo = filters.tipoprestamo as any;

      // Obtener préstamos con gestores (optimizado con select específico)
      const prestamos = await ctx.prisma.tbl_prestamo.findMany({
        where,
        select: {
          idprestamo: true,
          idusuarioGestor: true,
          montoDesembolsado: true,
          usuarioGestor: {
            select: {
              idusuario: true,
              nombre: true,
              email: true,
            },
          },
          cuotas: {
            where: { deletedAt: null },
            select: {
              capitalProgramado: true,
              capitalPagado: true,
              interesProgramado: true,
              interesPagado: true,
              moraProgramada: true,
              moraPagada: true,
              diasMoraAcumulados: true,
            },
          },
          pagos: {
            where: { deletedAt: null },
            select: {
              montoCapital: true,
              montoInteres: true,
            },
          },
        },
      });

      // Agrupar por gestor
      const porGestor = new Map<
        number,
        {
          usuario: { idusuario: number; nombre: string; email: string };
          prestamos: typeof prestamos;
        }
      >();

      for (const prestamo of prestamos) {
        if (!prestamo.idusuarioGestor || !prestamo.usuarioGestor) continue;

        if (!porGestor.has(prestamo.idusuarioGestor)) {
          porGestor.set(prestamo.idusuarioGestor, {
            usuario: prestamo.usuarioGestor,
            prestamos: [],
          });
        }

        porGestor.get(prestamo.idusuarioGestor)!.prestamos.push(prestamo);
      }

      // Calcular métricas por gestor
      const ranking = Array.from(porGestor.values()).map((gestorData) => {
        const prestamos = gestorData.prestamos;
        const cantidadPrestamos = prestamos.length;

        let montoTotal = 0;
        let montoRecuperado = 0;
        let moraTotal = 0;
        let moraCount = 0;

        for (const prestamo of prestamos) {
          const monto = prestamo.montoDesembolsado
            ? Number(prestamo.montoDesembolsado)
            : 0;
          montoTotal += monto;

          // Calcular recuperado
          const recuperado = prestamo.pagos.reduce(
            (sum, p) => sum + Number(p.montoCapital) + Number(p.montoInteres),
            0
          );
          montoRecuperado += recuperado;

          // Calcular mora promedio
          for (const cuota of prestamo.cuotas) {
            if (cuota.diasMoraAcumulados > 0) {
              moraTotal += cuota.diasMoraAcumulados;
              moraCount++;
            }
          }
        }

        const porcentajeRecuperacion = montoTotal > 0 ? (montoRecuperado / montoTotal) * 100 : 0;
        const moraPromedio = moraCount > 0 ? moraTotal / moraCount : 0;

        return {
          idusuario: gestorData.usuario.idusuario,
          nombre: gestorData.usuario.nombre,
          email: gestorData.usuario.email,
          cantidadPrestamos,
          montoTotal,
          montoRecuperado,
          porcentajeRecuperacion,
          moraPromedio,
          posicion: 0, // Se asignará después del sort
        };
      });

      // Ordenar por porcentaje de recuperación (descendente)
      ranking.sort((a, b) => b.porcentajeRecuperacion - a.porcentajeRecuperacion);

      // Asignar posiciones
      ranking.forEach((item, index) => {
        item.posicion = index + 1;
      });

      const periodo = `${fechaDesde.toISOString().substring(0, 10)} - ${fechaHasta.toISOString().substring(0, 10)}`;

      return {
        items: ranking,
        periodo,
      };
    },
  })
);

/**
 * Query para Mora Promedio
 * 
 * Calcula la mora promedio por período (mensual)
 */
builder.queryField("moraPromedio", (t) =>
  t.field({
    type: MoraPromedio,
    args: {
      filters: t.arg({ type: ReporteFiltersInput, required: false }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Obtener idusuario del contexto o de args
      const idusuario = ctx.usuario?.idusuario || args.idusuario;
      
      // Validar permiso (requerido para ver reportes)
      if (!idusuario) {
        throw new GraphQLAuthenticationError("Debes estar autenticado para ver los reportes del dashboard");
      }
      
      await requerirPermiso(idusuario, "VIEW_REPORTS");
      const filters = (args.filters || {}) as { tipoprestamo?: string; [key: string]: any };

      const fechaDesde = filters.fechaDesde || new Date(new Date().getFullYear(), 0, 1);
      const fechaHasta = filters.fechaHasta || new Date();

      const where: Prisma.tbl_prestamoWhereInput = {
        deletedAt: null,
        estado: {
          in: [EstadoPrestamoEnum.EN_CURSO, EstadoPrestamoEnum.EN_MORA],
        },
      };

      if (filters.tipoprestamo) where.tipoprestamo = filters.tipoprestamo as any;
      if (filters.idusuarioGestor) where.idusuarioGestor = filters.idusuarioGestor;

      // Obtener cuotas con mora (optimizado)
      const cuotas = await ctx.prisma.tbl_cuota.findMany({
        where: {
          deletedAt: null,
          estado: EstadoCuotaEnum.VENCIDA,
          diasMoraAcumulados: { gt: 0 },
          fechaVencimiento: {
            gte: fechaDesde,
            lte: fechaHasta,
          },
          prestamo: where,
        },
        select: {
          fechaVencimiento: true,
          diasMoraAcumulados: true,
          moraProgramada: true,
        },
      });

      // Agrupar por mes
      const porMes = new Map<
        string,
        { moraTotal: number; moraDiasTotal: number; cantidad: number }
      >();

      for (const cuota of cuotas) {
        const mes = cuota.fechaVencimiento.toISOString().substring(0, 7); // YYYY-MM

        if (!porMes.has(mes)) {
          porMes.set(mes, { moraTotal: 0, moraDiasTotal: 0, cantidad: 0 });
        }

        const mesData = porMes.get(mes)!;
        mesData.moraTotal += Number(cuota.moraProgramada);
        mesData.moraDiasTotal += cuota.diasMoraAcumulados;
        mesData.cantidad++;
      }

      // Convertir a array y calcular promedios
      const items = Array.from(porMes.entries())
        .map(([periodo, datos]) => {
          const moraPromedio = datos.cantidad > 0 ? datos.moraDiasTotal / datos.cantidad : 0;
          return {
            periodo,
            moraPromedio,
            cantidadPrestamos: datos.cantidad,
            montoTotalMora: datos.moraTotal,
          };
        })
        .sort((a, b) => a.periodo.localeCompare(b.periodo));

      // Calcular mora promedio general
      const moraDiasTotal = items.reduce((sum, item) => sum + item.moraPromedio * item.cantidadPrestamos, 0);
      const cantidadTotal = items.reduce((sum, item) => sum + item.cantidadPrestamos, 0);
      const moraPromedioGeneral = cantidadTotal > 0 ? moraDiasTotal / cantidadTotal : 0;

      return {
        items,
        moraPromedioGeneral,
      };
    },
  })
);

/**
 * Query para Dashboard KPIs (consolidado)
 * 
 * Retorna todos los KPIs principales del dashboard en una sola query optimizada
 */
builder.queryField("dashboardKPIs", (t) =>
  t.field({
    type: DashboardKPIs,
    args: {
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Obtener idusuario del contexto o de args
      const idusuario = ctx.usuario?.idusuario || args.idusuario;
      
      // Validar permiso (requerido para ver reportes)
      if (!idusuario) {
        throw new GraphQLAuthenticationError("Debes estar autenticado para ver los reportes del dashboard");
      }
      
      await requerirPermiso(idusuario, "VIEW_REPORTS");

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const hace30Dias = new Date(hoy);
      hace30Dias.setDate(hace30Dias.getDate() - 30);

      // Query optimizada: obtener múltiples métricas en paralelo
      const [
        totalPrestadoResult,
        totalRecuperadoResult,
        carteraActivaResult,
        carteraVencidaResult,
        moraResult,
        promesasResult,
        prestamos30DiasResult,
      ] = await Promise.all([
        // Total prestado (solo préstamos desembolsados, excluyendo castigados)
        ctx.prisma.tbl_prestamo.aggregate({
          where: {
            deletedAt: null,
            montoDesembolsado: { not: null },
            estado: { not: EstadoPrestamoEnum.CASTIGADO },
          },
          _sum: {
            montoDesembolsado: true,
          },
        }),

        // Total recuperado (suma de pagos, excluyendo préstamos castigados)
        ctx.prisma.tbl_pago.aggregate({
          where: {
            deletedAt: null,
            prestamo: {
              deletedAt: null,
              estado: { not: EstadoPrestamoEnum.CASTIGADO },
            },
          },
          _sum: {
            montoTotal: true,
          },
        }),

        // Cartera activa (EN_CURSO, no castigados)
        ctx.prisma.tbl_prestamo.aggregate({
          where: {
            deletedAt: null,
            estado: EstadoPrestamoEnum.EN_CURSO,
          },
          _sum: {
            montoDesembolsado: true,
          },
        }),

        // Cartera vencida (EN_MORA, no castigados)
        ctx.prisma.tbl_prestamo.aggregate({
          where: {
            deletedAt: null,
            estado: EstadoPrestamoEnum.EN_MORA,
          },
          _sum: {
            montoDesembolsado: true,
          },
        }),

        // Mora promedio (días de mora promedio)
        ctx.prisma.tbl_cuota.aggregate({
          where: {
            deletedAt: null,
            estado: EstadoCuotaEnum.VENCIDA,
            diasMoraAcumulados: { gt: 0 },
            prestamo: {
              deletedAt: null,
              estado: { in: [EstadoPrestamoEnum.EN_CURSO, EstadoPrestamoEnum.EN_MORA] },
            },
          },
          _avg: {
            diasMoraAcumulados: true,
          },
        }),

        // Promesas vencidas hoy
        ctx.prisma.tbl_promesa_pago.count({
          where: {
            estado: EstadoPromesaEnum.PENDIENTE,
            fechaPromesa: { lt: hoy },
            prestamo: {
              deletedAt: null,
            },
          },
        }),

        // Préstamos emitidos últimos 30 días
        ctx.prisma.tbl_prestamo.count({
          where: {
            deletedAt: null,
            fechaDesembolso: {
              gte: hace30Dias,
              lte: hoy,
            },
            estado: { not: EstadoPrestamoEnum.BORRADOR },
          },
        }),
      ]);

      return {
        totalPrestado: Number(totalPrestadoResult._sum.montoDesembolsado || 0),
        totalRecuperado: Number(totalRecuperadoResult._sum.montoTotal || 0),
        carteraActiva: Number(carteraActivaResult._sum.montoDesembolsado || 0),
        carteraVencida: Number(carteraVencidaResult._sum.montoDesembolsado || 0),
        moraPromedio: Number(moraResult._avg.diasMoraAcumulados || 0),
        promesasVencidasHoy: promesasResult,
        prestamosUltimos30Dias: prestamos30DiasResult,
      };
    },
  })
);

/**
 * Query para préstamos emitidos en los últimos 30 días (con detalle diario)
 */
builder.queryField("prestamosUltimos30Dias", (t) =>
  t.field({
    type: PrestamosUltimos30Dias,
    args: {
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Obtener idusuario del contexto o de args
      const idusuario = ctx.usuario?.idusuario || args.idusuario;
      
      // Validar permiso (requerido para ver reportes)
      if (!idusuario) {
        throw new GraphQLAuthenticationError("Debes estar autenticado para ver los reportes del dashboard");
      }
      
      await requerirPermiso(idusuario, "VIEW_REPORTS");

      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      const hace30Dias = new Date(hoy);
      hace30Dias.setDate(hace30Dias.getDate() - 30);
      hace30Dias.setHours(0, 0, 0, 0);

      // Obtener préstamos desembolsados en los últimos 30 días
      const prestamos = await ctx.prisma.tbl_prestamo.findMany({
        where: {
          deletedAt: null,
          fechaDesembolso: {
            gte: hace30Dias,
            lte: hoy,
          },
          estado: { not: EstadoPrestamoEnum.BORRADOR },
        },
        select: {
          fechaDesembolso: true,
          montoDesembolsado: true,
        },
      });

      // Agrupar por fecha
      const porFecha = new Map<string, { cantidad: number; montoTotal: number }>();

      for (const prestamo of prestamos) {
        if (!prestamo.fechaDesembolso) continue;
        const fecha = prestamo.fechaDesembolso.toISOString().split("T")[0];

        if (!porFecha.has(fecha)) {
          porFecha.set(fecha, { cantidad: 0, montoTotal: 0 });
        }

        const data = porFecha.get(fecha)!;
        data.cantidad++;
        data.montoTotal += Number(prestamo.montoDesembolsado || 0);
      }

      // Convertir a array y ordenar por fecha
      const items = Array.from(porFecha.entries())
        .map(([fecha, data]) => ({
          fecha,
          cantidad: data.cantidad,
          montoTotal: data.montoTotal,
        }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      const total = prestamos.length;
      const montoTotal = prestamos.reduce(
        (sum, p) => sum + Number(p.montoDesembolsado || 0),
        0
      );

      return {
        total,
        montoTotal,
        items,
      };
    },
  })
);

/**
 * Query para promesas vencidas hoy
 */
builder.queryField("promesasVencidasHoy", (t) =>
  t.field({
    type: PromesasVencidasHoy,
    args: {
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Obtener idusuario del contexto o de args
      const idusuario = ctx.usuario?.idusuario || args.idusuario;
      
      // Validar permiso (requerido para ver reportes)
      if (!idusuario) {
        throw new GraphQLAuthenticationError("Debes estar autenticado para ver los reportes del dashboard");
      }
      
      await requerirPermiso(idusuario, "VIEW_REPORTS");

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Obtener promesas vencidas hoy
      const promesas = await ctx.prisma.tbl_promesa_pago.findMany({
        where: {
          estado: EstadoPromesaEnum.PENDIENTE,
          fechaPromesa: { lt: hoy },
          prestamo: {
            deletedAt: null,
          },
        },
        include: {
          prestamo: {
            include: {
              cliente: {
                select: {
                  primer_nombres: true,
                  primer_apellido: true,
                },
              },
              usuarioGestor: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
        orderBy: { fechaPromesa: "asc" },
      });

      // Calcular días vencidos y preparar datos
      const items = promesas.map((promesa) => {
        const diasVencidos = Math.floor(
          (hoy.getTime() - promesa.fechaPromesa.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          idpromesa: promesa.idpromesa,
          idprestamo: promesa.idprestamo,
          codigoPrestamo: promesa.prestamo.codigo,
          cliente: `${promesa.prestamo.cliente.primer_nombres} ${promesa.prestamo.cliente.primer_apellido}`,
          fechaPromesa: promesa.fechaPromesa,
          montoCompromiso: Number(promesa.montoCompromiso),
          diasVencidos,
          gestor: promesa.prestamo.usuarioGestor?.nombre || null,
        };
      });

      const total = items.length;
      const montoTotal = items.reduce((sum, item) => sum + item.montoCompromiso, 0);

      return {
        total,
        montoTotal,
        items,
      };
    },
  })
);

