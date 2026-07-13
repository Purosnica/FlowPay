import { builder ,type  GraphQLContext } from '../../builder';

import {
  UsuarioPerfil,
  UpdatePerfilInput,
  UpdatePerfilInputSchema,
} from './perfil-types';
import {
  obtenerMiPerfil,
  actualizarMiPerfil,
} from '@/lib/logic/perfil-logic';

import {
  GraphQLAuthenticationError,
} from '@/lib/errors/graphql-errors';

function requerirAutenticado(ctx: GraphQLContext): number {
  if (!ctx.usuario?.idusuario) {
    throw new GraphQLAuthenticationError(
      'No autenticado. Por favor, inicia sesión.',
    );
  }
  return ctx.usuario.idusuario;
}

builder.queryField('miPerfil', (t) =>
  t.field({
    type: UsuarioPerfil,
    resolve: async (_parent, _args, ctx: GraphQLContext) => {
      const idusuario = requerirAutenticado(ctx);
      return obtenerMiPerfil(idusuario);
    },
  }),
);

builder.mutationField('actualizarMiPerfil', (t) =>
  t.field({
    type: UsuarioPerfil,
    args: { input: t.arg({ type: UpdatePerfilInput, required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      const idusuario = requerirAutenticado(ctx);
      const data = UpdatePerfilInputSchema.parse(args.input);
      return actualizarMiPerfil(idusuario, data);
    },
  }),
);
