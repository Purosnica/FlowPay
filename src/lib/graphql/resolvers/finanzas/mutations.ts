import { builder } from "../../builder";
import {
  CreateCuotaInput,
  CreateCuotaInputSchema,
  CreatePagoInput,
  CreatePagoInputSchema,
  CreatePrestamoInput,
  CreatePrestamoInputSchema,
  UpdateCuotaInput,
  UpdateCuotaInputSchema,
  UpdatePagoInput,
  UpdatePagoInputSchema,
  UpdatePrestamoInput,
  UpdatePrestamoInputSchema,
  CreateReestructuracionInput,
  CreateReestructuracionInputSchema,
  Cuota,
  Pago,
  Prestamo,
  Reestructuracion,
  CastigoCarteraResult,
} from "./types";
import { EstadoCuotaEnum, EstadoPrestamoEnum, TipoCobroEnum, Prisma } from "@prisma/client";
import {
  crearPrestamoConCuotas,
  registrarPagoConAplicacion,
} from "./transactions";
import { conLock, adquirirLock, liberarLock } from "@/lib/locks/lock-service";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { reestructurarPrestamo } from "@/lib/services/reestructuracion-service";
import {
  castigarCartera,
  estaPrestamoCastigado,
  validarPagoPrestamoCastigado,
} from "@/lib/services/castigo-service";

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

const ensureCuotaActiva = async (ctx: any, idcuota: number) => {
  const cuota = await ctx.prisma.tbl_cuota.findFirst({
    where: { idcuota, deletedAt: null },
  });
  if (!cuota) throw new Error("Cuota no encontrada o eliminada");
  return cuota;
};

const ensurePagoActivo = async (ctx: any, idpago: number) => {
  const pago = await ctx.prisma.tbl_pago.findFirst({
    where: { idpago, deletedAt: null },
  });
  if (!pago) throw new Error("Pago no encontrado o eliminado");
  return pago;
};

// ======================================================
// MUTATIONS PRÉSTAMOS
// ======================================================

/**
 * Mutation para crear préstamo (versión simple, sin cuotas)
 * Para crear préstamo con cuotas automáticas, usar createPrestamoConCuotas
 */
