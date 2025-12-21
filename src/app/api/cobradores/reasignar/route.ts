/**
 * API ROUTE: REASIGNAR CARTERA
 * 
 * POST /api/cobradores/reasignar
 * Reasignar un préstamo de un cobrador a otro
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getRequestInfo } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reasignarCarteraSchema = z.object({
  idasignacion: z.number().int().positive(),
  idusuarioNuevo: z.number().int().positive(),
  motivo: z.string().optional().nullable(),
});

/**
 * POST /api/cobradores/reasignar
 * Reasignar cartera
 */
export async function POST(req: NextRequest) {
  try {
    const usuario = await requirePermission(req, "ASIGNAR_CUENTAS");
    const { ip, userAgent } = getRequestInfo(req);

    const body = await req.json();
    const datos = reasignarCarteraSchema.parse(body);

    const nuevaAsignacion = await prisma.$transaction(
      async (tx) => {
        // Obtener asignación actual
        const asignacionActual = await tx.tbl_asignacion_cartera.findUnique({
          where: { idasignacion: datos.idasignacion },
          include: {
            prestamo: true,
          },
        });

        if (!asignacionActual) {
          throw new Error("Asignación no encontrada");
        }

        // Validar nuevo cobrador
        const nuevoCobrador = await tx.tbl_usuario.findFirst({
          where: {
            idusuario: datos.idusuarioNuevo,
            activo: true,
            deletedAt: null,
          },
        });

        if (!nuevoCobrador) {
          throw new Error("Cobrador no encontrado o inactivo");
        }

        // Desactivar asignación actual
        await tx.tbl_asignacion_cartera.update({
          where: { idasignacion: datos.idasignacion },
          data: {
            activa: false,
            fechaFin: new Date(),
          },
        });

        // Desactivar otras asignaciones activas del préstamo
        await tx.tbl_asignacion_cartera.updateMany({
          where: {
            idprestamo: asignacionActual.idprestamo,
            activa: true,
            deletedAt: null,
            idasignacion: { not: datos.idasignacion },
          },
          data: {
            activa: false,
            fechaFin: new Date(),
          },
        });

        // Crear nueva asignación
        const nuevaAsignacion = await tx.tbl_asignacion_cartera.create({
          data: {
            idprestamo: asignacionActual.idprestamo,
            idusuario: datos.idusuarioNuevo,
            idusuarioAsignador: usuario.idusuario,
            motivo: datos.motivo ?? null,
            activa: true,
          },
        });

        // Registrar auditoría
        await tx.tbl_auditoria.create({
          data: {
            idusuario: usuario.idusuario,
            entidad: "tbl_asignacion_cartera",
            entidadId: nuevaAsignacion.idasignacion,
            accion: "REASIGNAR_CARTERA",
            detalle: `Préstamo ${asignacionActual.prestamo.codigo} reasignado del cobrador ${asignacionActual.idusuario} al ${datos.idusuarioNuevo}`,
            ip,
            userAgent,
          },
        });

        return nuevaAsignacion;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return NextResponse.json({
      success: true,
      data: nuevaAsignacion,
    });
  } catch (error) {
    return handleApiError(error);
  }
}



