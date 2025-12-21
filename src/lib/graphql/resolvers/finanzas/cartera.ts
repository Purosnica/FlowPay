import { builder } from "../../builder";
import { CarteraFiltersInput, CarteraItem, CarteraPage } from "./types";
import { EstadoPrestamoEnum, EstadoCuotaEnum, Prisma } from "@prisma/client";
import { requerirPermiso } from "@/lib/permissions/permission-service";

// Función auxiliar para calcular días de atraso
const calcularDiasAtraso = (fechaVencimiento: Date): number => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  const diffTime = hoy.getTime() - vencimiento.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

// Función auxiliar para determinar nivel de riesgo
const determinarNivelRiesgo = (diasAtraso: number, saldoPendiente: number): string => {
  if (diasAtraso === 0) return "BAJO";
  if (diasAtraso <= 30) return "MEDIO";
  if (diasAtraso <= 60) return "ALTO";
  return "CRITICO";
};

// Función auxiliar para calcular saldo pendiente de un préstamo
const calcularSaldoPendiente = async (
  idprestamo: number,
  prisma: any
): Promise<number> => {
  // Obtener todas las cuotas del préstamo
  const cuotas = await prisma.tbl_cuota.findMany({
    where: { idprestamo, deletedAt: null },
  });

  // Calcular saldo pendiente: suma de capital programado - capital pagado
  let saldo = 0;
  for (const cuota of cuotas) {
    const capitalPendiente =
      Number(cuota.capitalProgramado) - Number(cuota.capitalPagado);
    if (capitalPendiente > 0) {
      saldo += capitalPendiente;
    }
  }

  return saldo;
};

// Query principal de cartera
builder.queryField("cartera", (t) =>
  t.field({
    type: CarteraPage,
    args: {
      filters: t.arg({ type: CarteraFiltersInput, required: false }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Validar permiso
      await requerirPermiso(args.idusuario, "VIEW_PORTFOLIO");

      const filters = (args.filters || {}) as { page?: number; pageSize?: number; idcobrador?: number; estado?: EstadoPrestamoEnum; fechaDesde?: Date; fechaHasta?: Date; tipo?: string; tipoprestamo?: string; idusuarioGestor?: number; search?: string; diasAtrasoMin?: number; diasAtrasoMax?: number; montoMin?: number; montoMax?: number };
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const skip = (page - 1) * pageSize;

      const where: Prisma.tbl_prestamoWhereInput = {
        deletedAt: null,
      };

      // Filtro por tipo de cartera
      // Por defecto, excluir préstamos castigados de los reportes normales
      if (filters.tipo === "activa") {
        where.estado = EstadoPrestamoEnum.EN_CURSO;
      } else if (filters.tipo === "mora") {
        where.estado = EstadoPrestamoEnum.EN_MORA;
      } else if (filters.tipo === "castigada") {
        where.estado = EstadoPrestamoEnum.CASTIGADO;
      } else {
        // Si no se especifica tipo, excluir castigados por defecto
        where.estado = {
          not: EstadoPrestamoEnum.CASTIGADO,
        };
      }

      // Filtros adicionales
      if (filters.tipoprestamo) where.tipoprestamo = filters.tipoprestamo as any;
      if (filters.idusuarioGestor) where.idusuarioGestor = filters.idusuarioGestor;
      if (filters.search) {
        where.OR = [
          { codigo: { contains: filters.search } },
          { referencia: { contains: filters.search } },
        ];
      }

      // Obtener préstamos
      const prestamos = await ctx.prisma.tbl_prestamo.findMany({
        skip,
        take: pageSize,
        where,
        include: {
          cliente: true,
          usuarioGestor: true,
          cuotas: {
            where: { deletedAt: null },
            orderBy: { fechaVencimiento: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const total = await ctx.prisma.tbl_prestamo.count({ where });

      // Procesar cada préstamo para calcular métricas de cartera
      const items = await Promise.all(
        prestamos.map(async (prestamo) => {
          // Encontrar la cuota más reciente vencida o pendiente
          const cuotaVencida = prestamo.cuotas.find(
            (c) =>
              c.estado === EstadoCuotaEnum.VENCIDA ||
              (c.estado === EstadoCuotaEnum.PENDIENTE &&
                new Date(c.fechaVencimiento) < new Date())
          );

          // Calcular días de atraso
          let diasAtraso = 0;
          if (cuotaVencida) {
            diasAtraso = calcularDiasAtraso(cuotaVencida.fechaVencimiento);
          }

          // Calcular saldo pendiente
          const saldoPendiente = await calcularSaldoPendiente(
            prestamo.idprestamo,
            ctx.prisma
          );

          // Determinar nivel de riesgo
          const nivelRiesgo = determinarNivelRiesgo(diasAtraso, saldoPendiente);

          return {
            prestamo,
            diasAtraso,
            saldoPendiente,
            cuotaVencida: cuotaVencida || null,
            nivelRiesgo,
          };
        })
      );

      // Aplicar filtros de segmentación post-procesamiento
      let filteredItems = items;

      // Filtro por días de atraso
      if (filters.diasAtrasoMin !== undefined || filters.diasAtrasoMax !== undefined) {
        filteredItems = filteredItems.filter((item) => {
          if (filters.diasAtrasoMin !== undefined && item.diasAtraso < filters.diasAtrasoMin) {
            return false;
          }
          if (filters.diasAtrasoMax !== undefined && item.diasAtraso > filters.diasAtrasoMax) {
            return false;
          }
          return true;
        });
      }

      // Filtro por monto
      if (filters.montoMin !== undefined || filters.montoMax !== undefined) {
        filteredItems = filteredItems.filter((item) => {
          const monto = item.saldoPendiente || Number(item.prestamo.montoDesembolsado || 0);
          if (filters.montoMin !== undefined && monto < filters.montoMin) {
            return false;
          }
          if (filters.montoMax !== undefined && monto > filters.montoMax) {
            return false;
          }
          return true;
        });
      }

      return {
        items: filteredItems,
        total: filteredItems.length, // Nota: esto no es exacto con filtros post-procesamiento
        page,
        pageSize,
        totalPages: Math.ceil(filteredItems.length / pageSize),
      };
    },
  })
);

