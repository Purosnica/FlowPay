import { builder ,type  GraphQLContext } from "../../builder";

import { Pago } from "./types";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { PERMISO } from "@/lib/permissions/permiso-codes";
import { filtroMandante } from "@/lib/cobranza/mandante-scope";
import { requerirAccesoPrestamoCobrador } from "@/lib/cobranza/cobrador-scope";
import { createPageType } from "../../helpers/create-page-type";
import { resolvePaginatedPrismaQuery } from "../../helpers/paginated-prisma-resolver";
import { listarPagosConciliacion } from "@/lib/cobranza/pagos-conciliacion-service";
import { GraphQLValidationError } from "@/lib/errors/graphql-errors";

const PagoPage = createPageType("PagoPage", Pago, "pagos");

const PagoConciliacionType = builder
  .objectRef<{
    idpago: number;
    idprestamo: number;
    idmandante: number;
    noPrestamo: string;
    nombreCliente: string;
    fechaPago: Date;
    monto: number;
    moneda: string;
    medio: string | null;
    aplicado: boolean;
  }>("PagoConciliacionItem")
  .implement({
    fields: (t) => ({
      idpago: t.exposeInt("idpago"),
      idprestamo: t.exposeInt("idprestamo"),
      idmandante: t.exposeInt("idmandante"),
      noPrestamo: t.exposeString("noPrestamo"),
      nombreCliente: t.exposeString("nombreCliente"),
      fechaPago: t.expose("fechaPago", { type: "DateTime" }),
      monto: t.exposeFloat("monto"),
      moneda: t.exposeString("moneda"),
      medio: t.exposeString("medio", { nullable: true }),
      aplicado: t.exposeBoolean("aplicado"),
    }),
  });

const PagosConciliacionPageType = builder
  .objectRef<{
    pagos: Array<{
      idpago: number;
      idprestamo: number;
      idmandante: number;
      noPrestamo: string;
      nombreCliente: string;
      fechaPago: Date;
      monto: number;
      moneda: string;
      medio: string | null;
      aplicado: boolean;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    pendientesTotal: number;
  }>("PagosConciliacionPage")
  .implement({
    fields: (t) => ({
      pagos: t.field({ type: [PagoConciliacionType], resolve: (p) => p.pagos }),
      total: t.exposeInt("total"),
      page: t.exposeInt("page"),
      pageSize: t.exposeInt("pageSize"),
      totalPages: t.exposeInt("totalPages"),
      pendientesTotal: t.exposeInt("pendientesTotal"),
    }),
  });

builder.queryField("pagosConciliacion", (t) =>
  t.field({
    type: PagosConciliacionPageType,
    args: {
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
      idmandante: t.arg.int({ required: false }),
      soloPendientes: t.arg.boolean({ required: false, defaultValue: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.PAGO_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError("Usuario no autenticado.");
      }
      return listarPagosConciliacion(
        idusuario,
        args.page ?? 1,
        args.pageSize ?? 20,
        {
          idmandante: args.idmandante ?? undefined,
          soloPendientes: args.soloPendientes ?? true,
        },
      );
    },
  }),
);

builder.queryField("pagos", (t) =>
  t.field({
    type: PagoPage,
    args: {
      idprestamo: t.arg.int({ required: true }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.PAGO_READ);
      await requerirAccesoPrestamoCobrador(
        ctx.usuario?.idusuario,
        args.idprestamo,
      );
      const mandanteFilter = await filtroMandante(ctx.usuario?.idusuario);

      const where = {
        idprestamo: args.idprestamo,
        deletedAt: null,
        idmandante: mandanteFilter,
      };

      return resolvePaginatedPrismaQuery({
        page: args.page,
        pageSize: args.pageSize,
        itemsFieldName: "pagos",
        findMany: (skip, take) =>
          ctx.prisma.tbl_pago.findMany({
            where,
            skip,
            take,
            orderBy: { fechaPago: "desc" },
            include: { prestamo: true },
          }),
        count: () => ctx.prisma.tbl_pago.count({ where }),
      }) as never;
    },
  }),
);
