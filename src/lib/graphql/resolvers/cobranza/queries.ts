import { builder } from "../../builder";
import {
  Acuerdo,
  AcuerdoPage,
  AcuerdoFiltersInput,
  AcuerdoFiltersSchema,
  GestionCobro,
  GestionCobroPage,
  GestionCobroFiltersInput,
  GestionCobroFiltersSchema,
  AsignacionCartera,
  AsignacionCarteraPage,
  AsignacionCarteraFiltersInput,
  AsignacionCarteraFiltersSchema,
  ResultadoGestion,
} from "./types";
import { Prisma } from "@prisma/client";

// ======================================================
// QUERIES ACUERDOS
// ======================================================

builder.queryField("acuerdo", (t) =>
  t.prismaField({
    type: Acuerdo,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return (await ctx.prisma.tbl_acuerdo.findFirst({
        ...(query as any),
        where: { idacuerdo: args.id, deletedAt: null },
      })) as any;
    },
  })
);

builder.queryField("acuerdos", (t) =>
  t.field({
    type: AcuerdoPage,
    args: {
      filters: t.arg({ type: AcuerdoFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const filters = AcuerdoFiltersSchema.parse(args.filters || {});
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const skip = (page - 1) * pageSize;

      const where: Prisma.tbl_acuerdoWhereInput = {
        deletedAt: null,
      };

      if (filters.idprestamo) where.idprestamo = filters.idprestamo;
      if (filters.idusuario) where.idusuario = filters.idusuario;
      if (filters.tipoAcuerdo) where.tipoAcuerdo = filters.tipoAcuerdo;
      if (filters.estado) where.estado = filters.estado;
      if (filters.fechaDesde || filters.fechaHasta) {
        where.fechaInicio = {};
        if (filters.fechaDesde) where.fechaInicio.gte = filters.fechaDesde;
        if (filters.fechaHasta) where.fechaInicio.lte = filters.fechaHasta;
      }

      const [acuerdos, total] = await Promise.all([
        ctx.prisma.tbl_acuerdo.findMany({
          skip,
          take: pageSize,
          where,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.tbl_acuerdo.count({ where }),
      ]);

      return {
        acuerdos,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  })
);

builder.queryField("acuerdosPorPrestamo", (t) =>
  t.field({
    type: [Acuerdo],
    args: {
      idprestamo: t.arg.int({ required: true }),
      activos: t.arg.boolean({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const where: Prisma.tbl_acuerdoWhereInput = {
        idprestamo: args.idprestamo,
        deletedAt: null,
      };

      if (args.activos) {
        where.estado = "ACTIVO";
        where.fechaFin = { gte: new Date() };
      }

      return ctx.prisma.tbl_acuerdo.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    },
  })
);

builder.queryField("acuerdosVencidos", (t) =>
  t.field({
    type: AcuerdoPage,
    args: {
      filters: t.arg({ type: AcuerdoFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const filters = AcuerdoFiltersSchema.parse(args.filters || {});
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const skip = (page - 1) * pageSize;

      const where: Prisma.tbl_acuerdoWhereInput = {
        deletedAt: null,
        estado: "VENCIDO",
        fechaFin: { lt: new Date() },
      };

      if (filters.idusuario) where.idusuario = filters.idusuario;

      const [acuerdos, total] = await Promise.all([
        ctx.prisma.tbl_acuerdo.findMany({
          skip,
          take: pageSize,
          where,
          orderBy: { fechaFin: "asc" },
        }),
        ctx.prisma.tbl_acuerdo.count({ where }),
      ]);

      return {
        acuerdos,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  })
);

// ======================================================
// QUERIES GESTIONES DE COBRANZA
// ======================================================

builder.queryField("gestionCobro", (t) =>
  t.prismaField({
    type: GestionCobro,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return (await ctx.prisma.tbl_gestion_cobro.findFirst({
        ...(query as any),
        where: { idgestion: args.id },
      })) as any;
    },
  })
);

builder.queryField("gestionesCobro", (t) =>
  t.field({
    type: GestionCobroPage,
    args: {
      filters: t.arg({ type: GestionCobroFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const filters = GestionCobroFiltersSchema.parse(args.filters || {});
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const skip = (page - 1) * pageSize;

      const where: Prisma.tbl_gestion_cobroWhereInput = {};

      if (filters.idprestamo) where.idprestamo = filters.idprestamo;
      if (filters.idusuario) where.idusuario = filters.idusuario;
      if (filters.tipoGestion) where.tipoGestion = filters.tipoGestion;
      if (filters.estado) where.estado = filters.estado as any;
      if (filters.fechaDesde || filters.fechaHasta) {
        where.fechaGestion = {};
        if (filters.fechaDesde) where.fechaGestion.gte = filters.fechaDesde;
        if (filters.fechaHasta) where.fechaGestion.lte = filters.fechaHasta;
      }

      const [gestiones, total] = await Promise.all([
        ctx.prisma.tbl_gestion_cobro.findMany({
          skip,
          take: pageSize,
          where,
          orderBy: { fechaGestion: "desc" },
        }),
        ctx.prisma.tbl_gestion_cobro.count({ where }),
      ]);

      return {
        gestiones,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  })
);

builder.queryField("gestionesPorPrestamo", (t) =>
  t.field({
    type: [GestionCobro],
    args: {
      idprestamo: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      return ctx.prisma.tbl_gestion_cobro.findMany({
        where: {
          idprestamo: args.idprestamo,
        },
        orderBy: { fechaGestion: "desc" },
      });
    },
  })
);

builder.queryField("gestionesPendientes", (t) =>
  t.field({
    type: GestionCobroPage,
    args: {
      filters: t.arg({ type: GestionCobroFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const filters = GestionCobroFiltersSchema.parse(args.filters || {});
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const skip = (page - 1) * pageSize;

      const where: Prisma.tbl_gestion_cobroWhereInput = {
        estado: "PENDIENTE",
        OR: [
          { proximaAccion: null },
          { proximaAccion: { lte: new Date() } },
        ],
      };

      if (filters.idusuario) where.idusuario = filters.idusuario;

      const [gestiones, total] = await Promise.all([
        ctx.prisma.tbl_gestion_cobro.findMany({
          skip,
          take: pageSize,
          where,
          orderBy: { proximaAccion: "asc" },
        }),
        ctx.prisma.tbl_gestion_cobro.count({ where }),
      ]);

      return {
        gestiones,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  })
);

// ======================================================
// QUERIES RESULTADOS DE GESTIÓN (CATÁLOGO)
// ======================================================

builder.queryField("resultadosGestion", (t) =>
  t.field({
    type: [ResultadoGestion],
    args: {
      activos: t.arg.boolean({ required: false, defaultValue: true }),
    },
    resolve: async (_parent, args, ctx) => {
      const where: Prisma.tbl_resultado_gestionWhereInput = {
        deletedAt: null,
      };

      if (args.activos) {
        where.estado = true;
      }

      return ctx.prisma.tbl_resultado_gestion.findMany({
        where,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);

// ======================================================
// QUERIES ASIGNACIONES DE CARTERA
// ======================================================

builder.queryField("asignacionCartera", (t) =>
  t.prismaField({
    type: AsignacionCartera,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return (await ctx.prisma.tbl_asignacion_cartera.findFirst({
        ...(query as any),
        where: { idasignacion: args.id, deletedAt: null },
      })) as any;
    },
  })
);

builder.queryField("asignacionesCartera", (t) =>
  t.field({
    type: AsignacionCarteraPage,
    args: {
      filters: t.arg({ type: AsignacionCarteraFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const filters = AsignacionCarteraFiltersSchema.parse(args.filters || {});
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const skip = (page - 1) * pageSize;

      const where: Prisma.tbl_asignacion_carteraWhereInput = {
        deletedAt: null,
      };

      if (filters.idprestamo) where.idprestamo = filters.idprestamo;
      if (filters.idusuario) where.idusuario = filters.idusuario;
      if (filters.activa !== undefined) where.activa = filters.activa;

      const [asignaciones, total] = await Promise.all([
        ctx.prisma.tbl_asignacion_cartera.findMany({
          skip,
          take: pageSize,
          where,
          orderBy: { fechaAsignacion: "desc" },
        }),
        ctx.prisma.tbl_asignacion_cartera.count({ where }),
      ]);

      return {
        asignaciones,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  })
);

builder.queryField("carteraPorCobrador", (t) =>
  t.field({
    type: "Int",
    args: {
      idusuario: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      return ctx.prisma.tbl_asignacion_cartera.count({
        where: {
          idusuario: args.idusuario,
          activa: true,
          deletedAt: null,
        },
      });
    },
  })
);

builder.queryField("prestamosAsignadosACobrador", (t) =>
  t.field({
    type: "Int",
    args: {
      idusuario: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      const asignaciones = await ctx.prisma.tbl_asignacion_cartera.findMany({
        where: {
          idusuario: args.idusuario,
          activa: true,
          deletedAt: null,
        },
        select: {
          idprestamo: true,
        },
      });

      return asignaciones.length;
    },
  })
);



