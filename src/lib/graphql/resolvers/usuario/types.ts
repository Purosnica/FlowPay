import { definePrismaObject } from "../../helpers/prisma-object";

/**
 * Tipo mínimo para relaciones (gestor en préstamo/gestión).
 * No expone credenciales ni datos sensibles.
 */
export const Usuario = definePrismaObject('tbl_usuario', {
  fields: (t) => ({
    idusuario: t.exposeInt('idusuario'),
    nombre: t.exposeString('nombre'),
    email: t.exposeString('email'),
    activo: t.exposeBoolean('activo'),
  }),
});
