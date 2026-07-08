import { builder } from '../../builder';
import {
  CreateRolInputSchema,
  UpdateRolInputSchema,
  SetPermisosRolInputSchema,
} from '@/lib/validators/usuario';

export const CreateRolInput = builder.inputRef('CreateRolInput').implement({
  fields: (t) => ({
    codigo: t.string({ required: true }),
    descripcion: t.string({ required: true }),
    estado: t.boolean({ required: false, defaultValue: true }),
  }),
});

export const UpdateRolInput = builder.inputRef('UpdateRolInput').implement({
  fields: (t) => ({
    idrol: t.int({ required: true }),
    codigo: t.string({ required: false }),
    descripcion: t.string({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

export const SetPermisosRolInput = builder
  .inputRef('SetPermisosRolInput')
  .implement({
    fields: (t) => ({
      idrol: t.int({ required: true }),
      idpermisos: t.intList({ required: true }),
    }),
  });

export {
  CreateRolInputSchema,
  UpdateRolInputSchema,
  SetPermisosRolInputSchema,
};

export const PermisoCatalogo = builder
  .objectRef<{
    idpermiso: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    categoria: string | null;
  }>('PermisoCatalogo')
  .implement({
    fields: (t) => ({
      idpermiso: t.exposeInt('idpermiso'),
      codigo: t.exposeString('codigo'),
      nombre: t.exposeString('nombre'),
      descripcion: t.exposeString('descripcion', { nullable: true }),
      categoria: t.exposeString('categoria', { nullable: true }),
    }),
  });

export const RolGestion = builder
  .objectRef<{
    idrol: number;
    codigo: string;
    descripcion: string;
    estado: boolean;
    permisos: string[];
    cantidadUsuarios: number;
  }>('RolGestion')
  .implement({
    fields: (t) => ({
      idrol: t.exposeInt('idrol'),
      codigo: t.exposeString('codigo'),
      descripcion: t.exposeString('descripcion'),
      estado: t.exposeBoolean('estado'),
      permisos: t.exposeStringList('permisos'),
      cantidadUsuarios: t.exposeInt('cantidadUsuarios'),
    }),
  });

export const RolPage = builder
  .objectRef<{
    roles: Array<{
      idrol: number;
      codigo: string;
      descripcion: string;
      estado: boolean;
      permisos: string[];
      cantidadUsuarios: number;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>('RolPage')
  .implement({
    fields: (t) => ({
      roles: t.field({
        type: [RolGestion],
        resolve: (parent) => parent.roles,
      }),
      total: t.exposeInt('total'),
      page: t.exposeInt('page'),
      pageSize: t.exposeInt('pageSize'),
      totalPages: t.exposeInt('totalPages'),
    }),
  });
