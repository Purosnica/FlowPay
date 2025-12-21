import { builder } from "../../builder";
import {
  CreateAcuerdoInput,
  CreateAcuerdoInputSchema,
  UpdateAcuerdoInput,
  UpdateAcuerdoInputSchema,
  CreateGestionCobroInput,
  CreateGestionCobroInputSchema,
  UpdateGestionCobroInput,
  UpdateGestionCobroInputSchema,
  CreateAsignacionCarteraInput,
  CreateAsignacionCarteraInputSchema,
  Acuerdo,
  GestionCobro,
  AsignacionCartera,
} from "./types";
import { EstadoAcuerdoEnum, CanalCobranzaEnum, EstadoGestionCobroEnum, Prisma } from "@prisma/client";
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

const ensurePrestamoActivo = async (ctx: any, idprestamo: number) => {
  const prestamo = await ctx.prisma.tbl_prestamo.findFirst({
    where: { idprestamo, deletedAt: null },
  });
  if (!prestamo) throw new Error("Préstamo no encontrado o eliminado");
  return prestamo;
};

const ensureAcuerdoActivo = async (ctx: any, idacuerdo: number) => {
  const acuerdo = await ctx.prisma.tbl_acuerdo.findFirst({
    where: { idacuerdo, deletedAt: null },
  });
  if (!acuerdo) throw new Error("Acuerdo no encontrado o eliminado");
  return acuerdo;
};

// ======================================================
// MUTATIONS ACUERDOS
// ======================================================

