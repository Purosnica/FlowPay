/**
 * EJEMPLO DE INTEGRACIÓN DE SERVICIOS SEGUROS
 * 
 * Este archivo muestra cómo integrar los servicios seguros con:
 * - GraphQL Mutations
 * - API Routes (Next.js)
 * - Middleware de autenticación
 */

// ======================================================
// EJEMPLO 1: Integración con GraphQL Mutation
// ======================================================

/*
import { builder } from "../../graphql/builder";
import { registrarPago } from "./pago-service";
import { MetodoPagoEnum, TipoCobroEnum } from "@prisma/client";

builder.mutationField("registrarPagoSeguro", (t) =>
  t.field({
    type: "Pago",
    args: {
      idprestamo: t.arg.int({ required: true }),
      idcuota: t.arg.int({ required: false }),
      idacuerdo: t.arg.int({ required: false }),
      montoCapital: t.arg.float({ required: true }),
      montoInteres: t.arg.float({ required: true }),
      montoMora: t.arg.float({ required: true }),
      metodoPago: t.arg({ type: "MetodoPagoEnum", required: true }),
      tipoCobro: t.arg({ type: "TipoCobroEnum", required: false }),
      fechaPago: t.arg({ type: "DateTime", required: false }),
      referencia: t.arg.string({ required: false }),
      observacion: t.arg.string({ required: false }),
      updatedAtPrestamo: t.arg({ type: "DateTime", required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Obtener usuario del contexto (debe estar autenticado)
      const idusuario = ctx.user?.idusuario || null;
      
      if (!idusuario) {
        throw new Error("Usuario no autenticado");
      }

      // Obtener información de la request para auditoría
      const ip = ctx.req?.ip || ctx.req?.headers?.["x-forwarded-for"] || null;
      const userAgent = ctx.req?.headers?.["user-agent"] || null;

      try {
        const resultado = await registrarPago({
          idprestamo: args.idprestamo,
          idcuota: args.idcuota ?? null,
          idacuerdo: args.idacuerdo ?? null,
          idusuario,
          montoCapital: args.montoCapital,
          montoInteres: args.montoInteres,
          montoMora: args.montoMora,
          metodoPago: args.metodoPago as MetodoPagoEnum,
          tipoCobro: (args.tipoCobro as TipoCobroEnum) ?? undefined,
          fechaPago: args.fechaPago ?? undefined,
          referencia: args.referencia ?? null,
          observacion: args.observacion ?? null,
          updatedAtPrestamo: args.updatedAtPrestamo ?? undefined,
          ip,
          userAgent,
        });

        // Retornar el pago creado
        return ctx.prisma.tbl_pago.findUniqueOrThrow({
          where: { idpago: resultado.pago.idpago },
        });
      } catch (error: any) {
        // Los errores del servicio ya tienen mensajes claros
        throw new Error(error.message || "Error al registrar el pago");
      }
    },
  })
);
*/

// ======================================================
// EJEMPLO 2: Integración con API Route (Next.js)
// ======================================================

/*
import { NextRequest, NextResponse } from "next/server";
import { registrarPago } from "@/lib/services/pago-service";
import { getCurrentUser } from "@/lib/auth"; // Tu función de autenticación

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticar usuario
    const usuario = await getCurrentUser(req);
    if (!usuario) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // 2. Parsear datos del body
    const datos = await req.json();

    // 3. Obtener información de la request
    const ip =
      req.ip ||
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // 4. Obtener updatedAt del préstamo para optimistic locking
    const prestamo = await prisma.tbl_prestamo.findUnique({
      where: { idprestamo: datos.idprestamo },
      select: { updatedAt: true },
    });

    if (!prestamo) {
      return NextResponse.json(
        { error: "Préstamo no encontrado" },
        { status: 404 }
      );
    }

    // 5. Registrar pago usando el servicio seguro
    const resultado = await registrarPago({
      ...datos,
      idusuario: usuario.idusuario,
      updatedAtPrestamo: prestamo.updatedAt,
      ip,
      userAgent,
    });

    // 6. Retornar resultado
    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error: any) {
    console.error("Error al registrar pago:", error);

    // Manejar errores específicos
    if (error.message?.includes("excede el saldo")) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "MONTO_EXCEDE_SALDO",
        },
        { status: 400 }
      );
    }

    if (error.message?.includes("modificado por otro usuario")) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "CONCURRENCIA_ERROR",
        },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al registrar el pago",
      },
      { status: 500 }
    );
  }
}
*/

