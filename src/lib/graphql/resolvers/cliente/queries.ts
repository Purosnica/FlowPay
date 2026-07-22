import { builder ,type  GraphQLContext } from "../../builder";

import { Cliente, ClientePage, ClienteFiltersInput } from "./types";
import type { Prisma } from "@prisma/client";
import { authClienteLectura } from "@/lib/graphql/auth-helpers";
import { obtenerVista360Cliente } from "@/lib/cobranza/cliente-360-service";
import {
  filtroClientePorMandante,
  requerirAccesoCliente,
} from "@/lib/cobranza/mandante-scope";
import { GraphQLValidationError } from "@/lib/errors/graphql-errors";
import {
  buildPaginationMeta,
  resolvePagination,
} from "../../helpers/graphql-helpers";

export const clienteQuery = builder.queryField("cliente", (t) =>
  t.prismaField({
    type: Cliente,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authClienteLectura(ctx);
      await requerirAccesoCliente(ctx.usuario?.idusuario, args.id);
      const cliente = await ctx.prisma.tbl_cliente.findFirst({
        ...(query as Record<string, unknown>),
        where: { idcliente: args.id, estado: true, deletedAt: null },
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

export const clientesQuery = builder.queryField("clientes", (t) =>
  t.field({
    type: ClientePage,
    args: {
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 10 }),
      filters: t.arg({ type: ClienteFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await authClienteLectura(ctx);
      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
        10,
      );
      const filters = args.filters || {};
      const scopeCliente = await filtroClientePorMandante(ctx.usuario?.idusuario);

      const where: Prisma.tbl_clienteWhereInput = {
        estado: true,
        deletedAt: null,
        ...(scopeCliente ?? {}),
      };
      const filtersData = filters as {
        search?: string;
        estado?: boolean;
        idtipodocumento?: number;
        idgenero?: number;
        idestadocivil?: number;
        idocupacion?: number;
        idtipopersona?: number;
        idpais?: number;
        iddepartamento?: number;
      };

      if (filtersData.search) {
        where.OR = [
          { primer_nombres: { contains: filtersData.search } },
          { segundo_nombres: { contains: filtersData.search } },
          { primer_apellido: { contains: filtersData.search } },
          { segundo_apellido: { contains: filtersData.search } },
          { numerodocumento: { contains: filtersData.search } },
          { email: { contains: filtersData.search } },
          { telefono: { contains: filtersData.search } },
          { celular: { contains: filtersData.search } },
        ];
      }

      if (filtersData.idtipodocumento) {
        where.idtipodocumento = filtersData.idtipodocumento;
      }
      if (filtersData.idgenero) {
        where.idgenero = filtersData.idgenero;
      }
      if (filtersData.idestadocivil) {
        where.idestadocivil = filtersData.idestadocivil;
      }
      if (filtersData.idocupacion) {
        where.idocupacion = filtersData.idocupacion;
      }
      if (filtersData.idtipopersona) {
        where.idtipopersona = filtersData.idtipopersona;
      }
      if (filtersData.idpais) {
        where.idpais = filtersData.idpais;
      }
      if (filtersData.iddepartamento) {
        where.iddepartamento = filtersData.iddepartamento;
      }
      if (filtersData.estado !== undefined) {
        where.estado = filtersData.estado;
      }

      const [clientes, total] = await Promise.all([
        ctx.prisma.tbl_cliente.findMany({
          skip,
          take: pageSize,
          where,
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
          orderBy: {
            createdAt: "desc",
          },
        }),
        ctx.prisma.tbl_cliente.count({ where }),
      ]);

      return {
        clientes,
        ...buildPaginationMeta(total, page, pageSize),
      };
    },
  }),
);

builder.queryField('clienteVista360', (t) =>
  t.field({
    type: builder
      .objectRef<Awaited<ReturnType<typeof obtenerVista360Cliente>>>(
        'ClienteVista360',
      )
      .implement({
        fields: (t2) => ({
          cliente: t2.field({
            type: builder
              .objectRef<{
                idcliente: number;
                nombreCompleto: string;
                numerodocumento: string;
                celular: string | null;
                telefono: string | null;
                email: string | null;
                direccion: string | null;
              }>('Cliente360Info')
              .implement({
                fields: (t3) => ({
                  idcliente: t3.exposeInt('idcliente'),
                  nombreCompleto: t3.exposeString('nombreCompleto'),
                  numerodocumento: t3.exposeString('numerodocumento'),
                  celular: t3.exposeString('celular', { nullable: true }),
                  telefono: t3.exposeString('telefono', { nullable: true }),
                  email: t3.exposeString('email', { nullable: true }),
                  direccion: t3.exposeString('direccion', { nullable: true }),
                }),
              }),
            resolve: (p) => p.cliente,
          }),
          totales: t2.field({
            type: builder
              .objectRef<{
                saldoTotal: number;
                prestamosActivos: number;
                gestionesTotal: number;
                pagosMes: number;
              }>('Cliente360Totales')
              .implement({
                fields: (t3) => ({
                  saldoTotal: t3.exposeFloat('saldoTotal'),
                  prestamosActivos: t3.exposeInt('prestamosActivos'),
                  gestionesTotal: t3.exposeInt('gestionesTotal'),
                  pagosMes: t3.exposeFloat('pagosMes'),
                }),
              }),
            resolve: (p) => p.totales,
          }),
          prestamos: t2.field({
            type: [
              builder
                .objectRef<{
                  idprestamo: number;
                  noPrestamo: string;
                  estado: string;
                  saldoTotal: number;
                  diasMora: number;
                  mandante: string;
                }>('Cliente360Prestamo')
                .implement({
                  fields: (t3) => ({
                    idprestamo: t3.exposeInt('idprestamo'),
                    noPrestamo: t3.exposeString('noPrestamo'),
                    estado: t3.exposeString('estado'),
                    saldoTotal: t3.exposeFloat('saldoTotal'),
                    diasMora: t3.exposeInt('diasMora'),
                    mandante: t3.exposeString('mandante'),
                  }),
                }),
            ],
            resolve: (p) => p.prestamos,
          }),
          gestionesRecientes: t2.field({
            type: [
              builder
                .objectRef<{
                  idgestion: number;
                  fechaGestion: Date;
                  tipo: string;
                  resultado: string | null;
                  gestor: string | null;
                }>('Cliente360Gestion')
                .implement({
                  fields: (t3) => ({
                    idgestion: t3.exposeInt('idgestion'),
                    fechaGestion: t3.expose('fechaGestion', { type: 'DateTime' }),
                    tipo: t3.exposeString('tipo'),
                    resultado: t3.exposeString('resultado', { nullable: true }),
                    gestor: t3.exposeString('gestor', { nullable: true }),
                  }),
                }),
            ],
            resolve: (p) => p.gestionesRecientes,
          }),
          pagosRecientes: t2.field({
            type: [
              builder
                .objectRef<{
                  idpago: number;
                  fechaPago: Date;
                  monto: number;
                  medio: string | null;
                }>('Cliente360Pago')
                .implement({
                  fields: (t3) => ({
                    idpago: t3.exposeInt('idpago'),
                    fechaPago: t3.expose('fechaPago', { type: 'DateTime' }),
                    monto: t3.exposeFloat('monto'),
                    medio: t3.exposeString('medio', { nullable: true }),
                  }),
                }),
            ],
            resolve: (p) => p.pagosRecientes,
          }),
          reclamos: t2.field({
            type: [
              builder
                .objectRef<{
                  idreclamo: number;
                  estado: string;
                  descripcion: string;
                  fechaLimite: Date;
                }>('Cliente360Reclamo')
                .implement({
                  fields: (t3) => ({
                    idreclamo: t3.exposeInt('idreclamo'),
                    estado: t3.exposeString('estado'),
                    descripcion: t3.exposeString('descripcion'),
                    fechaLimite: t3.expose('fechaLimite', { type: 'DateTime' }),
                  }),
                }),
            ],
            resolve: (p) => p.reclamos,
          }),
          contactos: t2.field({
            type: [
              builder
                .objectRef<{
                  idcontacto: number;
                  tipo: string;
                  valor: string;
                  autorizado: boolean;
                  noContactar: boolean;
                }>('Cliente360Contacto')
                .implement({
                  fields: (t3) => ({
                    idcontacto: t3.exposeInt('idcontacto'),
                    tipo: t3.exposeString('tipo'),
                    valor: t3.exposeString('valor'),
                    autorizado: t3.exposeBoolean('autorizado'),
                    noContactar: t3.exposeBoolean('noContactar'),
                  }),
                }),
            ],
            resolve: (p) => p.contactos,
          }),
        }),
      }),
    args: { idcliente: t.arg.int({ required: true }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await authClienteLectura(ctx);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerVista360Cliente(idusuario, args.idcliente);
    },
  }),
);
