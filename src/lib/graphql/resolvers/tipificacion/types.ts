import { definePrismaObject } from "../../helpers/prisma-object";

export const CodigoAccion = definePrismaObject("tbl_codigo_accion", {
  fields: (t) => ({
    idcodaccion: t.exposeInt("idcodaccion"),
    codigo: t.exposeString("codigo"),
    descripcion: t.exposeString("descripcion"),
    esTercero: t.exposeBoolean("esTercero"),
    estado: t.exposeBoolean("estado"),
  }),
});

export const CodigoResultado = definePrismaObject("tbl_codigo_resultado", {
  fields: (t) => ({
    idcodresultado: t.exposeInt("idcodresultado"),
    codigo: t.exposeString("codigo"),
    descripcion: t.exposeString("descripcion"),
    grupo: t.exposeString("grupo"),
    tipoGestion: t.exposeString("tipoGestion"),
    estado: t.exposeBoolean("estado"),
  }),
});
