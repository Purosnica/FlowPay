import { builder ,type  GraphQLContext } from '../../builder';

import { PlantillaImportacion } from './types';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { createPageType } from '../../helpers/create-page-type';
import { resolvePaginatedPrismaQuery } from '../../helpers/paginated-prisma-resolver';

const PlantillaImportacionPage = createPageType(
  'PlantillaImportacionPage',
  PlantillaImportacion,
  'plantillas',
);

builder.queryField('plantillasImportacion', (t) =>
  t.field({
    type: PlantillaImportacionPage,
    args: {
      idmandante: t.arg.int({ required: true }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);

      const where = { idmandante: args.idmandante, deletedAt: null };

      return resolvePaginatedPrismaQuery({
        page: args.page,
        pageSize: args.pageSize,
        itemsFieldName: 'plantillas',
        findMany: (skip, take) =>
          ctx.prisma.tbl_plantilla_importacion.findMany({
            where,
            skip,
            take,
            orderBy: { nombre: 'asc' },
            include: { mandante: true },
          }),
        count: () => ctx.prisma.tbl_plantilla_importacion.count({ where }),
      }) as never;
    },
  }),
);

builder.queryField('plantillaImportacion', (t) =>
  t.prismaField({
    type: PlantillaImportacion,
    nullable: true,
    args: { id: t.arg.int({ required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const plantilla = await ctx.prisma.tbl_plantilla_importacion.findFirst({
        ...(query as Record<string, unknown>),
        where: { idplantillaImp: args.id, deletedAt: null },
      });
      if (plantilla) {
        await requerirAccesoMandante(
          ctx.usuario?.idusuario,
          plantilla.idmandante,
        );
      }
      return plantilla as never;
    },
  }),
);
