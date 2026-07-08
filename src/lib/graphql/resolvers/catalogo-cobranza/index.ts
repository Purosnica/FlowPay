import { builder ,type  GraphQLContext } from '../../builder';

import {
  AgenciaPage,
  RutaPage,
  PrestamoCorte,
} from '../contrato-mandante/types';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
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

builder.queryField('agencias', (t) =>
  t.field({
    type: AgenciaPage,
    args: {
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);

      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const where = { deletedAt: null, estado: true };

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
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);

      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const where = {
        deletedAt: null,
        estado: true,
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
