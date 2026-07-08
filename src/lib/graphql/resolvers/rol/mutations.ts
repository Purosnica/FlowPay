import { builder ,type  GraphQLContext } from '../../builder';

import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  RolGestion,
  CreateRolInput,
  UpdateRolInput,
  SetPermisosRolInput,
  CreateRolInputSchema,
  UpdateRolInputSchema,
  SetPermisosRolInputSchema,
} from './types';

async function mapRolGestion(
  ctx: GraphQLContext,
  idrol: number,
): Promise<{
  idrol: number;
  codigo: string;
  descripcion: string;
  estado: boolean;
  permisos: string[];
  cantidadUsuarios: number;
}> {
  const rol = await ctx.prisma.tbl_rol.findUnique({
    where: { idrol },
    include: {
      permisos: {
        include: { permiso: true },
        where: {
          permiso: { estado: true, deletedAt: null },
        },
      },
      _count: {
        select: {
          usuarios: {
            where: { deletedAt: null, activo: true },
          },
        },
      },
    },
  });

  if (!rol) {
    throw new Error('Rol no encontrado');
  }

  return {
    idrol: rol.idrol,
    codigo: rol.codigo,
    descripcion: rol.descripcion,
    estado: rol.estado,
    permisos: rol.permisos.map((rp) => rp.permiso.codigo),
    cantidadUsuarios: rol._count.usuarios,
  };
}

builder.mutationField('createRol', (t) =>
  t.field({
    type: RolGestion,
    args: { input: t.arg({ type: CreateRolInput, required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.USER_WRITE);
      const data = CreateRolInputSchema.parse(args.input);

      const existe = await ctx.prisma.tbl_rol.findFirst({
        where: { codigo: data.codigo, deletedAt: null },
      });

      if (existe) {
        throw new Error('Ya existe un rol con ese código');
      }

      const rol = await ctx.prisma.tbl_rol.create({
        data: {
          codigo: data.codigo,
          descripcion: data.descripcion,
          estado: data.estado,
        },
      });

      return mapRolGestion(ctx, rol.idrol);
    },
  }),
);

builder.mutationField('updateRol', (t) =>
  t.field({
    type: RolGestion,
    args: { input: t.arg({ type: UpdateRolInput, required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.USER_WRITE);
      const data = UpdateRolInputSchema.parse(args.input);

      const rol = await ctx.prisma.tbl_rol.findFirst({
        where: { idrol: data.idrol, deletedAt: null },
      });

      if (!rol) {
        throw new Error('Rol no encontrado');
      }

      if (data.codigo && data.codigo !== rol.codigo) {
        const existe = await ctx.prisma.tbl_rol.findFirst({
          where: {
            codigo: data.codigo,
            deletedAt: null,
            NOT: { idrol: data.idrol },
          },
        });

        if (existe) {
          throw new Error('Ya existe un rol con ese código');
        }
      }

      await ctx.prisma.tbl_rol.update({
        where: { idrol: data.idrol },
        data: {
          codigo: data.codigo,
          descripcion: data.descripcion,
          estado: data.estado,
        },
      });

      return mapRolGestion(ctx, data.idrol);
    },
  }),
);

builder.mutationField('setPermisosRol', (t) =>
  t.field({
    type: RolGestion,
    args: { input: t.arg({ type: SetPermisosRolInput, required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.USER_WRITE);
      const data = SetPermisosRolInputSchema.parse(args.input);

      const rol = await ctx.prisma.tbl_rol.findFirst({
        where: { idrol: data.idrol, deletedAt: null },
      });

      if (!rol) {
        throw new Error('Rol no encontrado');
      }

      const permisosValidos = await ctx.prisma.tbl_permiso.findMany({
        where: {
          idpermiso: { in: data.idpermisos },
          estado: true,
          deletedAt: null,
        },
      });

      const idsValidos = permisosValidos.map((p) => p.idpermiso);

      await ctx.prisma.$transaction([
        ctx.prisma.tbl_rol_permiso.deleteMany({
          where: { idrol: data.idrol },
        }),
        ctx.prisma.tbl_rol_permiso.createMany({
          data: idsValidos.map((idpermiso) => ({
            idrol: data.idrol,
            idpermiso,
          })),
        }),
      ]);

      return mapRolGestion(ctx, data.idrol);
    },
  }),
);