builder.mutationField("createAcuerdo", (t) =>
  t.prismaField({
    type: Acuerdo,
    args: {
      input: t.arg({ type: CreateAcuerdoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const input = CreateAcuerdoInputSchema.parse(args.input);
      const prestamo = await ensurePrestamoActivo(ctx, input.idprestamo);

      // Validar permiso
      await requerirPermiso(input.idusuario, "CREAR_ACUERDO");

      // Convertir fechas de pago programadas a JSON string
      const fechasPagoProgramadas = input.fechasPagoProgramadas
        ? JSON.stringify(input.fechasPagoProgramadas)
        : null;

      const acuerdo = await ctx.prisma.tbl_acuerdo.create({
        ...(query as any),
        data: {
          idprestamo: input.idprestamo,
          idusuario: input.idusuario ?? null,
          tipoAcuerdo: input.tipoAcuerdo,
          estado: EstadoAcuerdoEnum.ACTIVO,
          montoAcordado: input.montoAcordado,
          numeroCuotas: input.numeroCuotas ?? 1,
          fechasPagoProgramadas,
          fechaInicio: input.fechaInicio ?? new Date(),
          fechaFin: input.fechaFin,
          observacion: input.observacion ?? null,
        },
      });

      await logAuditoria(ctx, {
        idusuario: input.idusuario ?? null,
        entidad: "tbl_acuerdo",
        entidadId: acuerdo.idacuerdo,
        accion: "CREAR_ACUERDO",
        detalle: `Creación de acuerdo ${acuerdo.tipoAcuerdo} para préstamo ${prestamo.codigo}`,
      });

      return acuerdo as any;
    },
  })
);

builder.mutationField("updateAcuerdo", (t) =>
  t.prismaField({
    type: Acuerdo,
    args: {
      input: t.arg({ type: UpdateAcuerdoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idacuerdo, ...dataInput } = UpdateAcuerdoInputSchema.parse(args.input);
      const current = await ensureAcuerdoActivo(ctx, idacuerdo);

      // Validar permiso
      await requerirPermiso(dataInput.idusuario ?? current.idusuario, "EDITAR_ACUERDO");

      const updateData: any = { ...dataInput };
      if (dataInput.fechasPagoProgramadas) {
        updateData.fechasPagoProgramadas = JSON.stringify(dataInput.fechasPagoProgramadas);
      }

      const acuerdo = await ctx.prisma.tbl_acuerdo.update({
        ...(query as any),
        where: { idacuerdo },
        data: updateData,
      });

      await logAuditoria(ctx, {
        idusuario: dataInput.idusuario ?? current.idusuario ?? null,
        entidad: "tbl_acuerdo",
        entidadId: acuerdo.idacuerdo,
        accion: "ACTUALIZAR_ACUERDO",
        detalle: `Actualización de acuerdo ${acuerdo.idacuerdo}`,
      });

      return acuerdo as any;
    },
  })
);

builder.mutationField("deleteAcuerdo", (t) =>
  t.prismaField({
    type: Acuerdo,
    args: {
      id: t.arg.int({ required: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const current = await ensureAcuerdoActivo(ctx, args.id);

      // Validar permiso
      await requerirPermiso(args.idusuario ?? current.idusuario, "ELIMINAR_ACUERDO");

      const acuerdo = await ctx.prisma.tbl_acuerdo.update({
        ...(query as any),
        where: { idacuerdo: args.id },
        data: { deletedAt: new Date() },
      });

      await logAuditoria(ctx, {
        idusuario: args.idusuario ?? current.idusuario ?? null,
        entidad: "tbl_acuerdo",
        entidadId: acuerdo.idacuerdo,
        accion: "ELIMINAR_ACUERDO_SOFT",
        detalle: `Soft delete de acuerdo ${acuerdo.idacuerdo}`,
      });

      return acuerdo as any;
    },
  })
);

// ======================================================
// MUTATIONS GESTIONES DE COBRANZA
// ======================================================

builder.mutationField("createGestionCobro", (t) =>
  t.prismaField({
    type: GestionCobro,
    args: {
      input: t.arg({ type: CreateGestionCobroInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const input = CreateGestionCobroInputSchema.parse(args.input);
      const prestamo = await ensurePrestamoActivo(ctx, input.idprestamo);

      // Validar permiso
      await requerirPermiso(input.idusuario, "REGISTRAR_GESTIONES");

      const gestion = await ctx.prisma.tbl_gestion_cobro.create({
        ...(query as any),
        data: {
          idprestamo: input.idprestamo,
          idcuota: input.idcuota ?? null,
          idusuario: input.idusuario ?? null,
          idresultado: input.idresultado ?? null,
          tipoGestion: input.tipoGestion,
          canal: input.canal as CanalCobranzaEnum,
          estado: EstadoGestionCobroEnum.PENDIENTE,
          fechaGestion: input.fechaGestion ?? new Date(),
          proximaAccion: input.proximaAccion ?? null,
          duracionLlamada: input.duracionLlamada ?? null,
          resumen: input.resumen ?? null,
          notas: input.notas ?? null,
          evidenciaArchivo: input.evidenciaArchivo ?? null,
        },
      });

      await logAuditoria(ctx, {
        idusuario: input.idusuario ?? null,
        entidad: "tbl_gestion_cobro",
        entidadId: gestion.idgestion,
        accion: "CREAR_GESTION_COBRO",
        detalle: `Creación de gestión ${gestion.tipoGestion} para préstamo ${prestamo.codigo}`,
      });

      return gestion as any;
    },
  })
);

builder.mutationField("updateGestionCobro", (t) =>
  t.prismaField({
    type: GestionCobro,
    args: {
      input: t.arg({ type: UpdateGestionCobroInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idgestion, ...dataInput } = UpdateGestionCobroInputSchema.parse(args.input);
      
      const current = await ctx.prisma.tbl_gestion_cobro.findUniqueOrThrow({
        where: { idgestion },
      });

      // Validar permiso
      await requerirPermiso(dataInput.idusuario ?? current.idusuario, "EDITAR_GESTIONES");

      const updateData: any = { ...dataInput };
      if (dataInput.canal) {
        updateData.canal = dataInput.canal as CanalCobranzaEnum;
      }
      if (dataInput.estado) {
        updateData.estado = dataInput.estado as EstadoGestionCobroEnum;
      }

      const gestion = await ctx.prisma.tbl_gestion_cobro.update({
        ...(query as any),
        where: { idgestion },
        data: updateData,
      });

      await logAuditoria(ctx, {
        idusuario: dataInput.idusuario ?? current.idusuario ?? null,
        entidad: "tbl_gestion_cobro",
        entidadId: gestion.idgestion,
        accion: "ACTUALIZAR_GESTION_COBRO",
        detalle: `Actualización de gestión ${gestion.idgestion}`,
      });

      return gestion as any;
    },
  })
);

// Nota: Las gestiones NO son editables después de creadas (auditoría)
// Solo se permite actualizar el estado y próxima acción

// ======================================================
// MUTATIONS ASIGNACIONES DE CARTERA
// ======================================================

builder.mutationField("asignarCartera", (t) =>
  t.prismaField({
    type: AsignacionCartera,
    args: {
      input: t.arg({ type: CreateAsignacionCarteraInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const input = CreateAsignacionCarteraInputSchema.parse(args.input);
      const prestamo = await ensurePrestamoActivo(ctx, input.idprestamo);

      // Validar permiso
      await requerirPermiso(input.idusuarioAsignador, "ASIGNAR_CUENTAS");

      // Desactivar asignaciones anteriores del préstamo
      await ctx.prisma.tbl_asignacion_cartera.updateMany({
        where: {
          idprestamo: input.idprestamo,
          activa: true,
          deletedAt: null,
        },
        data: {
          activa: false,
          fechaFin: new Date(),
        },
      });

      // Crear nueva asignación
      const asignacion = await ctx.prisma.tbl_asignacion_cartera.create({
        ...(query as any),
        data: {
          idprestamo: input.idprestamo,
          idusuario: input.idusuario,
          idusuarioAsignador: input.idusuarioAsignador ?? null,
          motivo: input.motivo ?? null,
          activa: true,
        },
      });

      await logAuditoria(ctx, {
        idusuario: input.idusuarioAsignador ?? null,
        entidad: "tbl_asignacion_cartera",
        entidadId: asignacion.idasignacion,
        accion: "ASIGNAR_CARTERA",
        detalle: `Asignación de préstamo ${prestamo.codigo} al cobrador ${input.idusuario}`,
      });

      return asignacion as any;
    },
  })
);

builder.mutationField("reasignarCartera", (t) =>
  t.prismaField({
    type: AsignacionCartera,
    args: {
      idasignacion: t.arg.int({ required: true }),
      idusuarioNuevo: t.arg.int({ required: true }),
      idusuarioAsignador: t.arg.int({ required: false }),
      motivo: t.arg.string({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const asignacionActual = await ctx.prisma.tbl_asignacion_cartera.findUniqueOrThrow({
        where: { idasignacion: args.idasignacion },
      });

      // Validar permiso
      await requerirPermiso(args.idusuarioAsignador, "ASIGNAR_CUENTAS");

      // Desactivar asignación actual
      await ctx.prisma.tbl_asignacion_cartera.update({
        where: { idasignacion: args.idasignacion },
        data: {
          activa: false,
          fechaFin: new Date(),
        },
      });

      // Crear nueva asignación
      const nuevaAsignacion = await ctx.prisma.tbl_asignacion_cartera.create({
        ...(query as any),
        data: {
          idprestamo: asignacionActual.idprestamo,
          idusuario: args.idusuarioNuevo,
          idusuarioAsignador: args.idusuarioAsignador ?? null,
          motivo: args.motivo ?? null,
          activa: true,
        },
      });

      await logAuditoria(ctx, {
        idusuario: args.idusuarioAsignador ?? null,
        entidad: "tbl_asignacion_cartera",
        entidadId: nuevaAsignacion.idasignacion,
        accion: "REASIGNAR_CARTERA",
        detalle: `Reasignación de préstamo ${asignacionActual.idprestamo} del cobrador ${asignacionActual.idusuario} al ${args.idusuarioNuevo}`,
      });

      return nuevaAsignacion as any;
    },
  })
);

builder.mutationField("desasignarCartera", (t) =>
  t.prismaField({
    type: AsignacionCartera,
    args: {
      idasignacion: t.arg.int({ required: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const asignacion = await ctx.prisma.tbl_asignacion_cartera.findUniqueOrThrow({
        where: { idasignacion: args.idasignacion },
      });

      // Validar permiso
      await requerirPermiso(args.idusuario, "ASIGNAR_CUENTAS");

      const asignacionActualizada = await ctx.prisma.tbl_asignacion_cartera.update({
        ...(query as any),
        where: { idasignacion: args.idasignacion },
        data: {
          activa: false,
          fechaFin: new Date(),
        },
      });

      await logAuditoria(ctx, {
        idusuario: args.idusuario ?? null,
        entidad: "tbl_asignacion_cartera",
        entidadId: asignacion.idasignacion,
        accion: "DESASIGNAR_CARTERA",
        detalle: `Desasignación de préstamo ${asignacion.idprestamo}`,
      });

      return asignacionActualizada as any;
    },
  })
);



