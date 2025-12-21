import { builder } from "../../builder";
import { Cliente, CreateClienteInput, UpdateClienteInput, CreateClienteInputSchema, UpdateClienteInputSchema } from "./types";

// Mutation para crear un cliente
export const createClienteMutation = builder.mutationField("createCliente", (t) =>
  t.field({
    type: Cliente,
    args: {
      input: t.arg({ type: CreateClienteInput, required: true }),
    },
    resolve: async (_parent, args, ctx: any) => {
      // Validar con Zod (convierte strings de fecha a Date automáticamente)
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

      return cliente;
    },
  })
);

// Mutation para actualizar un cliente
export const updateClienteMutation = builder.mutationField("updateCliente", (t) =>
  t.field({
    type: Cliente,
    args: {
      input: t.arg({ type: UpdateClienteInput, required: true }),
    },
    resolve: async (_parent, args, ctx: any) => {
      // Validar con Zod (convierte strings de fecha a Date automáticamente)
      const { idcliente, ...updateData } = UpdateClienteInputSchema.parse(args.input);

      const cliente = await ctx.prisma.tbl_cliente.update({
        where: { idcliente },
        data: {
          ...updateData,
          fechanacimiento: updateData.fechanacimiento || undefined,
          fechavencimientodoc: updateData.fechavencimientodoc || undefined,
          email: updateData.email !== undefined ? (updateData.email || null) : undefined,
          sitioweb: updateData.sitioweb !== undefined ? (updateData.sitioweb || null) : undefined,
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

      return cliente;
    },
  })
);

// Mutation para eliminar un cliente
export const deleteClienteMutation = builder.mutationField("deleteCliente", (t) =>
  t.field({
    type: Cliente,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx: any) => {
      const cliente = await ctx.prisma.tbl_cliente.delete({
        where: { idcliente: args.id },
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

      return cliente;
    },
  })
);







