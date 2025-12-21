/**
 * RESOLVERS PARA LIQUIDACIÓN DE TERCEROS
 * 
 * IMPORTANTE: Este módulo asegura que NO se mezclen fondos propios con fondos de terceros.
 * Solo se incluyen en las liquidaciones:
 * - Comisiones de préstamos TERCERIZADOS
 * - Comisiones que NO estén ya liquidadas
 * - Comisiones del período especificado
 */

import { builder } from "../../builder";
import {
  CreateLiquidacionTerceroInput,
  CreateLiquidacionTerceroInputSchema,
  UpdateLiquidacionTerceroInput,
  UpdateLiquidacionTerceroInputSchema,
  LiquidacionTercero,
  LiquidacionTerceroFiltersInput,
  LiquidacionTerceroPage,
  ResumenLiquidacionTercero,
  DetallePagoLiquidacion,
  ComisionDetalle,
} from "./types";
import { EstadoLiquidacionEnum, TipoPrestamoEnum, Prisma } from "@prisma/client";
import { requerirPermiso } from "@/lib/permissions/permission-service";

const logAuditoria = async (
  ctx: any,
  data: { idusuario?: number | null; entidad: string; entidadId?: number; accion: string; detalle?: string }
) => {
  await ctx.prisma.tbl_auditoria.create({
    data: {
      idusuario: data.idusuario ?? null,
      entidad: data.entidad,
      entidadId: data.entidadId ?? null,
      accion: data.accion,
      detalle: data.detalle,
    },
  });
};

/**
 * Valida que un préstamo sea TERCERIZADO (no propio)
 */
async function validarPrestamoTercerizado(ctx: any, idprestamo: number): Promise<boolean> {
  const prestamo = await ctx.prisma.tbl_prestamo.findFirst({
    where: { idprestamo, deletedAt: null },
    select: { tipoprestamo: true },
  });

  if (!prestamo) {
    throw new Error("Préstamo no encontrado");
  }

  if (prestamo.tipoprestamo !== TipoPrestamoEnum.TERCERIZADO) {
    throw new Error("Solo se pueden liquidar comisiones de préstamos TERCERIZADOS");
  }

  return true;
}

/**
 * Crea una liquidación y calcula automáticamente las comisiones del período
 */
