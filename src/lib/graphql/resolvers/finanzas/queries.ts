import { builder } from "../../builder";
import {
  Cuota,
  CuotaPage,
  Pago,
  PagoPage,
  Prestamo,
  PrestamoFiltersInput,
  PrestamoPage,
  Reestructuracion,
  ReestructuracionFiltersInput,
  ReestructuracionPage,
  GQLEstadoCuota,
} from "./types";
import { EstadoCuotaEnum, Prisma } from "@prisma/client";

// ======================================================
// QUERIES PRÉSTAMOS
// ======================================================

builder.queryField("prestamo", (t) =>
  t.prismaField({
    type: Prestamo,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return (await ctx.prisma.tbl_prestamo.findFirst({
        ...(query as any),
        where: { idprestamo: args.id, deletedAt: null },
      })) as any;
    },
  })
);

builder.queryField("prestamos", (t) =>
  t.field({
    type: PrestamoPage,
    args: {
      filters: t.arg({ type: PrestamoFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const filters = (args.filters || {}) as { page?: number; pageSize?: number; [key: string]: any };
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const skip = (page - 1) * pageSize;

      const where: Prisma.tbl_prestamoWhereInput = {
        deletedAt: null,
      };

      if (filters.idcliente) where.idcliente = filters.idcliente;
      if (filters.estado) where.estado = filters.estado;
      if (filters.tipoprestamo) where.tipoprestamo = filters.tipoprestamo;
      if (filters.search) {
        where.OR = [
          { codigo: { contains: filters.search } },
          { referencia: { contains: filters.search } },
        ];
      }

      const [prestamos, total] = await Promise.all([
        ctx.prisma.tbl_prestamo.findMany({
          skip,
          take: pageSize,
          where,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.tbl_prestamo.count({ where }),
      ]);

      return {
        prestamos,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  })
);

// ======================================================
// QUERIES CUOTAS
// ======================================================

builder.queryField("cuota", (t) =>
  t.prismaField({
    type: Cuota,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return (await ctx.prisma.tbl_cuota.findFirst({
        ...(query as any),
        where: { idcuota: args.id, deletedAt: null },
      })) as any;
    },
  })
);

builder.queryField("cuotasPorPrestamo", (t) =>
  t.field({
    type: CuotaPage,
    args: {
      idprestamo: t.arg.int({ required: true }),
      estado: t.arg({ type: GQLEstadoCuota, required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const where: Prisma.tbl_cuotaWhereInput = {
        idprestamo: args.idprestamo,
        deletedAt: null,
      };
      if (args.estado) where.estado = args.estado as EstadoCuotaEnum;

      const [cuotas, total] = await Promise.all([
        ctx.prisma.tbl_cuota.findMany({
          where,
          orderBy: [{ fechaVencimiento: "asc" }, { numero: "asc" }],
        }),
        ctx.prisma.tbl_cuota.count({ where }),
      ]);

      return { cuotas, total };
    },
  })
);

// ======================================================
// QUERIES PAGOS
// ======================================================

builder.queryField("pago", (t) =>
  t.prismaField({
    type: Pago,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return (await ctx.prisma.tbl_pago.findFirst({
        ...(query as any),
        where: { idpago: args.id, deletedAt: null },
      })) as any;
    },
  })
);

builder.queryField("pagosPorPrestamo", (t) =>
  t.field({
    type: PagoPage,
    args: {
      idprestamo: t.arg.int({ required: true }),
      idcuota: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const where: Prisma.tbl_pagoWhereInput = {
        idprestamo: args.idprestamo,
        deletedAt: null,
      };
      if (args.idcuota) where.idcuota = args.idcuota;

      const [pagos, total] = await Promise.all([
        ctx.prisma.tbl_pago.findMany({
          where,
          orderBy: { fechaPago: "desc" },
        }),
        ctx.prisma.tbl_pago.count({ where }),
      ]);

      return { pagos, total };
    },
  })
);

// ======================================================
// QUERIES REESTRUCTURACIÓN
// ======================================================

builder.queryField("reestructuracion", (t) =>
  t.prismaField({
    type: Reestructuracion,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return (await ctx.prisma.tbl_reestructuracion.findFirst({
        ...(query as any),
        where: { idreestructuracion: args.id, deletedAt: null },
      })) as any;
    },
  })
);

builder.queryField("reestructuraciones", (t) =>
  t.field({
    type: ReestructuracionPage,
    args: {
      filters: t.arg({ type: ReestructuracionFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const filters = (args.filters || {}) as { page?: number; pageSize?: number; [key: string]: any };
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const skip = (page - 1) * pageSize;

      const where: Prisma.tbl_reestructuracionWhereInput = {
        deletedAt: null,
      };

      if (filters.idprestamoOriginal) where.idprestamoOriginal = filters.idprestamoOriginal;
      if (filters.idprestamoNuevo) where.idprestamoNuevo = filters.idprestamoNuevo;
      if (filters.idusuarioSolicitante) where.idusuarioSolicitante = filters.idusuarioSolicitante;
      if (filters.idusuarioAutorizador) where.idusuarioAutorizador = filters.idusuarioAutorizador;
      if (filters.fechaDesde || filters.fechaHasta) {
        where.fechaReestructuracion = {};
        if (filters.fechaDesde) where.fechaReestructuracion.gte = filters.fechaDesde;
        if (filters.fechaHasta) where.fechaReestructuracion.lte = filters.fechaHasta;
      }

      const [reestructuraciones, total] = await Promise.all([
        ctx.prisma.tbl_reestructuracion.findMany({
          skip,
          take: pageSize,
          where,
          orderBy: { fechaReestructuracion: "desc" },
        }),
        ctx.prisma.tbl_reestructuracion.count({ where }),
      ]);

      return {
        reestructuraciones,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  })
);

builder.queryField("reestructuracionesPorPrestamo", (t) =>
  t.field({
    type: [Reestructuracion],
    args: {
      idprestamo: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      // Buscar reestructuraciones donde el préstamo es el original
      return ctx.prisma.tbl_reestructuracion.findMany({
        where: {
          idprestamoOriginal: args.idprestamo,
          deletedAt: null,
        },
        orderBy: { fechaReestructuracion: "desc" },
      });
    },
  })
);



