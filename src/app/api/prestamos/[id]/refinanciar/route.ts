/**
 * API ROUTE: REFINANCIAR PRÉSTAMO
 * 
 * POST /api/prestamos/[id]/refinanciar
 * Refinancia un préstamo creando uno nuevo
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getRequestInfo } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { refinanciarPrestamo } from "@/lib/services/refinanciamiento-service";
import { TipoPrestamoEnum } from "@prisma/client";
import { z } from "zod";

const refinanciarSchema = z.object({
  motivo: z.string().min(1),
  observaciones: z.string().optional().nullable(),
  evidencia: z.string().optional().nullable(),
  idusuarioAutorizador: z.number().int().positive(),
  nuevoPrestamo: z.object({
    codigo: z.string().min(1),
    referencia: z.string().optional().nullable(),
    tipoprestamo: z.nativeEnum(TipoPrestamoEnum),
    montoSolicitado: z.number().positive(),
    montoAprobado: z.number().positive().optional().nullable(),
    montoDesembolsado: z.number().positive().optional().nullable(),
    tasaInteresAnual: z.number().nonnegative(),
    plazoMeses: z.number().int().positive(),
    fechaSolicitud: z.string().datetime().optional().nullable(),
    fechaAprobacion: z.string().datetime().optional().nullable(),
    fechaDesembolso: z.string().datetime().optional().nullable(),
    fechaVencimiento: z.string().datetime().optional().nullable(),
    observaciones: z.string().optional().nullable(),
    diaPago: z.number().int().min(1).max(31).default(1),
  }),
});

/**
 * POST /api/prestamos/[id]/refinanciar
 * Refinanciar un préstamo
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuarioSolicitante = await requirePermission(
      req,
      "RESTRUCTURE_LOAN"
    );
    const { ip, userAgent } = getRequestInfo(req);
    const { id } = await params;
    const idprestamoOriginal = parseInt(id);

    const body = await req.json();
    const datos = refinanciarSchema.parse(body);

    // Validar que el usuario autorizador tenga permisos
    await requirePermission(req, "RESTRUCTURE_LOAN");

    // Refinanciar usando el servicio seguro
    const resultado = await refinanciarPrestamo({
      idprestamoOriginal,
      idusuarioSolicitante: usuarioSolicitante.idusuario,
      idusuarioAutorizador: datos.idusuarioAutorizador,
      motivo: datos.motivo,
      observaciones: datos.observaciones ?? null,
      evidencia: datos.evidencia ?? null,
      nuevoPrestamo: {
        codigo: datos.nuevoPrestamo.codigo,
        referencia: datos.nuevoPrestamo.referencia ?? null,
        tipoprestamo: datos.nuevoPrestamo.tipoprestamo,
        montoSolicitado: datos.nuevoPrestamo.montoSolicitado,
        montoAprobado: datos.nuevoPrestamo.montoAprobado ?? null,
        montoDesembolsado: datos.nuevoPrestamo.montoDesembolsado ?? null,
        tasaInteresAnual: datos.nuevoPrestamo.tasaInteresAnual,
        plazoMeses: datos.nuevoPrestamo.plazoMeses,
        fechaSolicitud: datos.nuevoPrestamo.fechaSolicitud
          ? new Date(datos.nuevoPrestamo.fechaSolicitud)
          : null,
        fechaAprobacion: datos.nuevoPrestamo.fechaAprobacion
          ? new Date(datos.nuevoPrestamo.fechaAprobacion)
          : null,
        fechaDesembolso: datos.nuevoPrestamo.fechaDesembolso
          ? new Date(datos.nuevoPrestamo.fechaDesembolso)
          : null,
        fechaVencimiento: datos.nuevoPrestamo.fechaVencimiento
          ? new Date(datos.nuevoPrestamo.fechaVencimiento)
          : null,
        observaciones: datos.nuevoPrestamo.observaciones ?? null,
        diaPago: datos.nuevoPrestamo.diaPago,
      },
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    return handleApiError(error);
  }
}



