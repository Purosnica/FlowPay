import {
  DeudorContacto,
  CreateDeudorContactoInput,
  UpdateDeudorContactoInput,
  CreateDeudorContactoInputSchema,
  UpdateDeudorContactoInputSchema,
} from './types';
import { builder ,type  GraphQLContext } from '../../builder';


import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoCliente } from '@/lib/cobranza/mandante-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { createPageType } from '../../helpers/create-page-type';
import { resolvePaginatedPrismaQuery } from '../../helpers/paginated-prisma-resolver';
import { IdPositiveSchema } from '@/lib/validators/graphql-args';
import { z } from 'zod';

const DeudorContactoPage = createPageType(
  'DeudorContactoPage',
  DeudorContacto,
  'contactos',
);

builder.queryField('deudoresContacto', (t) =>
  t.field({
    type: DeudorContactoPage,
    args: {
      idcliente: t.arg.int({ required: true }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      await requerirAccesoCliente(ctx.usuario?.idusuario, args.idcliente);

      const where = { idcliente: args.idcliente, deletedAt: null };

      return resolvePaginatedPrismaQuery({
        page: args.page,
        pageSize: args.pageSize,
        itemsFieldName: 'contactos',
        findMany: (skip, take) =>
          ctx.prisma.tbl_deudor_contacto.findMany({
            where,
            skip,
            take,
            orderBy: [{ tipo: 'asc' }, { valor: 'asc' }],
          }),
        count: () => ctx.prisma.tbl_deudor_contacto.count({ where }),
      }) as never;
    },
  }),
);

builder.mutationField('createDeudorContacto', (t) =>
  t.prismaField({
    type: DeudorContacto,
    args: {
      input: t.arg({ type: CreateDeudorContactoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = CreateDeudorContactoInputSchema.parse(args.input);
      await requerirAccesoCliente(ctx.usuario?.idusuario, data.idcliente);
      const cliente = await ctx.prisma.tbl_cliente.findUnique({
        where: { idcliente: data.idcliente },
      });
      if (!cliente) {
        throw new GraphQLValidationError('Cliente no encontrado.');
      }
      return ctx.prisma.tbl_deudor_contacto.create({
        ...(query as Record<string, unknown>),
        data,
      }) as never;
    },
  }),
);

builder.mutationField('updateDeudorContacto', (t) =>
  t.prismaField({
    type: DeudorContacto,
    args: {
      input: t.arg({ type: UpdateDeudorContactoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const { idcontacto, ...updateData } =
        UpdateDeudorContactoInputSchema.parse(args.input);
      const existente = await ctx.prisma.tbl_deudor_contacto.findUnique({
        where: { idcontacto },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Contacto no encontrado.');
      }
      await requerirAccesoCliente(ctx.usuario?.idusuario, existente.idcliente);
      return ctx.prisma.tbl_deudor_contacto.update({
        ...(query as Record<string, unknown>),
        where: { idcontacto },
        data: updateData,
      }) as never;
    },
  }),
);

builder.mutationField('deleteDeudorContacto', (t) =>
  t.field({
    type: 'Boolean',
    args: { idcontacto: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const { idcontacto } = z
        .object({ idcontacto: IdPositiveSchema })
        .parse(args);
      const existente = await ctx.prisma.tbl_deudor_contacto.findUnique({
        where: { idcontacto },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Contacto no encontrado.');
      }
      await requerirAccesoCliente(ctx.usuario?.idusuario, existente.idcliente);
      await ctx.prisma.tbl_deudor_contacto.update({
        where: { idcontacto },
        data: { deletedAt: new Date() },
      });
      return true;
    },
  }),
);
