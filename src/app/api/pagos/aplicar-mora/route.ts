/**
 * API ROUTE: APLICAR MORA
 * 
 * POST /api/pagos/aplicar-mora
 * Aplica mora automáticamente a las cuotas vencidas de un préstamo
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getRequestInfo } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { aplicarMora } from "@/lib/services/mora-service";
import { z } from "zod";

const aplicarMoraSchema = z.object({
  idprestamo: z.number().int().positive(),
  configuracion: z
    .object({
      tasaMoraDiaria: z.number().nonnegative().optional(),
      diasGracia: z.number().int().nonnegative().optional(),
      montoMinimoMora: z.number().nonnegative().optional(),
    })
    .optional(),
  fechaCalculo: z.string().datetime().optional(),
});

/**
 * POST /api/pagos/aplicar-mora
 * Aplicar mora a un préstamo
 */
export async function POST(req: NextRequest) {
  try {
    const usuario = await requirePermission(req, "APPLY_PAYMENT");
    const { ip, userAgent } = getRequestInfo(req);

    const body = await req.json();
    const datos = aplicarMoraSchema.parse(body);

    const resultado = await aplicarMora({
      idprestamo: datos.idprestamo,
      configuracion: datos.configuracion,
      fechaCalculo: datos.fechaCalculo
        ? new Date(datos.fechaCalculo)
        : undefined,
      idusuario: usuario.idusuario,
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



