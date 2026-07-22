import {
  Documento,
  CreateDocumentoInput,
  CreateDocumentoInputSchema,
} from './types';
import { builder, type GraphQLContext } from '../../builder';

import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  requerirAccesoMandante,
  requerirAccesoCliente,
  filtroMandante,
} from '@/lib/cobranza/mandante-scope';
import {
  requerirAccesoPrestamoCobrador,
  requerirAccesoClienteCobrador,
} from '@/lib/cobranza/cobrador-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { createPageType } from '../../helpers/create-page-type';
import { resolvePaginatedPrismaQuery } from '../../helpers/paginated-prisma-resolver';
import { esDocumentoUrlInterna } from '@/lib/cobranza/documento-storage';
import { IdPositiveSchema } from '@/lib/validators/graphql-args';
import { z } from 'zod';

const DocumentoPage = createPageType('DocumentoPage', Documento, 'documentos');

builder.queryField('documentos', (t) =>
  t.field({
    type: DocumentoPage,
    args: {
      idprestamo: t.arg.int({ required: false }),
      idcliente: t.arg.int({ required: false }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      if (!args.idprestamo && !args.idcliente) {
        throw new GraphQLValidationError('Indique idprestamo o idcliente.');
      }
      if (args.idprestamo) {
        const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
          where: { idprestamo: args.idprestamo },
        });
        if (!prestamo || prestamo.deletedAt) {
          throw new GraphQLValidationError('Préstamo no encontrado.');
        }
        await requerirAccesoMandante(
          ctx.usuario?.idusuario,
          prestamo.idmandante,
        );
        await requerirAccesoPrestamoCobrador(
          ctx.usuario?.idusuario,
          args.idprestamo,
        );
      }
      if (args.idcliente) {
        await requerirAccesoCliente(ctx.usuario?.idusuario, args.idcliente);
        await requerirAccesoClienteCobrador(
          ctx.usuario?.idusuario,
          args.idcliente,
        );
      }

      const mandanteFilter = await filtroMandante(ctx.usuario?.idusuario);

      const where =
        args.idprestamo != null
          ? {
              deletedAt: null,
              idprestamo: args.idprestamo,
            }
          : {
              deletedAt: null,
              OR: [
                {
                  idcliente: args.idcliente ?? undefined,
                  idprestamo: null,
                },
                {
                  prestamo: {
                    idcliente: args.idcliente ?? undefined,
                    deletedAt: null,
                    idmandante: mandanteFilter,
                  },
                },
              ],
            };

      return resolvePaginatedPrismaQuery({
        page: args.page,
        pageSize: args.pageSize,
        itemsFieldName: 'documentos',
        findMany: (skip, take) =>
          ctx.prisma.tbl_documento.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
          }),
        count: () => ctx.prisma.tbl_documento.count({ where }),
      }) as never;
    },
  }),
);

builder.mutationField('createDocumento', (t) =>
  t.prismaField({
    type: Documento,
    args: { input: t.arg({ type: CreateDocumentoInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = CreateDocumentoInputSchema.parse(args.input);
      if (!data.idprestamo && !data.idcliente) {
        throw new GraphQLValidationError(
          'Indique idprestamo o idcliente.',
        );
      }
      if (!esDocumentoUrlInterna(data.url)) {
        throw new GraphQLValidationError(
          'Solo se permiten documentos subidos en la aplicación.',
        );
      }
      if (data.idprestamo) {
        const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
          where: { idprestamo: data.idprestamo },
        });
        if (!prestamo || prestamo.deletedAt) {
          throw new GraphQLValidationError('Préstamo no encontrado.');
        }
        await requerirAccesoMandante(
          ctx.usuario?.idusuario,
          prestamo.idmandante,
        );
        await requerirAccesoPrestamoCobrador(
          ctx.usuario?.idusuario,
          data.idprestamo,
        );
      }
      if (data.idcliente) {
        await requerirAccesoCliente(ctx.usuario?.idusuario, data.idcliente);
        await requerirAccesoClienteCobrador(
          ctx.usuario?.idusuario,
          data.idcliente,
        );
      }
      return ctx.prisma.tbl_documento.create({
        ...(query as Record<string, unknown>),
        data: {
          idprestamo: data.idprestamo,
          idcliente: data.idcliente,
          tipo: data.tipo,
          url: data.url,
        },
      }) as never;
    },
  }),
);

builder.mutationField('deleteDocumento', (t) =>
  t.field({
    type: 'Boolean',
    args: { iddocumento: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const { iddocumento } = z
        .object({ iddocumento: IdPositiveSchema })
        .parse(args);
      const doc = await ctx.prisma.tbl_documento.findUnique({
        where: { iddocumento },
        include: { prestamo: true },
      });
      if (!doc || doc.deletedAt) {
        throw new GraphQLValidationError('Documento no encontrado.');
      }
      if (doc.prestamo) {
        await requerirAccesoMandante(
          ctx.usuario?.idusuario,
          doc.prestamo.idmandante,
        );
        await requerirAccesoPrestamoCobrador(
          ctx.usuario?.idusuario,
          doc.prestamo.idprestamo,
        );
      } else if (doc.idcliente) {
        await requerirAccesoCliente(ctx.usuario?.idusuario, doc.idcliente);
        await requerirAccesoClienteCobrador(
          ctx.usuario?.idusuario,
          doc.idcliente,
        );
      }
      await ctx.prisma.tbl_documento.update({
        where: { iddocumento },
        data: { deletedAt: new Date() },
      });
      return true;
    },
  }),
);
