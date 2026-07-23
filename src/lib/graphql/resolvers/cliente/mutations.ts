import { builder, type GraphQLContext } from "../../builder";

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
import { IdArgsSchema } from "@/lib/validators/graphql-args";
import {
  isPersonaJuridicaDescripcion,
  stripContactoPrincipalFromObservaciones,
} from "@/lib/logic/cliente-tipo-persona-logic";

const clienteInclude = {
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
} as const;

async function isClienteJuridica(
  ctx: GraphQLContext,
  idtipopersona: number,
): Promise<boolean> {
  const tipopersona = await ctx.prisma.tbl_tipopersona.findUnique({
    where: { idtipopersona },
  });
  return isPersonaJuridicaDescripcion(tipopersona?.descripcion);
}

type ClienteParsed = ReturnType<typeof CreateClienteInputSchema.parse>;

function buildClienteWriteData(
  validated: ClienteParsed,
  juridica: boolean,
) {
  if (juridica) {
    const razon = (
      validated.razon_social ??
      validated.primer_nombres ??
      ''
    ).trim();
    return {
      primer_nombres: razon,
      segundo_nombres: validated.nombre_comercial?.trim() || null,
      primer_apellido: null as string | null,
      segundo_apellido: null as string | null,
      fechanacimiento: null as Date | null,
      idgenero: null as number | null,
      idestadocivil: null as number | null,
      idocupacion: null as number | null,
      espep: false,
      razon_social: razon,
      nombre_comercial: validated.nombre_comercial?.trim() || null,
      contacto_nombre: validated.contacto_nombre?.trim() || null,
      contacto_cargo: validated.contacto_cargo?.trim() || null,
      contacto_telefono: validated.contacto_telefono?.trim() || null,
      contacto_email: validated.contacto_email?.trim() || null,
      observaciones:
        stripContactoPrincipalFromObservaciones(
          validated.observaciones ?? undefined,
        ) || null,
    };
  }

  return {
    primer_nombres: (validated.primer_nombres ?? '').trim(),
    segundo_nombres: validated.segundo_nombres?.trim() || null,
    primer_apellido: (validated.primer_apellido ?? '').trim(),
    segundo_apellido: validated.segundo_apellido?.trim() || null,
    fechanacimiento: validated.fechanacimiento || undefined,
    idgenero: validated.idgenero ?? null,
    idestadocivil: validated.idestadocivil ?? null,
    idocupacion: validated.idocupacion ?? null,
    espep: validated.espep ?? false,
    razon_social: null as string | null,
    nombre_comercial: null as string | null,
    contacto_nombre: null as string | null,
    contacto_cargo: null as string | null,
    contacto_telefono: null as string | null,
    contacto_email: null as string | null,
    observaciones:
      stripContactoPrincipalFromObservaciones(
        validated.observaciones ?? undefined,
      ) || null,
  };
}

