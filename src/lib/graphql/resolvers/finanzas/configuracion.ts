/**
 * RESOLVERS PARA CONFIGURACIÓN DEL SISTEMA
 * 
 * Este módulo gestiona los parámetros de configuración del sistema.
 * Solo usuarios con rol ADMINISTRADOR pueden modificar la configuración.
 * 
 * PARÁMETROS GESTIONADOS:
 * - Tasa de mora (anual y diaria)
 * - Días de gracia
 * - Horarios permitidos de cobranza
 * - Límites de reestructuración
 */

import { builder } from "../../builder";
import {
  ConfiguracionSistema,
  UpdateConfiguracionInput,
  UpdateConfiguracionInputSchema,
  BulkUpdateConfiguracionInput,
  BulkUpdateConfiguracionInputSchema,
} from "./types";
import { Prisma } from "@prisma/client";
import { requerirPermiso } from "@/lib/permissions/permission-service";

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
 * Valida que el usuario tenga rol ADMINISTRADOR
 * 
 * TODO: En producción, esto debe venir del contexto de autenticación
 */
async function validarRolAdmin(ctx: any, idusuario?: number | null): Promise<boolean> {
  // Validar permiso CONFIG_SYSTEM
  try {
    await requerirPermiso(idusuario, "CONFIG_SYSTEM");
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene el valor de una configuración por clave
 */
async function obtenerValorConfiguracion(
  ctx: any,
  clave: string,
  valorPorDefecto?: string
): Promise<string> {
  const config = await ctx.prisma.tbl_configuracion_sistema.findFirst({
    where: { clave, deletedAt: null },
  });

  return config?.valor || valorPorDefecto || "";
}

/**
 * Obtiene todas las configuraciones del sistema
 */
builder.queryField("configuracionesSistema", (t) =>
  t.field({
    type: [ConfiguracionSistema],
    args: {
      categoria: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      const where: Prisma.tbl_configuracion_sistemaWhereInput = {
        deletedAt: null,
      };

      if (args.categoria) {
        where.categoria = args.categoria;
      }

      return ctx.prisma.tbl_configuracion_sistema.findMany({
        where,
        orderBy: [{ categoria: "asc" }, { clave: "asc" }],
      });
    },
  })
);

/**
 * Obtiene una configuración específica por clave
 */
builder.queryField("configuracionSistema", (t) =>
  t.prismaField({
    type: ConfiguracionSistema,
    nullable: true,
    args: {
      clave: t.arg.string({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return (await ctx.prisma.tbl_configuracion_sistema.findFirst({
        ...(query as any),
        where: { clave: args.clave, deletedAt: null },
      })) as any;
    },
  })
);

/**
 * Actualiza una configuración (solo ADMIN)
 */
builder.mutationField("updateConfiguracionSistema", (t) =>
  t.prismaField({
    type: ConfiguracionSistema,
    args: {
      input: t.arg({ type: UpdateConfiguracionInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const input = UpdateConfiguracionInputSchema.parse(args.input);

      // Validar rol ADMIN
      const esAdmin = await validarRolAdmin(ctx, input.idusuarioMod);
      if (!esAdmin) {
        throw new Error("Solo usuarios con rol ADMINISTRADOR pueden modificar la configuración");
      }

      // Buscar configuración existente
      const configExistente = await ctx.prisma.tbl_configuracion_sistema.findFirst({
        where: { clave: input.clave, deletedAt: null },
      });

      if (configExistente) {
        // Actualizar existente
        const config = await ctx.prisma.tbl_configuracion_sistema.update({
          ...(query as any),
          where: { idconfiguracion: configExistente.idconfiguracion },
          data: {
            valor: input.valor,
            idusuarioMod: input.idusuarioMod,
          },
        });

        await logAuditoria(ctx, {
          idusuario: input.idusuarioMod,
          entidad: "tbl_configuracion_sistema",
          entidadId: config.idconfiguracion,
          accion: "ACTUALIZAR_CONFIGURACION",
          detalle: `Configuración ${input.clave} actualizada. Nuevo valor: ${input.valor}`,
        });

        return config as any;
      } else {
        // Crear nueva (upsert)
        const config = await ctx.prisma.tbl_configuracion_sistema.create({
          ...(query as any),
          data: {
            clave: input.clave,
            valor: input.valor,
            tipo: "texto", // Por defecto, se puede inferir del valor
            idusuarioMod: input.idusuarioMod,
          },
        });

        await logAuditoria(ctx, {
          idusuario: input.idusuarioMod,
          entidad: "tbl_configuracion_sistema",
          entidadId: config.idconfiguracion,
          accion: "CREAR_CONFIGURACION",
          detalle: `Configuración ${input.clave} creada. Valor: ${input.valor}`,
        });

        return config as any;
      }
    },
  })
);

/**
 * Actualiza múltiples configuraciones a la vez (solo ADMIN)
 */
builder.mutationField("bulkUpdateConfiguracionSistema", (t) =>
  t.field({
    type: [ConfiguracionSistema],
    args: {
      input: t.arg({ type: BulkUpdateConfiguracionInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      const input = BulkUpdateConfiguracionInputSchema.parse(args.input);

      // Validar rol ADMIN
      const esAdmin = await validarRolAdmin(ctx, input.idusuarioMod);
      if (!esAdmin) {
        throw new Error("Solo usuarios con rol ADMINISTRADOR pueden modificar la configuración");
      }

      // Actualizar en transacción
      const resultados = await ctx.prisma.$transaction(
        input.configuraciones.map((config) =>
          ctx.prisma.tbl_configuracion_sistema.upsert({
            where: { clave: config.clave },
            update: {
              valor: config.valor,
              idusuarioMod: input.idusuarioMod,
            },
            create: {
              clave: config.clave,
              valor: config.valor,
              tipo: "texto",
              idusuarioMod: input.idusuarioMod,
            },
          })
        )
      );

      await logAuditoria(ctx, {
        idusuario: input.idusuarioMod,
        entidad: "tbl_configuracion_sistema",
        accion: "BULK_UPDATE_CONFIGURACION",
        detalle: `${input.configuraciones.length} configuraciones actualizadas`,
      });

      return resultados;
    },
  })
);

/**
 * Inicializa configuraciones por defecto si no existen
 * 
 * NOTA: Se recomienda usar el script de seed: npx tsx prisma/seed-configuracion.ts
 */
export async function inicializarConfiguracionesPorDefecto(ctx: any) {
  const configuracionesPorDefecto = [
    {
      clave: "TASA_MORA",
      valor: "0.36",
      tipo: "decimal",
      descripcion: "Tasa de mora anual (ej: 0.36 = 36%)",
      categoria: "mora",
    },
    {
      clave: "DIAS_GRACIA",
      valor: "0",
      tipo: "numero",
      descripcion: "Días de gracia antes de aplicar mora",
      categoria: "mora",
    },
    {
      clave: "HORARIO_COBRANZA_INICIO",
      valor: "08:00",
      tipo: "texto",
      descripcion: "Hora de inicio permitida para cobranza (formato HH:mm)",
      categoria: "cobranza",
    },
    {
      clave: "HORARIO_COBRANZA_FIN",
      valor: "18:00",
      tipo: "texto",
      descripcion: "Hora de fin permitida para cobranza (formato HH:mm)",
      categoria: "cobranza",
    },
    {
      clave: "DIAS_COBRANZA_PERMITIDOS",
      valor: "1,2,3,4,5",
      tipo: "texto",
      descripcion: "Días de la semana permitidos para cobranza (1=Lunes, 7=Domingo)",
      categoria: "cobranza",
    },
    {
      clave: "MAXIMO_REESTRUCTURACIONES",
      valor: "2",
      tipo: "numero",
      descripcion: "Número máximo de reestructuraciones permitidas por préstamo",
      categoria: "reestructuracion",
    },
    {
      clave: "LIMITE_REESTRUCTURACION_DIAS_MORA",
      valor: "90",
      tipo: "numero",
      descripcion: "Días máximos de mora para permitir reestructuración",
      categoria: "reestructuracion",
    },
    {
      clave: "LIMITE_REESTRUCTURACION_MONTO",
      valor: "100000",
      tipo: "numero",
      descripcion: "Monto máximo para permitir reestructuración",
      categoria: "reestructuracion",
    },
    {
      clave: "LIMITE_MONTO_PRESTAMO",
      valor: "1000000",
      tipo: "decimal",
      descripcion: "Límite máximo de monto para préstamos",
      categoria: "prestamos",
    },
    {
      clave: "METODOS_PAGO_HABILITADOS",
      valor: "EFECTIVO,TRANSFERENCIA,TARJETA,CHEQUE",
      tipo: "texto",
      descripcion: "Métodos de pago habilitados (separados por comas)",
      categoria: "pagos",
    },
    {
      clave: "DIAS_MORA_CASTIGADO",
      valor: "90",
      tipo: "numero",
      descripcion: "Días de mora para considerar préstamo como castigado",
      categoria: "mora",
    },
  ];

  for (const config of configuracionesPorDefecto) {
    const existe = await ctx.prisma.tbl_configuracion_sistema.findFirst({
      where: { clave: config.clave, deletedAt: null },
    });

    if (!existe) {
      await ctx.prisma.tbl_configuracion_sistema.create({
        data: config,
      });
    }
  }
}

