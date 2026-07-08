/**
 * Helpers de autenticación/autorización para resolvers GraphQL.
 */

import type { GraphQLContext } from './builder';
import { GraphQLAuthenticationError } from '@/lib/errors/graphql-errors';
import {
  requerirAlgunPermiso,
  requerirPermiso,
} from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';

export type ContextoAutenticado = GraphQLContext & {
  usuario: NonNullable<GraphQLContext['usuario']>;
};

export function requerirAutenticado(
  ctx: GraphQLContext,
): asserts ctx is ContextoAutenticado {
  if (!ctx.usuario) {
    throw new GraphQLAuthenticationError(
      'Debes estar autenticado para realizar esta operación.',
    );
  }
}

export async function authClienteLectura(ctx: GraphQLContext): Promise<void> {
  requerirAutenticado(ctx);
  await requerirPermiso(ctx.usuario.idusuario, PERMISO.CARTERA_READ);
}

export async function authClienteEscritura(ctx: GraphQLContext): Promise<void> {
  requerirAutenticado(ctx);
  await requerirPermiso(ctx.usuario.idusuario, PERMISO.CARTERA_WRITE);
}

export async function authCatalogoLectura(ctx: GraphQLContext): Promise<void> {
  requerirAutenticado(ctx);
  await requerirPermiso(ctx.usuario.idusuario, PERMISO.CARTERA_READ);
}

export async function authCatalogoEscritura(ctx: GraphQLContext): Promise<void> {
  requerirAutenticado(ctx);
  await requerirPermiso(ctx.usuario.idusuario, PERMISO.CONFIG_SYSTEM);
}

export async function authNotificacionesOperativas(
  ctx: GraphQLContext,
): Promise<number> {
  requerirAutenticado(ctx);
  await requerirAlgunPermiso(ctx.usuario.idusuario, [
    PERMISO.CARTERA_READ,
    PERMISO.GESTION_READ,
    PERMISO.INTELIGENCIA_READ,
  ]);
  return ctx.usuario.idusuario;
}

export async function authConfigSistema(ctx: GraphQLContext): Promise<number> {
  requerirAutenticado(ctx);
  await requerirPermiso(ctx.usuario.idusuario, PERMISO.CONFIG_SYSTEM);
  return ctx.usuario.idusuario;
}
