/**
 * RESOLVERS PARA DOCUMENTOS
 * 
 * Este módulo gestiona la subida, versionado y control de acceso de documentos.
 * 
 * CONTROL DE ACCESO POR ROL:
 * - ADMINISTRADOR: Acceso completo
 * - SUPERVISOR: Puede ver y subir todos los documentos
 * - ANALISTA_RIESGO: Puede ver contratos y pagarés
 * - ASESOR_CREDITO: Puede subir y ver documentos de sus préstamos
 * - COBRADOR: Puede ver evidencia y comprobantes
 * - BACKOFFICE: Acceso completo a documentos
 * - AUDITOR: Solo lectura de todos los documentos
 */

import { builder } from "../../builder";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import {
  CreateDocumentoInput,
  CreateDocumentoInputSchema,
  Documento,
  DocumentoFiltersInput,
  GQLTipoDocumento,
} from "./types";
import { TipoDocumentoEnum, Prisma } from "@prisma/client";

const logAuditoria = async (
  ctx: any,
  data: { idusuario?: number | null; entidad: string; entidadId?: number; accion: string; detalle?: string }
) => {
  await ctx.prisma.tbl_auditoria.create({
    data: {
      idusuario: data.idusuario ?? null,
      entidad: data.entidad,
      entidadId: data.entidadId ?? null,
      accion: data.accion,
      detalle: data.detalle,
    },
  });
};

/**
 * Valida el acceso a documentos según el rol del usuario
 * Nota: En producción, esto debería venir del contexto de autenticación
 */
async function validarAccesoDocumento(
  ctx: any,
  idusuario: number | null | undefined,
  tipoDocumento: TipoDocumentoEnum,
  accion: "leer" | "escribir"
): Promise<boolean> {
  // TODO: Implementar validación real de roles desde el contexto
  // Por ahora, permitimos acceso (en producción debe validarse)
  
  // Ejemplo de lógica (comentado):
  // const usuario = await ctx.prisma.tbl_usuario.findUnique({
  //   where: { idusuario },
  //   include: { rol: true },
  // });
  // 
  // if (!usuario) return false;
  // 
  // const rol = usuario.rol.codigo;
  // 
  // // Reglas de acceso
  // if (rol === "ADMINISTRADOR" || rol === "BACKOFFICE") return true;
  // if (rol === "AUDITOR" && accion === "leer") return true;
  // 
  // // Acceso específico por tipo
  // if (tipoDocumento === TipoDocumentoEnum.CONTRATO || tipoDocumento === TipoDocumentoEnum.PAGARE) {
  //   return ["SUPERVISOR", "ANALISTA_RIESGO", "ASESOR_CREDITO"].includes(rol);
  // }
  // 
  // if (tipoDocumento === TipoDocumentoEnum.EVIDENCIA || tipoDocumento === TipoDocumentoEnum.COMPROBANTE) {
  //   return ["SUPERVISOR", "COBRADOR"].includes(rol);
  // }
  
  return true; // Por ahora permitimos acceso
}

/**
 * Obtiene la siguiente versión de un documento del mismo tipo
 */
