import { builder ,type  GraphQLContext } from '../../builder';

import { z } from 'zod';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { decimalToNumber } from '@/lib/cobranza/decimal-utils';
import { resolverPorcentajeComisionCobrador } from '@/lib/cobranza/comision-cobrador-service';
import { UsuarioPage } from './admin-types';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../helpers/graphql-helpers';
import { LISTA_USUARIOS_ACTIVOS_LIMIT } from '@/lib/cobranza/performance-limits';

export const UsuarioBasico = builder
  .objectRef<{
    idusuario: number;
    nombre: string;
    email: string;
    idrol: number;
  }>('UsuarioBasico')
  .implement({
    fields: (t) => ({
      idusuario: t.exposeInt('idusuario'),
      nombre: t.exposeString('nombre'),
      email: t.exposeString('email'),
      idrol: t.exposeInt('idrol'),
    }),
  });

export const UsuarioMandanteAsignado = builder
  .objectRef<{
    idusuario: number;
    nombre: string;
    email: string;
    idrol: number;
    porcentajeComisionMandante: number | null;
    porcentajeComisionUsuario: number;
    porcentajeComision: number;
  }>('UsuarioMandanteAsignado')
  .implement({
    fields: (t) => ({
      idusuario: t.exposeInt('idusuario'),
      nombre: t.exposeString('nombre'),
      email: t.exposeString('email'),
      idrol: t.exposeInt('idrol'),
      porcentajeComisionMandante: t.exposeFloat('porcentajeComisionMandante', {
        nullable: true,
      }),
      porcentajeComisionUsuario: t.exposeFloat('porcentajeComisionUsuario'),
      porcentajeComision: t.exposeFloat('porcentajeComision'),
    }),
  });

export const UpdateComisionUsuarioMandanteInputSchema = z.object({
  idusuario: z.number().int().positive(),
  idmandante: z.number().int().positive(),
  porcentajeComision: z.number().min(0).max(100).nullable(),
});

export const UpdateComisionUsuarioMandanteInput = builder
  .inputRef('UpdateComisionUsuarioMandanteInput')
  .implement({
    fields: (t) => ({
      idusuario: t.int({ required: true }),
      idmandante: t.int({ required: true }),
      porcentajeComision: t.float({ required: false }),
    }),
  });

builder.queryField('usuarios', (t) =>
  t.field({
    type: UsuarioPage,
    args: {
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.USER_READ);

      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const where = { deletedAt: null };

      const [usuarios, total] = await Promise.all([
        ctx.prisma.tbl_usuario.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            rol: {
              select: {
                idrol: true,
                codigo: true,
                descripcion: true,
                estado: true,
              },
            },
          },
          orderBy: { nombre: 'asc' },
        }),
        ctx.prisma.tbl_usuario.count({ where }),
      ]);

      return {
        usuarios,
        ...buildPaginationMeta(total, page, pageSize),
      };
    },
  }),
);

builder.queryField('supervisoresActivos', (t) =>
  t.field({
    type: [UsuarioBasico],
    resolve: async (_parent, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.USER_READ);
      return ctx.prisma.tbl_usuario.findMany({
        where: {
          activo: true,
          deletedAt: null,
          rol: { codigo: { in: ['SUPERVISOR', 'GERENTE', 'ADMIN'] } },
        },
        select: {
          idusuario: true,
          nombre: true,
          email: true,
          idrol: true,
        },
        orderBy: { nombre: 'asc' },
        take: LISTA_USUARIOS_ACTIVOS_LIMIT,
      });
    },
  }),
);

builder.queryField('usuariosActivos', (t) =>
  t.field({
    type: [UsuarioBasico],
    resolve: async (_parent, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      return ctx.prisma.tbl_usuario.findMany({
        where: { activo: true, deletedAt: null },
        select: {
          idusuario: true,
          nombre: true,
          email: true,
          idrol: true,
        },
        orderBy: { nombre: 'asc' },
        take: LISTA_USUARIOS_ACTIVOS_LIMIT,
      });
    },
  }),
);

builder.queryField('usuariosMandante', (t) =>
  t.field({
    type: [UsuarioMandanteAsignado],
    args: { idmandante: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_READ);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);
      const asignaciones = await ctx.prisma.tbl_usuario_mandante.findMany({
        where: { idmandante: args.idmandante },
        include: {
          usuario: {
            select: {
              idusuario: true,
              nombre: true,
              email: true,
              idrol: true,
              porcentajeComision: true,
            },
          },
        },
        orderBy: { usuario: { nombre: 'asc' } },
        take: LISTA_USUARIOS_ACTIVOS_LIMIT,
      });

      return asignaciones.map((a) => {
        const porcentajeUsuario = decimalToNumber(a.usuario.porcentajeComision);
        const porcentajeMandante =
          a.porcentajeComision !== null
            ? decimalToNumber(a.porcentajeComision)
            : null;

        return {
          idusuario: a.usuario.idusuario,
          nombre: a.usuario.nombre,
          email: a.usuario.email,
          idrol: a.usuario.idrol,
          porcentajeComisionMandante: porcentajeMandante,
          porcentajeComisionUsuario: porcentajeUsuario,
          porcentajeComision: resolverPorcentajeComisionCobrador(
            porcentajeMandante,
            porcentajeUsuario,
          ),
        };
      });
    },
  }),
);

builder.mutationField('actualizarComisionUsuarioMandante', (t) =>
  t.field({
    type: UsuarioMandanteAsignado,
    args: {
      input: t.arg({ type: UpdateComisionUsuarioMandanteInput, required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const data = UpdateComisionUsuarioMandanteInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);

      const asignacion = await ctx.prisma.tbl_usuario_mandante.findUnique({
        where: {
          idusuario_idmandante: {
            idusuario: data.idusuario,
            idmandante: data.idmandante,
          },
        },
        include: {
          usuario: {
            select: {
              idusuario: true,
              nombre: true,
              email: true,
              idrol: true,
              porcentajeComision: true,
            },
          },
        },
      });

      if (!asignacion) {
        throw new Error('El usuario no está asignado a este mandante.');
      }

      const updated = await ctx.prisma.tbl_usuario_mandante.update({
        where: {
          idusuario_idmandante: {
            idusuario: data.idusuario,
            idmandante: data.idmandante,
          },
        },
        data: {
          porcentajeComision: data.porcentajeComision,
        },
        include: {
          usuario: {
            select: {
              idusuario: true,
              nombre: true,
              email: true,
              idrol: true,
              porcentajeComision: true,
            },
          },
        },
      });

      const porcentajeUsuario = decimalToNumber(
        updated.usuario.porcentajeComision,
      );
      const porcentajeMandante =
        updated.porcentajeComision !== null
          ? decimalToNumber(updated.porcentajeComision)
          : null;

      return {
        idusuario: updated.usuario.idusuario,
        nombre: updated.usuario.nombre,
        email: updated.usuario.email,
        idrol: updated.usuario.idrol,
        porcentajeComisionMandante: porcentajeMandante,
        porcentajeComisionUsuario: porcentajeUsuario,
        porcentajeComision: resolverPorcentajeComisionCobrador(
          porcentajeMandante,
          porcentajeUsuario,
        ),
      };
    },
  }),
);

builder.mutationField('desasignarUsuarioMandante', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      idusuario: t.arg.int({ required: true }),
      idmandante: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);
      await ctx.prisma.tbl_usuario_mandante.deleteMany({
        where: {
          idusuario: args.idusuario,
          idmandante: args.idmandante,
        },
      });
      return true;
    },
  }),
);
