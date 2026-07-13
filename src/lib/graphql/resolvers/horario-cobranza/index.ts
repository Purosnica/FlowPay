import { definePrismaObject } from "../../helpers/prisma-object";
import { builder ,type  GraphQLContext } from '../../builder';

import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { validarHorarioCobranza } from '@/lib/cobranza/horario-cobranza-service';
import { ValidacionHorarioType } from '../contrato-mandante/types';
import { createPageType } from '../../helpers/create-page-type';
import { resolvePaginatedPrismaQuery } from '../../helpers/paginated-prisma-resolver';

export const HorarioCobranza = definePrismaObject(
  'tbl_horario_cobranza',
  {
    fields: (t) => ({
      idhorario: t.exposeInt('idhorario'),
      idmandante: t.exposeInt('idmandante', { nullable: true }),
      diaSemana: t.exposeInt('diaSemana'),
      horaInicio: t.exposeString('horaInicio'),
      horaFin: t.exposeString('horaFin'),
      permitido: t.exposeBoolean('permitido'),
    }),
  },
);

const HorarioCobranzaPage = createPageType(
  'HorarioCobranzaPage',
  HorarioCobranza,
  'horarios',
);

builder.queryField('horariosCobranza', (t) =>
  t.field({
    type: HorarioCobranzaPage,
    args: {
      idmandante: t.arg.int({ required: false }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_READ);
      if (args.idmandante) {
        await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);
      }

      const where = {
        OR: [
          { idmandante: args.idmandante ?? null },
          { idmandante: null },
        ],
      };

      return resolvePaginatedPrismaQuery({
        page: args.page,
        pageSize: args.pageSize,
        itemsFieldName: 'horarios',
        findMany: (skip, take) =>
          ctx.prisma.tbl_horario_cobranza.findMany({
            where,
            skip,
            take,
            orderBy: [{ idmandante: 'asc' }, { diaSemana: 'asc' }],
          }),
        count: () => ctx.prisma.tbl_horario_cobranza.count({ where }),
      }) as never;
    },
  }),
);

builder.queryField('verificarHorarioCobranza', (t) =>
  t.field({
    type: ValidacionHorarioType,
    args: { idmandante: t.arg.int({ required: false }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_READ);
      if (args.idmandante) {
        await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);
      }
      return validarHorarioCobranza(new Date(), args.idmandante);
    },
  }),
);

builder.mutationField('updateHorarioCobranza', (t) =>
  t.prismaField({
    type: HorarioCobranza,
    args: {
      idhorario: t.arg.int({ required: true }),
      horaInicio: t.arg.string({ required: false }),
      horaFin: t.arg.string({ required: false }),
      permitido: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const horario = await ctx.prisma.tbl_horario_cobranza.findUnique({
        where: { idhorario: args.idhorario },
      });
      if (!horario) {
        throw new GraphQLValidationError('Horario no encontrado.');
      }
      if (horario.idmandante) {
        await requerirAccesoMandante(
          ctx.usuario?.idusuario,
          horario.idmandante,
        );
      }
      return ctx.prisma.tbl_horario_cobranza.update({
        ...(query as Record<string, unknown>),
        where: { idhorario: args.idhorario },
        data: {
          horaInicio: args.horaInicio ?? undefined,
          horaFin: args.horaFin ?? undefined,
          permitido: args.permitido ?? undefined,
        },
      }) as never;
    },
  }),
);
