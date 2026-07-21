import { builder, type GraphQLContext } from '../../builder';

import { z } from 'zod';
import {
  Agencia,
  AgenciaPage,
  Ruta,
  RutaPage,
  PrestamoCorte,
} from '../contrato-mandante/types';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import {
  actualizarAgencia,
  actualizarRuta,
  crearAgencia,
  crearRuta,
  eliminarAgencia,
  eliminarRuta,
} from '@/lib/cobranza/agencia-service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../helpers/graphql-helpers';
import { createPageType } from '../../helpers/create-page-type';
import { resolvePaginatedPrismaQuery } from '../../helpers/paginated-prisma-resolver';

const PrestamoCortePage = createPageType(
  'PrestamoCortePage',
  PrestamoCorte,
  'cortes',
);

const CreateAgenciaInput = builder.inputType('CreateAgenciaInput', {
  fields: (t) => ({
    codigo: t.string({ required: true }),
    nombre: t.string({ required: true }),
    estado: t.boolean({ required: false }),
  }),
});

const UpdateAgenciaInput = builder.inputType('UpdateAgenciaInput', {
  fields: (t) => ({
    idagencia: t.int({ required: true }),
    codigo: t.string({ required: false }),
    nombre: t.string({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

const CreateRutaInput = builder.inputType('CreateRutaInput', {
  fields: (t) => ({
    idagencia: t.int({ required: true }),
    nombre: t.string({ required: true }),
    estado: t.boolean({ required: false }),
  }),
});

const UpdateRutaInput = builder.inputType('UpdateRutaInput', {
  fields: (t) => ({
    idruta: t.int({ required: true }),
    idagencia: t.int({ required: false }),
    nombre: t.string({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

const CreateAgenciaSchema = z.object({
  codigo: z.string().min(1).max(50),
  nombre: z.string().min(1).max(200),
  estado: z.boolean().optional(),
});

const UpdateAgenciaSchema = z.object({
  idagencia: z.number().int().positive(),
  codigo: z.string().min(1).max(50).optional(),
  nombre: z.string().min(1).max(200).optional(),
  estado: z.boolean().optional(),
});

const CreateRutaSchema = z.object({
  idagencia: z.number().int().positive(),
  nombre: z.string().min(1).max(200),
  estado: z.boolean().optional(),
});

const UpdateRutaSchema = z.object({
  idruta: z.number().int().positive(),
  idagencia: z.number().int().positive().optional(),
  nombre: z.string().min(1).max(200).optional(),
  estado: z.boolean().optional(),
});

builder.queryField('agencias', (t) =>
  t.field({
    type: AgenciaPage,
    args: {
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
      incluirInactivas: t.arg.boolean({ required: false, defaultValue: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);

      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const where = {
        deletedAt: null,
        ...(args.incluirInactivas ? {} : { estado: true }),
      };

      const [agencias, total] = await Promise.all([
        ctx.prisma.tbl_agencia.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { nombre: 'asc' },
        }),
        ctx.prisma.tbl_agencia.count({ where }),
      ]);

      return {
        agencias,
        ...buildPaginationMeta(total, page, pageSize),
      };
    },
  }),
);

builder.queryField('rutas', (t) =>
  t.field({
    type: RutaPage,
    args: {
      idagencia: t.arg.int({ required: false }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
      incluirInactivas: t.arg.boolean({ required: false, defaultValue: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);

      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const where = {
        deletedAt: null,
        ...(args.incluirInactivas ? {} : { estado: true }),
        idagencia: args.idagencia ?? undefined,
      };

      const [rutas, total] = await Promise.all([
        ctx.prisma.tbl_ruta.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { nombre: 'asc' },
          include: { agencia: true },
        }),
        ctx.prisma.tbl_ruta.count({ where }),
      ]);

      return {
        rutas,
        ...buildPaginationMeta(total, page, pageSize),
      };
    },
  }),
);

builder.mutationField('createAgencia', (t) =>
  t.prismaField({
    type: Agencia,
    args: { input: t.arg({ type: CreateAgenciaInput, required: true }) },
    resolve: async (_query, _p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = CreateAgenciaSchema.parse(args.input);
      return crearAgencia(data);
    },
  }),
);

builder.mutationField('updateAgencia', (t) =>
  t.prismaField({
    type: Agencia,
    args: { input: t.arg({ type: UpdateAgenciaInput, required: true }) },
    resolve: async (_query, _p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = UpdateAgenciaSchema.parse(args.input);
      return actualizarAgencia(data);
    },
  }),
);

builder.mutationField('deleteAgencia', (t) =>
  t.field({
    type: 'Boolean',
    args: { idagencia: t.arg.int({ required: true }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      return eliminarAgencia(args.idagencia);
    },
  }),
);

builder.mutationField('createRuta', (t) =>
  t.prismaField({
    type: Ruta,
    args: { input: t.arg({ type: CreateRutaInput, required: true }) },
    resolve: async (_query, _p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = CreateRutaSchema.parse(args.input);
      return crearRuta(data);
    },
  }),
);

builder.mutationField('updateRuta', (t) =>
  t.prismaField({
    type: Ruta,
    args: { input: t.arg({ type: UpdateRutaInput, required: true }) },
    resolve: async (_query, _p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = UpdateRutaSchema.parse(args.input);
      return actualizarRuta(data);
    },
  }),
);

builder.mutationField('deleteRuta', (t) =>
  t.field({
    type: 'Boolean',
    args: { idruta: t.arg.int({ required: true }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      return eliminarRuta(args.idruta);
    },
  }),
);

builder.queryField('cortesPrestamo', (t) =>
  t.field({
    type: PrestamoCortePage,
    args: {
      idprestamo: t.arg.int({ required: true }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo: args.idprestamo },
      });
      if (!prestamo || prestamo.deletedAt) {
        throw new GraphQLValidationError('Préstamo no encontrado.');
      }
      await requerirAccesoMandante(ctx.usuario?.idusuario, prestamo.idmandante);

      const where = { idprestamo: args.idprestamo };

      return resolvePaginatedPrismaQuery({
        page: args.page,
        pageSize: args.pageSize,
        itemsFieldName: 'cortes',
        findMany: (skip, take) =>
          ctx.prisma.tbl_prestamo_corte.findMany({
            where,
            skip,
            take,
            orderBy: { fechaCorte: 'desc' },
          }),
        count: () => ctx.prisma.tbl_prestamo_corte.count({ where }),
      }) as never;
    },
  }),
);
