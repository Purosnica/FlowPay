import { builder ,type  GraphQLContext } from '../../builder';

import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { RolGestion, RolPage, PermisoCatalogo } from './types';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../helpers/graphql-helpers';

const rolInclude = {
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
} as const;

function mapRolGestion(rol: {
  idrol: number;
  codigo: string;
  descripcion: string;
  estado: boolean;
  permisos: Array<{ permiso: { codigo: string } }>;
  _count: { usuarios: number };
}): {
  idrol: number;
  codigo: string;
  descripcion: string;
  estado: boolean;
  permisos: string[];
  cantidadUsuarios: number;
} {
  return {
    idrol: rol.idrol,
    codigo: rol.codigo,
    descripcion: rol.descripcion,
    estado: rol.estado,
    permisos: rol.permisos.map((rp) => rp.permiso.codigo),
    cantidadUsuarios: rol._count.usuarios,
  };
}

builder.queryField('roles', (t) =>
  t.field({
    type: RolPage,
    args: {
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.USER_READ);

      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const where = { deletedAt: null };

      const [roles, total] = await Promise.all([
        ctx.prisma.tbl_rol.findMany({
          where,
          skip,
          take: pageSize,
          include: rolInclude,
          orderBy: { codigo: 'asc' },
        }),
        ctx.prisma.tbl_rol.count({ where }),
      ]);

      return {
        roles: roles.map(mapRolGestion),
        ...buildPaginationMeta(total, page, pageSize),
      };
    },
  }),
);

builder.queryField('permisosCatalogo', (t) =>
  t.field({
    type: [PermisoCatalogo],
    resolve: async (_parent, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.USER_READ);
      return ctx.prisma.tbl_permiso.findMany({
        where: { estado: true, deletedAt: null },
        orderBy: [{ categoria: 'asc' }, { codigo: 'asc' }],
      });
    },
  }),
);

builder.queryField('rolesActivos', (t) =>
  t.field({
    type: [RolGestion],
    resolve: async (_parent, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.USER_READ);

      const roles = await ctx.prisma.tbl_rol.findMany({
        where: { deletedAt: null, estado: true },
        include: rolInclude,
        orderBy: { codigo: 'asc' },
      });

      return roles.map(mapRolGestion);
    },
  }),
);
