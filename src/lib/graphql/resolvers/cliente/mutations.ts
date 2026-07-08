import { builder ,type  GraphQLContext } from "../../builder";

import {
  Cliente,
  CreateClienteInput,
  UpdateClienteInput,
  CreateClienteInputSchema,
  UpdateClienteInputSchema,
} from "./types";
import { authClienteEscritura } from "@/lib/graphql/auth-helpers";
import { requerirAccesoCliente } from "@/lib/cobranza/mandante-scope";
import { GraphQLValidationError } from "@/lib/errors/graphql-errors";

export const createClienteMutation = builder.mutationField(
  "createCliente",
  (t) =>
    t.field({
      type: Cliente,
      args: {
        input: t.arg({ type: CreateClienteInput, required: true }),
      },
      resolve: async (_parent, args, ctx: GraphQLContext) => {
        await authClienteEscritura(ctx);
        const validated = CreateClienteInputSchema.parse(args.input);

        const cliente = await ctx.prisma.tbl_cliente.create({
          data: {
            ...validated,
            fechanacimiento: validated.fechanacimiento || undefined,
            fechavencimientodoc: validated.fechavencimientodoc || undefined,
            email: validated.email || null,
            sitioweb: validated.sitioweb || null,
          },
          include: {
            tipodocumento: true,
            genero: true,
            estadocivil: true,
            ocupacion: true,
            tipopersona: true,
            pais: true,
            departamento: {
              include: {
                pais: true,
              },
            },
          },
        });

        return cliente as never;
      },
    }),
);

export const updateClienteMutation = builder.mutationField(
  "updateCliente",
  (t) =>
    t.field({
      type: Cliente,
      args: {
        input: t.arg({ type: UpdateClienteInput, required: true }),
      },
      resolve: async (_parent, args, ctx: GraphQLContext) => {
        await authClienteEscritura(ctx);
        const { idcliente, ...updateData } = UpdateClienteInputSchema.parse(
          args.input,
        );

        const existente = await ctx.prisma.tbl_cliente.findFirst({
          where: { idcliente, estado: true },
        });
        if (!existente) {
          throw new GraphQLValidationError("Cliente no encontrado.");
        }

        await requerirAccesoCliente(ctx.usuario?.idusuario, idcliente);

        const cliente = await ctx.prisma.tbl_cliente.update({
          where: { idcliente },
          data: {
            ...updateData,
            fechanacimiento: updateData.fechanacimiento || undefined,
            fechavencimientodoc:
              updateData.fechavencimientodoc || undefined,
            email:
              updateData.email !== undefined
                ? updateData.email || null
                : undefined,
            sitioweb:
              updateData.sitioweb !== undefined
                ? updateData.sitioweb || null
                : undefined,
          },
          include: {
            tipodocumento: true,
            genero: true,
            estadocivil: true,
            ocupacion: true,
            tipopersona: true,
            pais: true,
            departamento: {
              include: {
                pais: true,
              },
            },
          },
        });

        return cliente as never;
      },
    }),
);

export const deleteClienteMutation = builder.mutationField(
  "deleteCliente",
  (t) =>
    t.field({
      type: Cliente,
      args: {
        id: t.arg.int({ required: true }),
      },
      resolve: async (_parent, args, ctx: GraphQLContext) => {
        await authClienteEscritura(ctx);

        const existente = await ctx.prisma.tbl_cliente.findFirst({
          where: { idcliente: args.id, estado: true },
        });
        if (!existente) {
          throw new GraphQLValidationError("Cliente no encontrado.");
        }

        await requerirAccesoCliente(ctx.usuario?.idusuario, args.id);

        const cliente = await ctx.prisma.tbl_cliente.update({
          where: { idcliente: args.id },
          data: { estado: false },
          include: {
            tipodocumento: true,
            genero: true,
            estadocivil: true,
            ocupacion: true,
            tipopersona: true,
            pais: true,
            departamento: {
              include: {
                pais: true,
              },
            },
          },
        });

        return cliente as never;
      },
    }),
);