// ======================================================
// EJEMPLO 3: Uso en un hook personalizado
// ======================================================

/*
"use client";

import { useMutation } from "@tanstack/react-query";
import { registrarPago } from "@/lib/services/pago-service";
import { notificationToast } from "@/lib/notifications/notification-toast";

export function useRegistrarPago() {
  return useMutation({
    mutationFn: async (datos: DatosRegistroPago) => {
      // Obtener updatedAt del préstamo antes de registrar
      const response = await fetch(`/api/prestamos/${datos.idprestamo}`);
      const data = await response.json();
      const prestamo = data.prestamo;

      return await registrarPago({
        ...datos,
        updatedAtPrestamo: prestamo.updatedAt,
      });
    },
    onSuccess: (resultado) => {
      notificationToast.success(
        `Pago registrado exitosamente. Nuevo saldo: ${resultado.saldoNuevo.total.toFixed(2)}`
      );
    },
    onError: (error: any) => {
      if (error.message?.includes("modificado por otro usuario")) {
        notificationToast.error(
          "El préstamo fue modificado. Por favor, recarga la página e intenta nuevamente."
        );
      } else {
        notificationToast.error(error.message || "Error al registrar el pago");
      }
    },
  });
}
*/

// ======================================================
// EJEMPLO 4: Procesamiento en lote con manejo de errores
// ======================================================

/*
import { aplicarMora } from "./mora-service";

export async function aplicarMoraALote(
  idprestamos: number[],
  configuracion: ConfiguracionMora
): Promise<{
  exitosos: number;
  fallidos: Array<{ idprestamo: number; error: string }>;
}> {
  const resultados = {
    exitosos: 0,
    fallidos: [] as Array<{ idprestamo: number; error: string }>,
  };

  for (const idprestamo of idprestamos) {
    try {
      await aplicarMora({
        idprestamo,
        configuracion,
        idusuario: null, // Sistema
      });
      resultados.exitosos++;
    } catch (error: any) {
      resultados.fallidos.push({
        idprestamo,
        error: error.message || "Error desconocido",
      });
    }
  }

  return resultados;
}
*/

// ======================================================
// EJEMPLO 5: Validación previa antes de operación crítica
// ======================================================

/*
import { prisma } from "@/lib/prisma";
import { registrarPago } from "./pago-service";

export async function validarYRegistrarPago(
  datos: DatosRegistroPago
): Promise<ResultadoRegistroPago> {
  // Validación previa (opcional, el servicio también valida)
  const prestamo = await prisma.tbl_prestamo.findFirst({
    where: { idprestamo: datos.idprestamo, deletedAt: null },
    include: {
      cuotas: {
        where: { deletedAt: null },
      },
    },
  });

  if (!prestamo) {
    throw new Error("Préstamo no encontrado");
  }

  // Calcular saldo pendiente
  const saldoPendiente = prestamo.cuotas.reduce(
    (sum, c) =>
      sum +
      Number(c.capitalProgramado) -
      Number(c.capitalPagado) +
      Number(c.interesProgramado) -
      Number(c.interesPagado) +
      Number(c.moraProgramada) -
      Number(c.moraPagada),
    0
  );

  const montoTotal =
    datos.montoCapital + datos.montoInteres + datos.montoMora;

  if (montoTotal > saldoPendiente) {
    throw new Error(
      `El monto del pago excede el saldo pendiente. Saldo: ${saldoPendiente.toFixed(2)}, Pago: ${montoTotal.toFixed(2)}`
    );
  }

  // Registrar pago (el servicio hará validaciones adicionales)
  return await registrarPago({
    ...datos,
    updatedAtPrestamo: prestamo.updatedAt,
  });
}
*/

