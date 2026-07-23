/**
 * RESOLVERS PARA BÚSQUEDA GLOBAL
 *
 * Búsqueda rápida de clientes con resultados limitados y optimizados
 */

import { builder, type GraphQLContext } from '../../builder';

import { authClienteLectura } from '@/lib/graphql/auth-helpers';
import { BUSQUEDA_CLIENTE_LIMITE_MAX } from '@/lib/cobranza/performance-limits';
import { filtroClientePorMandante } from '@/lib/cobranza/mandante-scope';
import {
  buildClienteSearchOr,
  CLIENTE_NOMBRE_SELECT,
  formatNombreClienteDisplay,
} from '@/lib/logic/cliente-tipo-persona-logic';

// Tipo para resultado de búsqueda
interface SearchClienteItem {
  tipo: 'cliente';
  id: number;
  codigo: string;
  nombre: string;
  subtitulo: string;
  metadata?: Record<string, unknown>;
}

export const SearchResultItem = builder.objectRef<SearchClienteItem>(
  'SearchResultItem',
);

SearchResultItem.implement({
  fields: (t) => ({
    tipo: t.exposeString('tipo'),
    id: t.exposeInt('id'),
    codigo: t.exposeString('codigo'),
    nombre: t.exposeString('nombre'),
    subtitulo: t.exposeString('subtitulo'),
    metadata: t.string({
      nullable: true,
      resolve: (parent) =>
        parent.metadata ? JSON.stringify(parent.metadata) : null,
    }),
  }),
});

export const SearchResults = builder.objectRef<{
  clientes: SearchClienteItem[];
  total: number;
}>('SearchResults');

SearchResults.implement({
  fields: (t) => ({
    clientes: t.field({
      type: [SearchResultItem],
      resolve: (parent) => parent.clientes,
    }),
    total: t.exposeInt('total'),
  }),
});

/**
 * Query para búsqueda global de clientes
 */
builder.queryField('buscarGlobal', (t) =>
  t.field({
    type: SearchResults,
    args: {
      query: t.arg.string({ required: true }),
      limite: t.arg.int({ required: false, defaultValue: 10 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await authClienteLectura(ctx);
      const searchQuery = args.query.trim();
      const limite = Math.min(
        Math.max(args.limite || 10, 1),
        BUSQUEDA_CLIENTE_LIMITE_MAX,
      );

      if (searchQuery.length < 2) {
        return {
          clientes: [],
          total: 0,
        };
      }

      const scopeCliente = await filtroClientePorMandante(
        ctx.usuario?.idusuario,
      );

      const clientes = await ctx.prisma.tbl_cliente.findMany({
        where: {
          estado: true,
          deletedAt: null,
          ...(scopeCliente ?? {}),
          OR: buildClienteSearchOr(searchQuery),
        },
        select: {
          idcliente: true,
          ...CLIENTE_NOMBRE_SELECT,
          numerodocumento: true,
          email: true,
        },
        take: limite,
        orderBy: { primer_nombres: 'asc' },
      });

      const clientesFormateados = clientes.map((cliente) => ({
        tipo: 'cliente' as const,
        id: cliente.idcliente,
        codigo: cliente.numerodocumento || '',
        nombre: formatNombreClienteDisplay(cliente),
        subtitulo: cliente.email || cliente.numerodocumento || '',
        metadata: {
          email: cliente.email,
          documento: cliente.numerodocumento,
        },
      }));

      return {
        clientes: clientesFormateados,
        total: clientesFormateados.length,
      };
    },
  }),
);
