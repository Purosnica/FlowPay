import { builder ,type  GraphQLContext } from '../../builder';

import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  UsuarioGestion,
  CreateUsuarioInput,
  UpdateUsuarioInput,
  CreateUsuarioInputSchema,
  UpdateUsuarioInputSchema,
  SetUsuarioActivoInputSchema,
} from './admin-types';
import {
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
} from '@/lib/logic/usuario-logic';

builder.mutationField('createUsuario', (t) =>
  t.field({
    type: UsuarioGestion,
    args: { input: t.arg({ type: CreateUsuarioInput, required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.USER_WRITE);
      const data = CreateUsuarioInputSchema.parse(args.input);
      return crearUsuario(data);
    },
  }),
);

builder.mutationField('updateUsuario', (t) =>
  t.field({
    type: UsuarioGestion,
    args: { input: t.arg({ type: UpdateUsuarioInput, required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.USER_WRITE);
      const data = UpdateUsuarioInputSchema.parse(args.input);
      const idActual = ctx.usuario?.idusuario ?? 0;
      return actualizarUsuario(data, idActual);
    },
  }),
);

builder.mutationField('setUsuarioActivo', (t) =>
  t.field({
    type: UsuarioGestion,
    args: {
      idusuario: t.arg.int({ required: true }),
      activo: t.arg.boolean({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.USER_WRITE);
      const data = SetUsuarioActivoInputSchema.parse(args);
      const idActual = ctx.usuario?.idusuario ?? 0;
      return cambiarEstadoUsuario(data.idusuario, data.activo, idActual);
    },
  }),
);
