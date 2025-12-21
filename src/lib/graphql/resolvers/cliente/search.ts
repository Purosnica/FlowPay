/**
 * RESOLVERS PARA BÚSQUEDA GLOBAL
 * 
 * Búsqueda rápida de clientes y préstamos con resultados limitados y optimizados
 */

import { builder } from "../../builder";
import { Prisma } from "@prisma/client";

// Tipo para resultado de búsqueda
export const SearchResultItem = builder.objectRef<{
  tipo: "cliente" | "prestamo";
  id: number;
  codigo: string;
  nombre: string;
  subtitulo: string;
  metadata?: Record<string, any>;
}>("SearchResultItem");

SearchResultItem.implement({
  fields: (t) => ({
    tipo: t.exposeString("tipo"),
    id: t.exposeInt("id"),
    codigo: t.exposeString("codigo"),
    nombre: t.exposeString("nombre"),
    subtitulo: t.exposeString("subtitulo"),
    metadata: t.string({
      nullable: true,
      resolve: (parent) => parent.metadata ? JSON.stringify(parent.metadata) : null,
    }),
  }),
});

export const SearchResults = builder.objectRef<{
  clientes: any[];
  prestamos: any[];
  total: number;
}>("SearchResults");

SearchResults.implement({
  fields: (t) => ({
    clientes: t.field({
      type: [SearchResultItem],
      resolve: (parent) => parent.clientes,
    }),
    prestamos: t.field({
      type: [SearchResultItem],
      resolve: (parent) => parent.prestamos,
    }),
    total: t.exposeInt("total"),
  }),
});

/**
 * Query para búsqueda global de clientes y préstamos
 */
builder.queryField("buscarGlobal", (t) =>
  t.field({
    type: SearchResults,
    args: {
      query: t.arg.string({ required: true }),
      limite: t.arg.int({ required: false, defaultValue: 10 }),
    },
    resolve: async (_parent, args, ctx) => {
      const searchQuery = args.query.trim();
      const limite = args.limite || 10;

      if (searchQuery.length < 2) {
        return {
          clientes: [],
          prestamos: [],
          total: 0,
        };
      }

      // Buscar clientes
      const clientes = await ctx.prisma.tbl_cliente.findMany({
        where: {
          OR: [
            { primer_nombres: { contains: searchQuery } },
            { primer_apellido: { contains: searchQuery } },
            { numerodocumento: { contains: searchQuery } },
            { email: { contains: searchQuery } },
          ],
        },
        select: {
          idcliente: true,
          primer_nombres: true,
          primer_apellido: true,
          numerodocumento: true,
          email: true,
        },
        take: limite,
        orderBy: { primer_nombres: "asc" },
      });

      // Buscar préstamos
      const prestamos = await ctx.prisma.tbl_prestamo.findMany({
        where: {
          OR: [
            { codigo: { contains: searchQuery } },
            { referencia: { contains: searchQuery } },
            {
              cliente: {
                OR: [
                  { primer_nombres: { contains: searchQuery } },
                  { primer_apellido: { contains: searchQuery } },
                  { numerodocumento: { contains: searchQuery } },
                ],
              },
            },
          ],
        },
        select: {
          idprestamo: true,
          codigo: true,
          referencia: true,
          estado: true,
          cliente: {
            select: {
              primer_nombres: true,
              primer_apellido: true,
            },
          },
        },
        take: limite,
        orderBy: { codigo: "desc" },
      });

      // Formatear resultados de clientes
      const clientesFormateados = clientes.map((cliente) => ({
        tipo: "cliente" as const,
        id: cliente.idcliente,
        codigo: cliente.numerodocumento || "",
        nombre: `${cliente.primer_nombres} ${cliente.primer_apellido}`,
        subtitulo: cliente.email || cliente.numerodocumento || "",
        metadata: {
          email: cliente.email,
          documento: cliente.numerodocumento,
        },
      }));

      // Formatear resultados de préstamos
      const prestamosFormateados = prestamos.map((prestamo) => ({
        tipo: "prestamo" as const,
        id: prestamo.idprestamo,
        codigo: prestamo.codigo,
        nombre: `Préstamo ${prestamo.codigo}`,
        subtitulo: `${prestamo.cliente.primer_nombres} ${prestamo.cliente.primer_apellido}`,
        metadata: {
          estado: prestamo.estado,
          referencia: prestamo.referencia,
        },
      }));

      return {
        clientes: clientesFormateados,
        prestamos: prestamosFormateados,
        total: clientesFormateados.length + prestamosFormateados.length,
      };
    },
  })
);