builder.mutationField("createLiquidacionTercero", (t) =>
  t.field({
    type: LiquidacionTercero,
    args: {
      input: t.arg({ type: CreateLiquidacionTerceroInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      const input = CreateLiquidacionTerceroInputSchema.parse(args.input);

      // Validar permiso
      await requerirPermiso(input.idusuarioCreador, "MANAGE_THIRD_PARTY");

      // Validar que el período sea válido
      if (input.periodoHasta < input.periodoDesde) {
        throw new Error("La fecha de fin del período debe ser posterior a la fecha de inicio");
      }

      // Validar que la empresa existe
      const empresa = await ctx.prisma.tbl_empresa_tercera.findFirst({
        where: { idempresa: input.idempresa, deletedAt: null },
      });

      if (!empresa) {
        throw new Error("Empresa tercera no encontrada");
      }

      // Buscar comisiones no liquidadas del período para esta empresa
      // IMPORTANTE: Solo préstamos TERCERIZADOS
      const comisionesPendientes = await ctx.prisma.tbl_comision_generada.findMany({
        where: {
          idempresa: input.idempresa,
          liquidada: false,
          fechaGeneracion: {
            gte: input.periodoDesde,
            lte: input.periodoHasta,
          },
          prestamo: {
            tipoprestamo: TipoPrestamoEnum.TERCERIZADO, // CRÍTICO: Solo tercerizados
            deletedAt: null,
          },
        },
        include: {
          prestamo: {
            select: {
              idprestamo: true,
              tipoprestamo: true,
              codigo: true,
            },
          },
        },
      });

      // Validar que todas las comisiones sean de préstamos tercerizados
      for (const comision of comisionesPendientes) {
        if (comision.prestamo.tipoprestamo !== TipoPrestamoEnum.TERCERIZADO) {
          throw new Error(
            `La comisión ${comision.idcomision} pertenece a un préstamo propio. No se puede incluir en liquidación de terceros.`
          );
        }
      }

      // Calcular totales
      const montoTotal = comisionesPendientes.reduce(
        (sum, c) => sum + Number(c.montoComision),
        0
      );

      // Crear liquidación en transacción
      const liquidacion = await ctx.prisma.$transaction(async (tx) => {
        // Crear liquidación
        const nuevaLiquidacion = await tx.tbl_liquidacion_tercero.create({
          data: {
            idempresa: input.idempresa,
            idusuarioCreador: input.idusuarioCreador,
            idusuarioAutorizador: input.idusuarioAutorizador,
            codigo: input.codigo,
            periodoDesde: input.periodoDesde,
            periodoHasta: input.periodoHasta,
            estado: EstadoLiquidacionEnum.PENDIENTE,
            montoTotalComisiones: montoTotal,
            numeroComisiones: comisionesPendientes.length,
            observaciones: input.observaciones,
          },
        });

        // Asociar comisiones a la liquidación y marcarlas como liquidadas
        for (const comision of comisionesPendientes) {
          await tx.tbl_comision_generada.update({
            where: { idcomision: comision.idcomision },
            data: {
              idliquidacion: nuevaLiquidacion.idliquidacion,
              liquidada: true,
            },
          });
        }

        // Registrar en auditoría (dentro de la transacción)
        await tx.tbl_auditoria.create({
          data: {
            idusuario: input.idusuarioCreador,
            entidad: "tbl_liquidacion_tercero",
            entidadId: nuevaLiquidacion.idliquidacion,
            accion: "CREAR_LIQUIDACION_TERCERO",
            detalle: `Liquidación ${input.codigo} creada para empresa ${empresa.nombre}. ${comisionesPendientes.length} comisiones, monto total: ${montoTotal}`,
          },
        });

        return nuevaLiquidacion;
      });

      return liquidacion as any;
    },
  })
);

/**
 * Actualiza el estado de una liquidación (LIQUIDADO, PAGADO, etc.)
 */
builder.mutationField("updateLiquidacionTercero", (t) =>
  t.prismaField({
    type: LiquidacionTercero,
    args: {
      input: t.arg({ type: UpdateLiquidacionTerceroInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idliquidacion, ...dataInput } = UpdateLiquidacionTerceroInputSchema.parse(args.input);

      const liquidacionActual = await ctx.prisma.tbl_liquidacion_tercero.findFirst({
        where: { idliquidacion, deletedAt: null },
      });

      if (!liquidacionActual) {
        throw new Error("Liquidación no encontrada o eliminada");
      }

      // Validar permiso
      await requerirPermiso(
        dataInput.idusuarioAutorizador || liquidacionActual.idusuarioCreador,
        "MANAGE_THIRD_PARTY"
      );

      // Preparar datos de actualización
      const updateData: any = { ...dataInput };

      // Si se cambia el estado a LIQUIDADO, establecer fecha de liquidación
      if (dataInput.estado === EstadoLiquidacionEnum.LIQUIDADO && !liquidacionActual.fechaLiquidacion) {
        updateData.fechaLiquidacion = dataInput.fechaLiquidacion || new Date();
      }

      // Si se cambia el estado a PAGADO, establecer fecha de pago
      if (dataInput.estado === EstadoLiquidacionEnum.PAGADO && !liquidacionActual.fechaPago) {
        updateData.fechaPago = dataInput.fechaPago || new Date();
      }

      const liquidacion = await ctx.prisma.tbl_liquidacion_tercero.update({
        ...(query as any),
        where: { idliquidacion },
        data: updateData,
      });

      await logAuditoria(ctx, {
        idusuario: dataInput.idusuarioAutorizador || liquidacionActual.idusuarioCreador,
        entidad: "tbl_liquidacion_tercero",
        entidadId: liquidacion.idliquidacion,
        accion: "ACTUALIZAR_LIQUIDACION_TERCERO",
        detalle: `Liquidación ${liquidacion.codigo} actualizada. Estado: ${liquidacion.estado}`,
      });

      return liquidacion as any;
    },
  })
);

/**
 * Query para obtener una liquidación por ID
 */
builder.queryField("liquidacionTercero", (t) =>
  t.prismaField({
    type: LiquidacionTercero,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return (await ctx.prisma.tbl_liquidacion_tercero.findFirst({
        ...(query as any),
        where: { idliquidacion: args.id, deletedAt: null },
      })) as any;
    },
  })
);

/**
 * Query para listar liquidaciones con filtros y paginación
 */
builder.queryField("liquidacionesTercero", (t) =>
  t.field({
    type: LiquidacionTerceroPage,
    args: {
      filters: t.arg({ type: LiquidacionTerceroFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const filters = (args.filters || {}) as { page?: number; pageSize?: number; [key: string]: any };
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const skip = (page - 1) * pageSize;

      const where: Prisma.tbl_liquidacion_terceroWhereInput = {
        deletedAt: null,
      };

      if (filters.idempresa) where.idempresa = filters.idempresa;
      if (filters.estado) where.estado = filters.estado;
      if (filters.periodoDesde || filters.periodoHasta) {
        where.periodoDesde = {};
        if (filters.periodoDesde) where.periodoDesde.gte = filters.periodoDesde;
        if (filters.periodoHasta) where.periodoDesde.lte = filters.periodoHasta;
      }
      if (filters.fechaLiquidacionDesde || filters.fechaLiquidacionHasta) {
        where.fechaLiquidacion = {};
        if (filters.fechaLiquidacionDesde) where.fechaLiquidacion.gte = filters.fechaLiquidacionDesde;
        if (filters.fechaLiquidacionHasta) where.fechaLiquidacion.lte = filters.fechaLiquidacionHasta;
      }

      const [liquidaciones, total] = await Promise.all([
        ctx.prisma.tbl_liquidacion_tercero.findMany({
          skip,
          take: pageSize,
          where,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.tbl_liquidacion_tercero.count({ where }),
      ]);

      return {
        liquidaciones,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  })
);

/**
 * Query para obtener resumen de liquidaciones por tercero en un período
 */
builder.queryField("resumenLiquidacionTercero", (t) =>
  t.field({
    type: ResumenLiquidacionTercero,
    args: {
      idempresa: t.arg.int({ required: true }),
      periodoDesde: t.arg({ type: "DateTime", required: true }),
      periodoHasta: t.arg({ type: "DateTime", required: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Validar permiso
      await requerirPermiso(args.idusuario, "VIEW_REPORTS");

      // Validar que el período sea válido
      if (args.periodoHasta < args.periodoDesde) {
        throw new Error("La fecha de fin del período debe ser posterior a la fecha de inicio");
      }

      // Obtener empresa
      const empresa = await ctx.prisma.tbl_empresa_tercera.findFirst({
        where: { idempresa: args.idempresa, deletedAt: null },
      });

      if (!empresa) {
        throw new Error("Empresa tercera no encontrada");
      }

      // Obtener todas las liquidaciones del período para esta empresa
      const liquidaciones = await ctx.prisma.tbl_liquidacion_tercero.findMany({
        where: {
          idempresa: args.idempresa,
          deletedAt: null,
          OR: [
            {
              periodoDesde: {
                lte: args.periodoHasta,
              },
              periodoHasta: {
                gte: args.periodoDesde,
              },
            },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      // Calcular estadísticas
      const totalLiquidaciones = liquidaciones.length;
      const montoTotalComisiones = liquidaciones.reduce(
        (sum, l) => sum + Number(l.montoTotalComisiones),
        0
      );
      const montoTotalLiquidado = liquidaciones.reduce(
        (sum, l) => sum + Number(l.montoTotalLiquidado || 0),
        0
      );
      const montoTotalPagado = liquidaciones.reduce(
        (sum, l) => sum + Number(l.montoTotalPagado || 0),
        0
      );

      const liquidacionesPendientes = liquidaciones.filter(
        (l) => l.estado === EstadoLiquidacionEnum.PENDIENTE
      ).length;
      const liquidacionesLiquidadas = liquidaciones.filter(
        (l) => l.estado === EstadoLiquidacionEnum.LIQUIDADO
      ).length;
      const liquidacionesPagadas = liquidaciones.filter(
        (l) => l.estado === EstadoLiquidacionEnum.PAGADO
      ).length;

      return {
        idempresa: args.idempresa,
        empresa,
        periodoDesde: args.periodoDesde,
        periodoHasta: args.periodoHasta,
        totalLiquidaciones,
        montoTotalComisiones,
        montoTotalLiquidado,
        montoTotalPagado,
        liquidacionesPendientes,
        liquidacionesLiquidadas,
        liquidacionesPagadas,
        liquidaciones,
      };
    },
  })
);

/**
 * Query para obtener detalle de pagos asociados a comisiones de una liquidación
 */
builder.queryField("detallePagosLiquidacion", (t) =>
  t.field({
    type: [DetallePagoLiquidacion],
    args: {
      idliquidacion: t.arg.int({ required: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Validar permiso
      await requerirPermiso(args.idusuario, "VIEW_REPORTS");

      // Obtener liquidación
      const liquidacion = await ctx.prisma.tbl_liquidacion_tercero.findFirst({
        where: { idliquidacion: args.idliquidacion, deletedAt: null },
        include: {
          comisiones: {
            where: { idpago: { not: null } },
            include: {
              prestamo: {
                include: {
                  cliente: {
                    select: {
                      primer_nombres: true,
                      primer_apellido: true,
                      numerodocumento: true,
                    },
                  },
                },
              },
              pago: {
                select: {
                  idpago: true,
                  idprestamo: true,
                  fechaPago: true,
                  montoTotal: true,
                  montoCapital: true,
                  montoInteres: true,
                  montoMora: true,
                  metodoPago: true,
                },
              },
            },
          },
        },
      });

      if (!liquidacion) {
        throw new Error("Liquidación no encontrada");
      }

      // Agrupar comisiones por pago
      const pagosMap = new Map<number, any>();

      for (const comision of liquidacion.comisiones) {
        if (!comision.pago) continue;

        const idpago = comision.pago.idpago;
        if (!pagosMap.has(idpago)) {
          pagosMap.set(idpago, {
            idpago,
            idprestamo: comision.pago.idprestamo,
            codigoPrestamo: comision.prestamo.codigo,
            cliente: `${comision.prestamo.cliente.primer_nombres} ${comision.prestamo.cliente.primer_apellido}`,
            documentoCliente: comision.prestamo.cliente.numerodocumento,
            fechaPago: comision.pago.fechaPago,
            montoTotal: Number(comision.pago.montoTotal),
            montoCapital: Number(comision.pago.montoCapital),
            montoInteres: Number(comision.pago.montoInteres),
            montoMora: Number(comision.pago.montoMora),
            metodoPago: comision.pago.metodoPago,
            comisiones: [],
          });
        }

        const pago = pagosMap.get(idpago)!;
        pago.comisiones.push({
          idcomision: comision.idcomision,
          codigoPrestamo: comision.prestamo.codigo,
          cliente: `${comision.prestamo.cliente.primer_nombres} ${comision.prestamo.cliente.primer_apellido}`,
          documentoCliente: comision.prestamo.cliente.numerodocumento,
          fechaGeneracion: comision.fechaGeneracion,
          montoBase: Number(comision.montoBase),
          montoComision: Number(comision.montoComision),
          descripcion: comision.descripcion,
          fechaPago: comision.pago.fechaPago,
          montoPago: Number(comision.pago.montoTotal),
          idpago: comision.pago.idpago,
        });
      }

      return Array.from(pagosMap.values());
    },
  })
);

/**
 * Query para obtener detalle de comisiones de una liquidación
 */
builder.queryField("detalleComisionesLiquidacion", (t) =>
  t.field({
    type: [ComisionDetalle],
    args: {
      idliquidacion: t.arg.int({ required: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Validar permiso
      await requerirPermiso(args.idusuario, "VIEW_REPORTS");

      // Obtener liquidación con comisiones
      const liquidacion = await ctx.prisma.tbl_liquidacion_tercero.findFirst({
        where: { idliquidacion: args.idliquidacion, deletedAt: null },
        include: {
          comisiones: {
            include: {
              prestamo: {
                include: {
                  cliente: {
                    select: {
                      primer_nombres: true,
                      primer_apellido: true,
                      numerodocumento: true,
                    },
                  },
                },
              },
              pago: {
                select: {
                  idpago: true,
                  fechaPago: true,
                  montoTotal: true,
                },
              },
            },
            orderBy: { fechaGeneracion: "asc" },
          },
        },
      });

      if (!liquidacion) {
        throw new Error("Liquidación no encontrada");
      }

      return liquidacion.comisiones.map((c) => ({
        idcomision: c.idcomision,
        codigoPrestamo: c.prestamo.codigo,
        cliente: `${c.prestamo.cliente.primer_nombres} ${c.prestamo.cliente.primer_apellido}`,
        documentoCliente: c.prestamo.cliente.numerodocumento,
        fechaGeneracion: c.fechaGeneracion,
        montoBase: Number(c.montoBase),
        montoComision: Number(c.montoComision),
        descripcion: c.descripcion,
        fechaPago: c.pago?.fechaPago || null,
        montoPago: c.pago ? Number(c.pago.montoTotal) : null,
        idpago: c.pago?.idpago || null,
      }));
    },
  })
);

