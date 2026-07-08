import { builder ,type  GraphQLContext } from '../../builder';

import { ComisionCobro } from './types';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { createPageType } from '../../helpers/create-page-type';
import { resolvePaginatedPrismaQuery } from '../../helpers/paginated-prisma-resolver';

const ComisionCobroPage = createPageType(
  'ComisionCobroPage',
  ComisionCobro,
  'comisiones',
);

builder.queryField('comisionesCobro', (t) =>
  t.field({
    type: ComisionCobroPage,
    args: {
      idmandante: t.arg.int({ required: true }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_READ);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);

      const where = { idmandante: args.idmandante, deletedAt: null };

      return resolvePaginatedPrismaQuery({
        page: args.page,
        pageSize: args.pageSize,
        itemsFieldName: 'comisiones',
        findMany: (skip, take) =>
          ctx.prisma.tbl_comision_cobro.findMany({
            where,
            skip,
            take,
            orderBy: { tramoMoraMin: 'asc' },
          }),
        count: () => ctx.prisma.tbl_comision_cobro.count({ where }),
      }) as never;
    },
  }),
);
