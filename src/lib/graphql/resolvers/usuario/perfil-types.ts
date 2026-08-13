import { builder } from '../../builder';
import { UpdatePerfilInputSchema } from '@/lib/validators/usuario/perfil';

export const UpdatePerfilInput = builder.inputRef('UpdatePerfilInput').implement({
  fields: (t) => ({
    nombre: t.string({ required: false }),
    email: t.string({ required: false }),
    telefono: t.string({ required: false }),
    passwordActual: t.string({ required: false }),
    passwordNueva: t.string({ required: false }),
  }),
});

export { UpdatePerfilInputSchema };

export const UsuarioPerfil = builder
  .objectRef<{
    idusuario: number;
    nombre: string;
    email: string;
    telefono: string | null;
    fotoPerfilMime: string | null;
    updatedAt: Date;
    ultimoAcceso: Date | null;
    rol: {
      idrol: number;
      codigo: string;
      descripcion: string;
    };
  }>('UsuarioPerfil')
  .implement({
    fields: (t) => ({
      idusuario: t.exposeInt('idusuario'),
      nombre: t.exposeString('nombre'),
      email: t.exposeString('email'),
      telefono: t.exposeString('telefono', { nullable: true }),
      fotoPerfil: t.string({
        nullable: true,
        resolve: (parent) =>
          parent.fotoPerfilMime
            ? `/api/perfil/foto?v=${parent.updatedAt.getTime()}`
            : null,
      }),
      ultimoAcceso: t.expose('ultimoAcceso', {
        type: 'DateTime',
        nullable: true,
      }),
      rol: t.field({
        type: builder
          .objectRef<{
            idrol: number;
            codigo: string;
            descripcion: string;
          }>('RolPerfil')
          .implement({
            fields: (t2) => ({
              idrol: t2.exposeInt('idrol'),
              codigo: t2.exposeString('codigo'),
              descripcion: t2.exposeString('descripcion'),
            }),
          }),
        resolve: (parent) => parent.rol,
      }),
    }),
  });
