import {
  Reclamo,
  ReclamoPage,
  CreateReclamoInput,
  UpdateReclamoEstadoInput,
  CreateReclamoInputSchema,
  UpdateReclamoEstadoInputSchema,
} from './types';
import { builder, type GraphQLContext } from '../../builder';

import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  filtroMandante,
  requerirAccesoMandante,
} from '@/lib/cobranza/mandante-scope';
import {
  esUsuarioCobrador,
  requerirAccesoClienteCobrador,
  requerirAccesoPrestamoCobrador,
} from '@/lib/cobranza/cobrador-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../helpers/graphql-helpers';

builder.queryField('reclamos', (t) =>
  t.field({
    type: ReclamoPage,
    args: {
      idmandante: t.arg.int({ required: false }),
      idprestamo: t.arg.int({ required: false }),
      estado: t.arg.string({ required: false }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_READ);
      const idusuario = ctx.usuario?.idusuario;
      const mandanteFilter = await filtroMandante(idusuario);
      if (args.idmandante) {
        await requerirAccesoMandante(idusuario, args.idmandante);
      }
      if (args.idprestamo) {
        await requerirAccesoPrestamoCobrador(idusuario, args.idprestamo);
      }

      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );

      const cobrador = idusuario
        ? await esUsuarioCobrador(idusuario)
        : false;

      const where = {
        deletedAt: null,
        idmandante: args.idmandante ?? mandanteFilter,
        idprestamo: args.idprestamo ?? undefined,
        estado: args.estado ?? undefined,
        ...(cobrador && !args.idprestamo && idusuario
          ? {
              prestamo: {
                idgestorAsignado: idusuario,
                deletedAt: null,
              },
            }
          : {}),
      };

      const [reclamos, total] = await Promise.all([
        ctx.prisma.tbl_reclamo.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: { cliente: true, prestamo: true },
        }),
        ctx.prisma.tbl_reclamo.count({ where }),
      ]);

      return {
        reclamos,
        ...buildPaginationMeta(total, page, pageSize),
      };
    },
  }),
);

builder.mutationField('createReclamo', (t) =>
  t.prismaField({
    type: Reclamo,
    args: { input: t.arg({ type: CreateReclamoInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_WRITE);
      const data = CreateReclamoInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);
      if (data.idprestamo) {
        const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
          where: { idprestamo: data.idprestamo },
          select: { idmandante: true, deletedAt: true },
        });
        if (!prestamo || prestamo.deletedAt) {
          throw new GraphQLValidationError('Préstamo no encontrado.');
        }
        if (prestamo.idmandante !== data.idmandante) {
          throw new GraphQLValidationError(
            'El préstamo no pertenece al mandante indicado.',
          );
        }
        await requerirAccesoPrestamoCobrador(
          ctx.usuario?.idusuario,
          data.idprestamo,
        );
      } else if (data.idcliente) {
        await requerirAccesoClienteCobrador(
          ctx.usuario?.idusuario,
          data.idcliente,
        );
      }
      return ctx.prisma.tbl_reclamo.create({
        ...(query as Record<string, unknown>),
        data: {
          idmandante: data.idmandante,
          idcliente: data.idcliente,
          idprestamo: data.idprestamo,
          descripcion: data.descripcion,
          fechaLimite: data.fechaLimite,
          estado: 'ABIERTO',
        },
      }) as never;
    },
  }),
);

builder.mutationField('updateReclamoEstado', (t) =>
  t.prismaField({
    type: Reclamo,
    args: {
      input: t.arg({ type: UpdateReclamoEstadoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_WRITE);
      const { idreclamo, estado } = UpdateReclamoEstadoInputSchema.parse(
        args.input,
      );
      const existente = await ctx.prisma.tbl_reclamo.findUnique({
        where: { idreclamo },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Reclamo no encontrado.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.idmandante,
      );
      if (existente.idprestamo) {
        await requerirAccesoPrestamoCobrador(
          ctx.usuario?.idusuario,
          existente.idprestamo,
        );
      } else if (existente.idcliente) {
        await requerirAccesoClienteCobrador(
          ctx.usuario?.idusuario,
          existente.idcliente,
        );
      }
      return ctx.prisma.tbl_reclamo.update({
        ...(query as Record<string, unknown>),
        where: { idreclamo },
        data: { estado },
      }) as never;
    },
  }),
);
