import { builder } from '../../builder';
import { z } from 'zod';
import { exposeDecimal } from '../../helpers/graphql-helpers';
import {
  CreateUsuarioInputSchema,
  UpdateUsuarioInputSchema,
} from '@/lib/validators/usuario';

export const CreateUsuarioInput = builder.inputRef('CreateUsuarioInput').implement({
  fields: (t) => ({
    nombre: t.string({ required: true }),
    email: t.string({ required: true }),
    telefono: t.string({ required: false }),
    idrol: t.int({ required: true }),
    password: t.string({ required: true }),
    porcentajeComision: t.float({ required: false, defaultValue: 0 }),
    activo: t.boolean({ required: false, defaultValue: true }),
    idsupervisor: t.int({ required: false }),
  }),
});

export const UpdateUsuarioInput = builder.inputRef('UpdateUsuarioInput').implement({
  fields: (t) => ({
    idusuario: t.int({ required: true }),
    nombre: t.string({ required: false }),
    email: t.string({ required: false }),
    telefono: t.string({ required: false }),
    idrol: t.int({ required: false }),
    password: t.string({ required: false }),
    porcentajeComision: t.float({ required: false }),
    activo: t.boolean({ required: false }),
    idsupervisor: t.int({ required: false }),
  }),
});

export { CreateUsuarioInputSchema, UpdateUsuarioInputSchema };

export const RolBasicoGql = builder
  .objectRef<{
    idrol: number;
    codigo: string;
    descripcion: string;
    estado: boolean;
  }>('RolBasicoGql')
  .implement({
    fields: (t) => ({
      idrol: t.exposeInt('idrol'),
      codigo: t.exposeString('codigo'),
      descripcion: t.exposeString('descripcion'),
      estado: t.exposeBoolean('estado'),
    }),
  });

export const UsuarioGestion = builder
  .objectRef<{
    idusuario: number;
    nombre: string;
    email: string;
    telefono: string | null;
    porcentajeComision: unknown;
    activo: boolean;
    idrol: number;
    idsupervisor: number | null;
    ultimoAcceso: Date | null;
    rol: {
      idrol: number;
      codigo: string;
      descripcion: string;
      estado: boolean;
    };
  }>('UsuarioGestion')
  .implement({
    fields: (t) => ({
      idusuario: t.exposeInt('idusuario'),
      nombre: t.exposeString('nombre'),
      email: t.exposeString('email'),
      telefono: t.exposeString('telefono', { nullable: true }),
      porcentajeComision: exposeDecimal(t, 'porcentajeComision'),
      activo: t.exposeBoolean('activo'),
      idrol: t.exposeInt('idrol'),
      idsupervisor: t.exposeInt('idsupervisor', { nullable: true }),
      ultimoAcceso: t.expose('ultimoAcceso', { type: 'DateTime', nullable: true }),
      rol: t.field({
        type: RolBasicoGql,
        resolve: (parent) => parent.rol,
      }),
    }),
  });

export const UsuarioPage = builder
  .objectRef<{
    usuarios: Array<{
      idusuario: number;
      nombre: string;
      email: string;
      telefono: string | null;
      porcentajeComision: unknown;
      activo: boolean;
      idrol: number;
      idsupervisor: number | null;
      ultimoAcceso: Date | null;
      rol: {
        idrol: number;
        codigo: string;
        descripcion: string;
        estado: boolean;
      };
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>('UsuarioPage')
  .implement({
    fields: (t) => ({
      usuarios: t.field({
        type: [UsuarioGestion],
        resolve: (parent) => parent.usuarios,
      }),
      total: t.exposeInt('total'),
      page: t.exposeInt('page'),
      pageSize: t.exposeInt('pageSize'),
      totalPages: t.exposeInt('totalPages'),
    }),
  });

export const SetUsuarioActivoInputSchema = z.object({
  idusuario: z.number().int().positive(),
  activo: z.boolean(),
});
