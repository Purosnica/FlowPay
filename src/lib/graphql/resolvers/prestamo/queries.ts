import { builder ,type  GraphQLContext } from "../../builder";

import {
  Prestamo,
  PrestamoPage,
  PrestamoFiltersInput,
  BandejaFiltersInput,
  BandejaPrestamoPage,
  HistorialEstadoPrestamoType,
  TimelinePrestamoEventoType,
  PrestamoFiltersSchema,
  BandejaFiltersSchema,
} from "./types";
import type { Prisma } from "@prisma/client";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { PERMISO } from "@/lib/permissions/permiso-codes";
import { filtroMandante, requerirAccesoMandante } from "@/lib/cobranza/mandante-scope";
import { listarBandejaCobrador } from "@/lib/cobranza/bandeja-cobrador-service";
import { listarHistorialEstados } from "@/lib/cobranza/estado-prestamo-service";
import { obtenerTimelinePrestamo } from "@/lib/cobranza/prestamo-timeline-service";
import {
  buildPaginationMeta,
  resolvePagination,
} from "../../helpers/graphql-helpers";
import { TIMELINE_PRESTAMO_LIMITE_MAX } from "@/lib/cobranza/performance-limits";

builder.queryField("prestamo", (t) =>
  t.prismaField({
    type: Prestamo,
    nullable: true,
    args: { id: t.arg.int({ required: true }) },
    resolve: async (query, _parent, args, ctx) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const mandanteFilter = await filtroMandante(ctx.usuario?.idusuario);
      return ctx.prisma.tbl_prestamo.findFirst({
        ...(query as Record<string, unknown>),
        where: {
          idprestamo: args.id,
          deletedAt: null,
          idmandante: mandanteFilter,
        },
      }) as never;
    },
  }),
);

builder.queryField("prestamos", (t) =>
  t.field({
    type: PrestamoPage,
    args: {
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
      filters: t.arg({ type: PrestamoFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const filters = PrestamoFiltersSchema.parse(args.filters ?? {});
      const mandanteFilter = await filtroMandante(ctx.usuario?.idusuario);

      const where: Prisma.tbl_prestamoWhereInput = {
        deletedAt: null,
        idmandante: filters.idmandante ?? mandanteFilter,
      };

      if (filters.idcampana) where.idcampana = filters.idcampana;
      if (filters.idcliente) where.idcliente = filters.idcliente;
      if (filters.idgestorAsignado) where.idgestorAsignado = filters.idgestorAsignado;
      if (filters.estado) where.estado = filters.estado;
      if (filters.search) {
        where.OR = [
          { noPrestamo: { contains: filters.search } },
          { codigoUnico: { contains: filters.search } },
        ];
      }

      if (filters.idmandante) {
        await requerirAccesoMandante(ctx.usuario?.idusuario, filters.idmandante);
      }

      const [prestamos, total] = await Promise.all([
        ctx.prisma.tbl_prestamo.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { diasMora: "desc" },
          include: {
            cliente: {
              select: {
                idcliente: true,
                primer_nombres: true,
                segundo_nombres: true,
                primer_apellido: true,
                segundo_apellido: true,
                numerodocumento: true,
              },
            },
            mandante: { select: { idmandante: true, nombre: true, codigo: true } },
            gestor: { select: { idusuario: true, nombre: true } },
          },
        }),
        ctx.prisma.tbl_prestamo.count({ where }),
      ]);

      return { prestamos, ...buildPaginationMeta(total, page, pageSize) };
    },
  }),
);

builder.queryField("prestamosPorCliente", (t) =>
  t.field({
    type: [Prestamo],
    args: {
      idcliente: t.arg.int({ required: true }),
      limit: t.arg.int({ required: false, defaultValue: 30 }),
    },
    resolve: async (_parent, args, ctx) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const mandanteFilter = await filtroMandante(ctx.usuario?.idusuario);
      const take = Math.min(Math.max(args.limit ?? 30, 1), 100);
      return ctx.prisma.tbl_prestamo.findMany({
        where: {
          idcliente: args.idcliente,
          deletedAt: null,
          idmandante: mandanteFilter,
        },
        orderBy: { diasMora: "desc" },
        take,
        include: {
          mandante: { select: { idmandante: true, nombre: true } },
          gestor: { select: { idusuario: true, nombre: true } },
        },
      });
    },
  }),
);

builder.queryField('bandejaCobrador', (t) =>
  t.field({
    type: BandejaPrestamoPage,
    args: {
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 50 }),
      filters: t.arg({ type: BandejaFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      if (!ctx.usuario) {
        return {
          prestamos: [],
          ...buildPaginationMeta(0, 1, 50),
        };
      }
      const { page, pageSize } = resolvePagination(args.page, args.pageSize, 50);
      const filtersResult = BandejaFiltersSchema.safeParse(args.filters ?? {});
      const filters = filtersResult.success ? filtersResult.data : {};
      const mandanteFilter = await filtroMandante(ctx.usuario.idusuario);

      if (filters.idmandante) {
        await requerirAccesoMandante(ctx.usuario.idusuario, filters.idmandante);
      }

      const resultado = await listarBandejaCobrador(
        ctx.usuario.idusuario,
        mandanteFilter,
        filters,
        page,
        pageSize,
      );

      return {
        prestamos: resultado.prestamos.map((p) => ({
          prestamo: p as Record<string, unknown>,
          scorePrioridad: p.scorePrioridad ?? null,
          motivoPrioridad: p.motivoPrioridad ?? null,
        })),
        total: resultado.total,
        page: resultado.page,
        pageSize: resultado.pageSize,
        totalPages: resultado.totalPages,
      };
    },
  }),
);

builder.queryField('historialEstadosPrestamo', (t) =>
  t.field({
    type: [HistorialEstadoPrestamoType],
    args: {
      idprestamo: t.arg.int({ required: true }),
      limit: t.arg.int({ required: false, defaultValue: 50 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo: args.idprestamo },
      });
      if (!prestamo || prestamo.deletedAt) {
        return [];
      }
      await requerirAccesoMandante(ctx.usuario?.idusuario, prestamo.idmandante);
      return listarHistorialEstados(args.idprestamo, args.limit ?? 50);
    },
  }),
);

builder.queryField('timelinePrestamo', (t) =>
  t.field({
    type: [TimelinePrestamoEventoType],
    args: {
      idprestamo: t.arg.int({ required: true }),
      limite: t.arg.int({ required: false, defaultValue: 50 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        return [];
      }
      return obtenerTimelinePrestamo(
        idusuario,
        args.idprestamo,
        Math.min(Math.max(args.limite ?? 50, 1), TIMELINE_PRESTAMO_LIMITE_MAX),
      );
    },
  }),
);
