import { builder } from "../../builder";
import { Cliente, ClientePage, ClienteFiltersInput } from "./types";

// Query para obtener un cliente por ID
export const clienteQuery = builder.queryField("cliente", (t) =>
  t.prismaField({
    type: Cliente,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: any) => {
      const cliente = await ctx.prisma.tbl_cliente.findUnique({
        ...query,
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

// Query para obtener clientes con paginación y filtros
export const clientesQuery = builder.queryField("clientes", (t) =>
  t.field({
    type: ClientePage,
    args: {
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 10 }),
      filters: t.arg({ type: ClienteFiltersInput, required: false }),
    },
    resolve: async (_parent, args, ctx: any) => {
      const page = args.page || 1;
      const pageSize = args.pageSize || 10;
      const skip = (page - 1) * pageSize;
      const filters = (args.filters || {}) as any;

      // Construir where clause
      const where: any = {};
      const filtersData = filters;

      // Búsqueda general
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

      // Filtros específicos
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

      // Obtener total y datos
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
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  })
);