builder.mutationField("createPrestamo", (t) =>
  t.prismaField({
    type: Prestamo,
    args: {
      input: t.arg({ type: CreatePrestamoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const input = CreatePrestamoInputSchema.parse(args.input);

      // Validar permiso
      await requerirPermiso(input.idusuarioCreador, "CREATE_LOAN");

      const prestamo = await ctx.prisma.tbl_prestamo.create({
        ...(query as any),
        data: {
          ...input,
          estado: input.estado ?? EstadoPrestamoEnum.BORRADOR,
          fechaSolicitud: input.fechaSolicitud ?? new Date(),
        },
      });

      await logAuditoria(ctx, {
        idusuario: input.idusuarioCreador,
        entidad: "tbl_prestamo",
        entidadId: prestamo.idprestamo,
        accion: "CREAR_PRESTAMO",
        detalle: `Creación de préstamo ${prestamo.codigo}`,
      });

      return prestamo as any;
    },
  })
);

/**
 * Mutation para crear préstamo + generar cuotas automáticamente (TRANSACCIÓN)
 * 
 * Esta mutation garantiza atomicidad: si falla la creación de alguna cuota,
 * se revierte toda la operación incluyendo el préstamo.
 */
builder.mutationField("createPrestamoConCuotas", (t) =>
  t.field({
    type: Prestamo,
    args: {
      input: t.arg({ type: CreatePrestamoInput, required: true }),
      generarCuotas: t.arg.boolean({ required: false, defaultValue: true }),
      diaPago: t.arg.int({ required: false, defaultValue: 1 }),
    },
    resolve: async (_parent, args, ctx) => {
      const input = CreatePrestamoInputSchema.parse(args.input);

      // Validar permiso
      await requerirPermiso(input.idusuarioCreador, "CREATE_LOAN");

      // Validar que tiene los datos necesarios para generar cuotas
      if (args.generarCuotas && (!input.plazoMeses || input.plazoMeses <= 0)) {
        throw new Error("Para generar cuotas automáticamente, el préstamo debe tener un plazo en meses válido");
      }

      if (args.generarCuotas && !input.tasaInteresAnual) {
        throw new Error("Para generar cuotas automáticamente, el préstamo debe tener una tasa de interés anual");
      }

      // Ejecutar en transacción
      const resultado = await ctx.prisma.$transaction(async (tx) => {
        const { prestamo, cuotas } = await crearPrestamoConCuotas(
          tx,
          {
            idcliente: input.idcliente,
            idusuarioCreador: input.idusuarioCreador,
            tipoprestamo: input.tipoprestamo,
            codigo: input.codigo,
            referencia: input.referencia,
            montoSolicitado: Number(input.montoSolicitado),
            montoAprobado: input.montoAprobado ? Number(input.montoAprobado) : null,
            montoDesembolsado: input.montoDesembolsado ? Number(input.montoDesembolsado) : null,
            tasaInteresAnual: input.tasaInteresAnual ? Number(input.tasaInteresAnual) : 0,
            plazoMeses: input.plazoMeses || 0,
            fechaSolicitud: input.fechaSolicitud,
            fechaAprobacion: input.fechaAprobacion,
            fechaDesembolso: input.fechaDesembolso,
            fechaVencimiento: input.fechaVencimiento,
            observaciones: input.observaciones,
            idusuarioGestor: (input as any).idusuarioGestor,
          },
          {
            generarCuotas: args.generarCuotas ?? undefined,
            diaPago: args.diaPago || 1,
          }
        );

        return prestamo as any;
      });

      // Retornar con los campos necesarios para GraphQL
      return (await ctx.prisma.tbl_prestamo.findUniqueOrThrow({
        where: { idprestamo: resultado.idprestamo },
      })) as any;
    },
  })
);

builder.mutationField("updatePrestamo", (t) =>
  t.prismaField({
    type: Prestamo,
    args: {
      input: t.arg({ type: UpdatePrestamoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idprestamo, ...dataInput } = UpdatePrestamoInputSchema.parse(args.input);
      const current = await ensurePrestamoActivo(ctx, idprestamo);

      const prestamo = await ctx.prisma.tbl_prestamo.update({
        ...(query as any),
        where: { idprestamo },
        data: {
          ...dataInput,
          estado: dataInput.estado ?? current.estado,
        },
      });

      await logAuditoria(ctx, {
        idusuario: dataInput.idusuarioMod ?? current.idusuarioMod ?? current.idusuarioCreador ?? null,
        entidad: "tbl_prestamo",
        entidadId: prestamo.idprestamo,
        accion: "ACTUALIZAR_PRESTAMO",
        detalle: `Actualización de préstamo ${prestamo.codigo}`,
      });

      return prestamo as any;
    },
  })
);

builder.mutationField("deletePrestamo", (t) =>
  t.prismaField({
    type: Prestamo,
    args: {
      id: t.arg.int({ required: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const current = await ensurePrestamoActivo(ctx, args.id);

      // Validar permiso
      await requerirPermiso(
        args.idusuario ?? current.idusuarioMod ?? current.idusuarioCreador,
        "DELETE_LOAN"
      );

      const prestamo = await ctx.prisma.tbl_prestamo.update({
        ...(query as any),
        where: { idprestamo: args.id },
        data: { deletedAt: new Date() },
      });

      await logAuditoria(ctx, {
        idusuario: args.idusuario ?? current.idusuarioMod ?? current.idusuarioCreador ?? null,
        entidad: "tbl_prestamo",
        entidadId: prestamo.idprestamo,
        accion: "ELIMINAR_PRESTAMO_SOFT",
        detalle: `Soft delete de préstamo ${prestamo.codigo}`,
      });

      return prestamo as any;
    },
  })
);

// ======================================================
// MUTATIONS CUOTAS
// ======================================================

builder.mutationField("createCuota", (t) =>
  t.prismaField({
    type: Cuota,
    args: {
      input: t.arg({ type: CreateCuotaInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const input = CreateCuotaInputSchema.parse(args.input);
      const prestamo = await ensurePrestamoActivo(ctx, input.idprestamo);

      const cuota = await ctx.prisma.tbl_cuota.create({
        ...(query as any),
        data: {
          ...input,
          estado: input.estado ?? EstadoCuotaEnum.PENDIENTE,
          moraProgramada: input.moraProgramada ?? 0,
          capitalPagado: input.capitalPagado ?? 0,
          interesPagado: input.interesPagado ?? 0,
          moraPagada: input.moraPagada ?? 0,
          diasMoraAcumulados: input.diasMoraAcumulados ?? 0,
        },
      });

      await logAuditoria(ctx, {
        idusuario: prestamo.idusuarioMod ?? prestamo.idusuarioCreador ?? null,
        entidad: "tbl_cuota",
        entidadId: cuota.idcuota,
        accion: "CREAR_CUOTA",
        detalle: `Creación de cuota ${cuota.numero} para préstamo ${prestamo.codigo}`,
      });

      return cuota as any;
    },
  })
);

builder.mutationField("updateCuota", (t) =>
  t.prismaField({
    type: Cuota,
    args: {
      input: t.arg({ type: UpdateCuotaInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idcuota, ...dataInput } = UpdateCuotaInputSchema.parse(args.input);
      const current = await ensureCuotaActiva(ctx, idcuota);

      const cuota = await ctx.prisma.tbl_cuota.update({
        ...(query as any),
        where: { idcuota },
        data: {
          ...dataInput,
          estado: dataInput.estado ?? current.estado,
        },
      });

      await logAuditoria(ctx, {
        entidad: "tbl_cuota",
        entidadId: cuota.idcuota,
        accion: "ACTUALIZAR_CUOTA",
        detalle: `Actualización de cuota ${cuota.numero} del préstamo ${cuota.idprestamo}`,
      });

      return cuota as any;
    },
  })
);

builder.mutationField("deleteCuota", (t) =>
  t.prismaField({
    type: Cuota,
    args: {
      id: t.arg.int({ required: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const current = await ensureCuotaActiva(ctx, args.id);

      const cuota = await ctx.prisma.tbl_cuota.update({
        ...(query as any),
        where: { idcuota: args.id },
        data: { deletedAt: new Date() },
      });

      await logAuditoria(ctx, {
        idusuario: args.idusuario ?? null,
        entidad: "tbl_cuota",
        entidadId: cuota.idcuota,
        accion: "ELIMINAR_CUOTA_SOFT",
        detalle: `Soft delete de cuota ${current.numero} del préstamo ${current.idprestamo}`,
      });

      return cuota as any;
    },
  })
);

// ======================================================
// MUTATIONS PAGOS
// ======================================================

/**
 * Mutation para registrar pago (versión simple, sin aplicar a cuotas) + LOCK
 * Para registrar pago y aplicar automáticamente a cuotas, usar registrarPagoConAplicacion
 * 
 * Esta mutation adquiere un lock sobre el préstamo para evitar doble registro simultáneo
 */
builder.mutationField("createPago", (t) =>
  t.prismaField({
    type: Pago,
    args: {
      input: t.arg({ type: CreatePagoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const input = CreatePagoInputSchema.parse(args.input);
      const prestamo = await ensurePrestamoActivo(ctx, input.idprestamo);
      let cuota = null;
      if (input.idcuota) cuota = await ensureCuotaActiva(ctx, input.idcuota);

      // Validar permiso
      await requerirPermiso(input.idusuario, "APPLY_PAYMENT");

      // Ejecutar con lock sobre el préstamo
      return await conLock(
        "PRESTAMO",
        input.idprestamo,
        async () => {
          const montoTotalCalc =
            (input.montoCapital ?? 0) + (input.montoInteres ?? 0) + (input.montoMora ?? 0);
          const montoTotal = input.montoTotal ?? montoTotalCalc;

          const pago = await ctx.prisma.tbl_pago.create({
            ...(query as any),
            data: {
              idprestamo: input.idprestamo,
              idcuota: input.idcuota ?? null,
              idacuerdo: input.idacuerdo ?? null,
              idusuario: input.idusuario ?? null,
              metodoPago: input.metodoPago,
              tipoCobro: input.tipoCobro ?? TipoCobroEnum.PARCIAL,
              montoCapital: input.montoCapital ?? 0,
              montoInteres: input.montoInteres ?? 0,
              montoMora: input.montoMora ?? 0,
              montoTotal,
              fechaPago: input.fechaPago ?? new Date(),
              referencia: input.referencia ?? null,
              observacion: input.observacion ?? null,
              notas: input.notas ?? null,
            },
          });

          await logAuditoria(ctx, {
            idusuario: input.idusuario ?? null,
            entidad: "tbl_pago",
            entidadId: pago.idpago,
            accion: "CREAR_PAGO",
            detalle: `Registro de pago ${pago.idpago} para préstamo ${prestamo.codigo}${
              cuota ? `, cuota ${cuota.numero}` : ""
            }`,
          });

          return pago as any;
        },
        {
          idusuario: input.idusuario || null,
          descripcion: `Registro de pago para préstamo ${prestamo.codigo}`,
          timeoutSegundos: 300, // 5 minutos
        }
      );
    },
  })
);

/**
 * Mutation para registrar pago + aplicar automáticamente a cuotas (TRANSACCIÓN + LOCK)
 * 
 * Esta mutation garantiza atomicidad y control de concurrencia:
 * - Adquiere lock sobre el préstamo antes de procesar
 * - Registra el pago
 * - Aplica capital, interés y mora a las cuotas en orden
 * - Actualiza estados de cuotas
 * - Actualiza estado del préstamo si corresponde
 * - Libera el lock automáticamente
 * - Todo se revierte si algo falla
 */
builder.mutationField("registrarPagoConAplicacion", (t) =>
  t.field({
    type: Pago,
    args: {
      input: t.arg({ type: CreatePagoInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      const input = CreatePagoInputSchema.parse(args.input);
      const prestamo = await ensurePrestamoActivo(ctx, input.idprestamo);

      // Validar que tiene montos
      const montoCapital = input.montoCapital ?? 0;
      const montoInteres = input.montoInteres ?? 0;
      const montoMora = input.montoMora ?? 0;

      if (montoCapital <= 0 && montoInteres <= 0 && montoMora <= 0) {
        throw new Error("El pago debe tener al menos un monto mayor a cero (capital, interés o mora)");
      }

      // Validar permiso
      await requerirPermiso(input.idusuario, "APPLY_PAYMENT");

      // Verificar si el préstamo está castigado
      const prestamoParaPago = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo: input.idprestamo, deletedAt: null },
        select: { estado: true },
      });

      if (!prestamoParaPago) {
        throw new Error("Préstamo no encontrado");
      }

      const estaCastigado = prestamoParaPago.estado === EstadoPrestamoEnum.CASTIGADO;
      
      // Validar que solo se permiten pagos judiciales para préstamos castigados
      if (estaCastigado) {
        validarPagoPrestamoCastigado(input.metodoPago, true);
      }

      // Ejecutar con lock sobre el préstamo
      const resultado = await conLock(
        "PRESTAMO",
        input.idprestamo,
        async () => {
          // Ejecutar en transacción
          return await ctx.prisma.$transaction(async (tx) => {
            const { pago, cuotasActualizadas, prestamoActualizado } = await registrarPagoConAplicacion(
              tx,
              {
                idprestamo: input.idprestamo,
                idcuota: input.idcuota,
                idacuerdo: input.idacuerdo,
                montoCapital,
                montoInteres,
                montoMora,
                metodoPago: input.metodoPago,
                tipoCobro: input.tipoCobro,
                fechaPago: input.fechaPago,
                referencia: input.referencia,
                observacion: input.observacion,
                observaciones: input.notas,
                idusuario: input.idusuario,
              }
            );

            return pago as any;
          });
        },
        {
          idusuario: input.idusuario || null,
          descripcion: `Registro de pago con aplicación para préstamo ${prestamo.codigo}`,
          timeoutSegundos: 300, // 5 minutos
        }
      );

      // Retornar con los campos necesarios para GraphQL
      return (await ctx.prisma.tbl_pago.findUniqueOrThrow({
        where: { idpago: resultado.idpago },
      })) as any;
    },
  })
);

builder.mutationField("updatePago", (t) =>
  t.prismaField({
    type: Pago,
    args: {
      input: t.arg({ type: UpdatePagoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idpago, ...dataInput } = UpdatePagoInputSchema.parse(args.input);
      const current = await ensurePagoActivo(ctx, idpago);

      // Validar permiso
      await requerirPermiso(dataInput.idusuario ?? current.idusuario, "EDIT_PAYMENT");

      const montoCapital = dataInput.montoCapital ?? Number(current.montoCapital);
      const montoInteres = dataInput.montoInteres ?? Number(current.montoInteres);
      const montoMora = dataInput.montoMora ?? Number(current.montoMora);
      const montoTotal =
        dataInput.montoTotal ?? montoCapital + montoInteres + montoMora;

      const pago = await ctx.prisma.tbl_pago.update({
        ...(query as any),
        where: { idpago },
        data: {
          ...dataInput,
          montoCapital,
          montoInteres,
          montoMora,
          montoTotal,
        },
      });

      await logAuditoria(ctx, {
        idusuario: dataInput.idusuario ?? current.idusuario ?? null,
        entidad: "tbl_pago",
        entidadId: pago.idpago,
        accion: "ACTUALIZAR_PAGO",
        detalle: `Actualización de pago ${pago.idpago} del préstamo ${pago.idprestamo}`,
      });

      return pago as any;
    },
  })
);

builder.mutationField("deletePago", (t) =>
  t.prismaField({
    type: Pago,
    args: {
      id: t.arg.int({ required: true }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const current = await ensurePagoActivo(ctx, args.id);

      // Validar permiso
      await requerirPermiso(args.idusuario ?? current.idusuario, "DELETE_PAYMENT");

      const pago = await ctx.prisma.tbl_pago.update({
        ...(query as any),
        where: { idpago: args.id },
        data: { deletedAt: new Date() },
      });

      await logAuditoria(ctx, {
        idusuario: args.idusuario ?? current.idusuario ?? null,
        entidad: "tbl_pago",
        entidadId: pago.idpago,
        accion: "ELIMINAR_PAGO_SOFT",
        detalle: `Soft delete de pago ${pago.idpago} del préstamo ${pago.idprestamo}`,
      });

      return pago as any;
    },
  })
);

// ======================================================
// MUTATION ASIGNAR GESTOR
// ======================================================

/**
 * Mutation para asignar gestor a préstamo + LOCK
 * 
 * Adquiere lock sobre el préstamo para evitar conflictos al asignar gestor
 */
builder.mutationField("asignarGestor", (t) =>
  t.prismaField({
    type: Prestamo,
    args: {
      idprestamo: t.arg.int({ required: true }),
      idusuarioGestor: t.arg.int({ required: false }),
      idusuarioMod: t.arg.int({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const current = await ensurePrestamoActivo(ctx, args.idprestamo);

      // Validar permiso
      await requerirPermiso(
        args.idusuarioMod ?? current.idusuarioMod ?? current.idusuarioCreador,
        "ASSIGN_MANAGER"
      );

      // Ejecutar con lock sobre el préstamo
      return await conLock(
        "PRESTAMO",
        args.idprestamo,
        async () => {
          const prestamo = await ctx.prisma.tbl_prestamo.update({
            ...(query as any),
            where: { idprestamo: args.idprestamo },
            data: {
              idusuarioGestor: args.idusuarioGestor ?? null,
              idusuarioMod: args.idusuarioMod ?? current.idusuarioMod ?? current.idusuarioCreador ?? null,
            },
          });

          await logAuditoria(ctx, {
            idusuario: args.idusuarioMod ?? current.idusuarioMod ?? current.idusuarioCreador ?? null,
            entidad: "tbl_prestamo",
            entidadId: prestamo.idprestamo,
            accion: "ASIGNAR_GESTOR",
            detalle: `Asignación de gestor ${args.idusuarioGestor || "ninguno"} al préstamo ${prestamo.codigo}`,
          });

          return prestamo as any;
        },
        {
          idusuario: args.idusuarioMod ?? current.idusuarioMod ?? current.idusuarioCreador ?? null,
          descripcion: `Asignación de gestor al préstamo ${current.codigo}`,
          timeoutSegundos: 300, // 5 minutos
        }
      );
    },
  })
);

// ======================================================
// MUTATION REESTRUCTURACIÓN
// ======================================================

builder.mutationField("reestructurarPrestamo", (t) =>
  t.field({
    type: Reestructuracion,
    args: {
      input: t.arg({ type: CreateReestructuracionInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      const input = CreateReestructuracionInputSchema.parse(args.input);

      // 1. Validar préstamo original
      const prestamoOriginal = await ensurePrestamoActivo(ctx, input.idprestamoOriginal);

      // Validar que el préstamo puede ser reestructurado
      if (
        prestamoOriginal.estado !== EstadoPrestamoEnum.EN_CURSO &&
        prestamoOriginal.estado !== EstadoPrestamoEnum.EN_MORA
      ) {
        throw new Error(
          `El préstamo debe estar en estado EN_CURSO o EN_MORA para ser reestructurado. Estado actual: ${prestamoOriginal.estado}`
        );
      }

      // Validar que el préstamo no tenga una reestructuración previa como nuevo préstamo
      const reestructuracionExistente = await ctx.prisma.tbl_reestructuracion.findFirst({
        where: {
          idprestamoNuevo: prestamoOriginal.idprestamo,
          deletedAt: null,
        },
      });

      if (reestructuracionExistente) {
        throw new Error("Este préstamo ya fue creado como resultado de una reestructuración");
      }

      // Validar permiso
      await requerirPermiso(
        input.idusuarioSolicitante || prestamoOriginal.idusuarioCreador,
        "RESTRUCTURE_LOAN"
      );

      // 2. Adquirir lock sobre el préstamo original
      const lockResult = await adquirirLock(
        "PRESTAMO",
        input.idprestamoOriginal,
        {
          idusuario: input.idusuarioSolicitante || prestamoOriginal.idusuarioCreador || null,
          descripcion: `Reestructuración de préstamo ${prestamoOriginal.codigo}`,
          timeoutSegundos: 600, // 10 minutos para reestructuración
        }
      );

      if (!lockResult.adquirido) {
        throw new Error(lockResult.mensaje || "No se pudo adquirir el lock para reestructurar el préstamo");
      }

      const idlock = lockResult.idlock!;

      try {
        // 3. Ejecutar reestructuración completa usando el servicio
        const resultado = await ctx.prisma.$transaction(async (tx) => {
          return await reestructurarPrestamo(tx, {
            idprestamoOriginal: input.idprestamoOriginal,
            idusuarioSolicitante: input.idusuarioSolicitante || prestamoOriginal.idusuarioCreador,
            idusuarioAutorizador: input.idusuarioAutorizador,
            motivo: input.motivo,
            observaciones: input.observaciones,
            evidencia: input.evidencia,
            nuevoPrestamo: {
              codigo: input.nuevoPrestamo.codigo,
              referencia: input.nuevoPrestamo.referencia,
              tipoprestamo: input.nuevoPrestamo.tipoprestamo,
              montoSolicitado: Number(input.nuevoPrestamo.montoSolicitado),
              montoAprobado: input.nuevoPrestamo.montoAprobado
                ? Number(input.nuevoPrestamo.montoAprobado)
                : null,
              montoDesembolsado: input.nuevoPrestamo.montoDesembolsado
                ? Number(input.nuevoPrestamo.montoDesembolsado)
                : null,
              tasaInteresAnual: input.nuevoPrestamo.tasaInteresAnual
                ? Number(input.nuevoPrestamo.tasaInteresAnual)
                : Number(prestamoOriginal.tasaInteresAnual),
              plazoMeses: input.nuevoPrestamo.plazoMeses || prestamoOriginal.plazoMeses || 12,
              fechaSolicitud: input.nuevoPrestamo.fechaSolicitud || new Date(),
              fechaAprobacion: input.nuevoPrestamo.fechaAprobacion,
              fechaDesembolso: input.nuevoPrestamo.fechaDesembolso,
              fechaVencimiento: input.nuevoPrestamo.fechaVencimiento,
              observaciones: input.nuevoPrestamo.observaciones,
              diaPago: input.diaPago || 1,
            },
          });
        });

        return resultado.reestructuracion;
      } finally {
        // Siempre liberar el lock, incluso si hay error
        await liberarLock(idlock, input.idusuarioSolicitante || prestamoOriginal.idusuarioCreador || null).catch((error) => {
          console.error("Error al liberar lock en reestructuración:", error);
          // No lanzar error aquí para no ocultar el error original
        });
      }
    },
  })
);

/**
 * Mutation para castigar cartera (TRANSACCIÓN)
 * 
 * Marca préstamos en mora como castigados y cancela cuotas pendientes.
 * Esta mutation garantiza atomicidad: si falla el castigo de algún préstamo,
 * se revierte todo.
 */
builder.mutationField("castigarCartera", (t) =>
  t.field({
    type: CastigoCarteraResult,
    args: {
      idprestamos: t.arg.intList({ required: true }),
      fechaCastigo: t.arg({ type: "DateTime", required: false }),
      motivo: t.arg.string({ required: true }),
      observaciones: t.arg.string({ required: false }),
      idusuario: t.arg.int({ required: true }), // Requerido para permisos
    },
    resolve: async (_parent, args, ctx) => {
      if (!args.idprestamos || args.idprestamos.length === 0) {
        throw new Error("Debe especificar al menos un préstamo para castigar");
      }

      // Validar permiso
      await requerirPermiso(args.idusuario || null, "CASTIGAR_CARTERA");

      // Ejecutar en transacción usando el servicio
      const resultado = await ctx.prisma.$transaction(async (tx) => {
        const resultadoServicio = await castigarCartera(tx, {
          idprestamos: args.idprestamos!,
          motivo: args.motivo,
          observaciones: args.observaciones || null,
          idusuario: args.idusuario || null,
          fechaCastigo: args.fechaCastigo || null,
        });

        return {
          prestamosCastigados: resultadoServicio.prestamosCastigados,
          cuotasCanceladas: resultadoServicio.cuotasCanceladas,
        };
      });

      return resultado;
    },
  })
);