function assertClientePayload(
  validated: ClienteParsed,
  juridica: boolean,
): void {
  if (juridica) {
    const razon = (
      validated.razon_social ??
      validated.primer_nombres ??
      ''
    ).trim();
    if (!razon) {
      throw new GraphQLValidationError("La razón social es requerida.");
    }
    if (!validated.contacto_nombre?.trim()) {
      throw new GraphQLValidationError(
        "El nombre del contacto principal es requerido.",
      );
    }
    if (!validated.contacto_cargo?.trim()) {
      throw new GraphQLValidationError(
        "El cargo del contacto principal es requerido.",
      );
    }
    if (!validated.contacto_telefono?.trim()) {
      throw new GraphQLValidationError(
        "El teléfono del contacto principal es requerido.",
      );
    }
    if (!validated.contacto_email?.trim()) {
      throw new GraphQLValidationError(
        "El correo del contacto principal es requerido.",
      );
    }
    return;
  }

  if (!validated.primer_nombres?.trim()) {
    throw new GraphQLValidationError("El primer nombre es requerido.");
  }
  if (!validated.primer_apellido?.trim()) {
    throw new GraphQLValidationError("El primer apellido es requerido.");
  }
}

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
        const juridica = await isClienteJuridica(ctx, validated.idtipopersona);
        assertClientePayload(validated, juridica);
        const personData = buildClienteWriteData(validated, juridica);

        const cliente = await ctx.prisma.tbl_cliente.create({
          data: {
            ...personData,
            idtipodocumento: validated.idtipodocumento,
            numerodocumento: validated.numerodocumento,
            fechavencimientodoc: validated.fechavencimientodoc || undefined,
            idtipopersona: validated.idtipopersona,
            idpais: validated.idpais,
            iddepartamento: validated.iddepartamento ?? null,
            direccion: validated.direccion || null,
            ciudad: validated.ciudad || null,
            codigopostal: validated.codigopostal || null,
            telefono: validated.telefono || null,
            celular: validated.celular || null,
            email: validated.email || null,
            sitioweb: validated.sitioweb || null,
            estado: validated.estado ?? true,
          },
          include: clienteInclude,
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
          where: { idcliente, estado: true, deletedAt: null },
        });
        if (!existente) {
          throw new GraphQLValidationError("Cliente no encontrado.");
        }

        await requerirAccesoCliente(ctx.usuario?.idusuario, idcliente);

        const idtipopersona =
          updateData.idtipopersona ?? existente.idtipopersona;
        const juridica = await isClienteJuridica(ctx, idtipopersona);

        const merged = CreateClienteInputSchema.parse({
          primer_nombres:
            updateData.primer_nombres ?? existente.primer_nombres,
          segundo_nombres:
            updateData.segundo_nombres ??
            existente.segundo_nombres ??
            undefined,
          primer_apellido:
            updateData.primer_apellido ??
            existente.primer_apellido ??
            "",
          segundo_apellido:
            updateData.segundo_apellido ??
            existente.segundo_apellido ??
            undefined,
          razon_social:
            updateData.razon_social ?? existente.razon_social ?? undefined,
          nombre_comercial:
            updateData.nombre_comercial ??
            existente.nombre_comercial ??
            undefined,
          contacto_nombre:
            updateData.contacto_nombre ??
            existente.contacto_nombre ??
            undefined,
          contacto_cargo:
            updateData.contacto_cargo ??
            existente.contacto_cargo ??
            undefined,
          contacto_telefono:
            updateData.contacto_telefono ??
            existente.contacto_telefono ??
            undefined,
          contacto_email:
            updateData.contacto_email ??
            existente.contacto_email ??
            undefined,
          idtipodocumento:
            updateData.idtipodocumento ?? existente.idtipodocumento,
          numerodocumento:
            updateData.numerodocumento ?? existente.numerodocumento,
          idtipopersona,
          idpais: updateData.idpais ?? existente.idpais,
          espep: updateData.espep ?? existente.espep,
          estado: updateData.estado ?? existente.estado,
          observaciones:
            updateData.observaciones ??
            existente.observaciones ??
            undefined,
        });

        assertClientePayload(merged, juridica);
        const personData = buildClienteWriteData(merged, juridica);

        const cliente = await ctx.prisma.tbl_cliente.update({
          where: { idcliente },
          data: {
            ...personData,
            idtipodocumento: updateData.idtipodocumento,
            numerodocumento: updateData.numerodocumento,
            fechavencimientodoc:
              updateData.fechavencimientodoc !== undefined
                ? updateData.fechavencimientodoc || null
                : undefined,
            idtipopersona: updateData.idtipopersona,
            idpais: updateData.idpais,
            iddepartamento:
              updateData.iddepartamento !== undefined
                ? updateData.iddepartamento || null
                : undefined,
            direccion:
              updateData.direccion !== undefined
                ? updateData.direccion || null
                : undefined,
            ciudad:
              updateData.ciudad !== undefined
                ? updateData.ciudad || null
                : undefined,
            codigopostal:
              updateData.codigopostal !== undefined
                ? updateData.codigopostal || null
                : undefined,
            telefono:
              updateData.telefono !== undefined
                ? updateData.telefono || null
                : undefined,
            celular:
              updateData.celular !== undefined
                ? updateData.celular || null
                : undefined,
            email:
              updateData.email !== undefined
                ? updateData.email || null
                : undefined,
            sitioweb:
              updateData.sitioweb !== undefined
                ? updateData.sitioweb || null
                : undefined,
            estado:
              updateData.estado === undefined || updateData.estado === null
                ? undefined
                : updateData.estado,
          },
          include: clienteInclude,
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
        const { id } = IdArgsSchema.parse(args);

        const existente = await ctx.prisma.tbl_cliente.findFirst({
          where: { idcliente: id, estado: true, deletedAt: null },
        });
        if (!existente) {
          throw new GraphQLValidationError("Cliente no encontrado.");
        }

        await requerirAccesoCliente(ctx.usuario?.idusuario, id);

        const cliente = await ctx.prisma.tbl_cliente.update({
          where: { idcliente: id },
          data: { estado: false, deletedAt: new Date() },
          include: clienteInclude,
        });

        return cliente as never;
      },
    }),
);