async function obtenerSiguienteVersion(
  ctx: any,
  idprestamo: number,
  tipo: TipoDocumentoEnum
): Promise<number> {
  const ultimaVersion = await ctx.prisma.tbl_documento.findFirst({
    where: {
      idprestamo,
      tipo,
      deletedAt: null,
    },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  return (ultimaVersion?.version || 0) + 1;
}

/**
 * Mutation para subir un documento
 */
builder.mutationField("createDocumento", (t) =>
  t.field({
    type: Documento,
    args: {
      input: t.arg({ type: CreateDocumentoInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      const input = CreateDocumentoInputSchema.parse(args.input);

      // Validar permiso
      await requerirPermiso(input.idusuario, "MANAGE_DOCUMENTS");

      // Validar permiso
      await requerirPermiso(input.idusuario, "MANAGE_DOCUMENTS");

      // Validar acceso
      const tieneAcceso = await validarAccesoDocumento(
        ctx,
        input.idusuario,
        input.tipo,
        "escribir"
      );

      if (!tieneAcceso) {
        throw new Error("No tiene permisos para subir este tipo de documento");
      }

      // Validar que el préstamo existe
      const prestamo = await ctx.prisma.tbl_prestamo.findFirst({
        where: { idprestamo: input.idprestamo, deletedAt: null },
      });

      if (!prestamo) {
        throw new Error("Préstamo no encontrado");
      }

      // Obtener siguiente versión
      const nuevaVersion = await obtenerSiguienteVersion(
        ctx,
        input.idprestamo,
        input.tipo
      );

      // Si hay una versión anterior, marcarla como no actual
      if (nuevaVersion > 1) {
        await ctx.prisma.tbl_documento.updateMany({
          where: {
            idprestamo: input.idprestamo,
            tipo: input.tipo,
            esVersionActual: true,
            deletedAt: null,
          },
          data: {
            esVersionActual: false,
          },
        });
      }

      // Crear nuevo documento
      const documento = await ctx.prisma.tbl_documento.create({
        data: {
          idprestamo: input.idprestamo,
          idusuario: input.idusuario,
          tipo: input.tipo,
          nombre: input.nombre,
          nombreArchivo: input.nombreArchivo,
          rutaArchivo: input.rutaArchivo,
          mimeType: input.mimeType,
          tamano: input.tamano,
          version: nuevaVersion,
          esVersionActual: true,
          observaciones: input.observaciones,
        },
      });

      await logAuditoria(ctx, {
        idusuario: input.idusuario,
        entidad: "tbl_documento",
        entidadId: documento.iddocumento,
        accion: "SUBIR_DOCUMENTO",
        detalle: `Documento ${input.nombre} (${input.tipo}) subido para préstamo ${prestamo.codigo}. Versión ${nuevaVersion}`,
      });

      return documento as any;
    },
  })
);

/**
 * Mutation para eliminar (soft delete) un documento
 */
builder.mutationField("deleteDocumento", (t) =>
  t.prismaField({
    type: Documento,
    args: {
      id: t.arg.int({ required: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const documento = await ctx.prisma.tbl_documento.findFirst({
        where: { iddocumento: args.id, deletedAt: null },
      });

      if (!documento) {
        throw new Error("Documento no encontrado o eliminado");
      }

      // Validar acceso
      const tieneAcceso = await validarAccesoDocumento(
        ctx,
        args.idusuario,
        documento.tipo,
        "escribir"
      );

      if (!tieneAcceso) {
        throw new Error("No tiene permisos para eliminar este documento");
      }

      const documentoEliminado = await ctx.prisma.tbl_documento.update({
        ...(query as any),
        where: { iddocumento: args.id },
        data: { deletedAt: new Date() },
      });

      await logAuditoria(ctx, {
        idusuario: args.idusuario,
        entidad: "tbl_documento",
        entidadId: documento.iddocumento,
        accion: "ELIMINAR_DOCUMENTO",
        detalle: `Documento ${documento.nombre} eliminado del préstamo ${documento.idprestamo}`,
      });

      return documentoEliminado as any;
    },
  })
);

/**
 * Query para obtener un documento por ID
 */
builder.queryField("documento", (t) =>
  t.prismaField({
    type: Documento,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const documento = await ctx.prisma.tbl_documento.findFirst({
        ...(query as any),
        where: { iddocumento: args.id, deletedAt: null },
      });

      if (!documento) {
        return null;
      }

      // Validar acceso de lectura
      const tieneAcceso = await validarAccesoDocumento(
        ctx,
        args.idusuario,
        documento.tipo,
        "leer"
      );

      if (!tieneAcceso) {
        throw new Error("No tiene permisos para ver este documento");
      }

      return documento as any;
    },
  })
);

/**
 * Query para listar documentos de un préstamo
 */
builder.queryField("documentosPorPrestamo", (t) =>
  t.field({
    type: [Documento],
    args: {
      idprestamo: t.arg.int({ required: true }),
      tipo: t.arg({ type: GQLTipoDocumento, required: false }),
      soloVersionesActuales: t.arg.boolean({ required: false, defaultValue: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const where: Prisma.tbl_documentoWhereInput = {
        idprestamo: args.idprestamo,
        deletedAt: null,
      };

      if (args.tipo) where.tipo = args.tipo;
      if (args.soloVersionesActuales) where.esVersionActual = true;

      const documentos = await ctx.prisma.tbl_documento.findMany({
        where,
        orderBy: [{ tipo: "asc" }, { version: "desc" }],
      });

      // Filtrar por acceso (en producción, esto debería ser más eficiente)
      const documentosAccesibles = [];
      for (const doc of documentos) {
        const tieneAcceso = await validarAccesoDocumento(
          ctx,
          args.idusuario,
          doc.tipo,
          "leer"
        );
        if (tieneAcceso) {
          documentosAccesibles.push(doc);
        }
      }

      return documentosAccesibles;
    },
  })
);

/**
 * Query para obtener historial de versiones de un documento
 */
builder.queryField("historialDocumento", (t) =>
  t.field({
    type: [Documento],
    args: {
      idprestamo: t.arg.int({ required: true }),
      tipo: t.arg({ type: GQLTipoDocumento, required: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Validar acceso
      const tieneAcceso = await validarAccesoDocumento(
        ctx,
        args.idusuario,
        args.tipo,
        "leer"
      );

      if (!tieneAcceso) {
        throw new Error("No tiene permisos para ver este tipo de documento");
      }

      const documentos = await ctx.prisma.tbl_documento.findMany({
        where: {
          idprestamo: args.idprestamo,
          tipo: args.tipo,
          deletedAt: null,
        },
        orderBy: { version: "desc" },
      });

      return documentos;
    },
  })
);

