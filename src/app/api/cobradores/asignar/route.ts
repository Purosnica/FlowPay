/**
 * API ROUTE: ASIGNAR COBRADORES
 * 
 * POST /api/cobradores/asignar
 * Asignar un préstamo a un cobrador
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getRequestInfo } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const asignarCarteraSchema = z.object({
  idprestamo: z.number().int().positive(),
  idusuario: z.number().int().positive(),
  motivo: z.string().optional().nullable(),
});

/**
 * POST /api/cobradores/asignar
 * Asignar un préstamo a un cobrador
 */
export async function POST(req: NextRequest) {
  try {
    const usuario = await requirePermission(req, "ASIGNAR_CUENTAS");
    const { ip, userAgent } = getRequestInfo(req);

    const body = await req.json();
    const datos = asignarCarteraSchema.parse(body);

    // Validar que el préstamo existe
    const prestamo = await prisma.tbl_prestamo.findFirst({
      where: { idprestamo: datos.idprestamo, deletedAt: null },
    });

    if (!prestamo) {
      return NextResponse.json(
        {
          success: false,
          error: "Préstamo no encontrado",
          code: "PRESTAMO_NO_ENCONTRADO",
        },
        { status: 404 }
      );
    }

    // Validar que el usuario es un cobrador
    const cobrador = await prisma.tbl_usuario.findFirst({
      where: {
        idusuario: datos.idusuario,
        activo: true,
        deletedAt: null,
      },
      include: {
        rol: true,
      },
    });

    if (!cobrador) {
      return NextResponse.json(
        {
          success: false,
          error: "Cobrador no encontrado o inactivo",
          code: "COBRADOR_NO_ENCONTRADO",
        },
        { status: 404 }
      );
    }

    // Asignar en transacción
    const asignacion = await prisma.$transaction(
      async (tx) => {
        // Desactivar asignaciones anteriores del préstamo
        await tx.tbl_asignacion_cartera.updateMany({
          where: {
            idprestamo: datos.idprestamo,
            activa: true,
            deletedAt: null,
          },
          data: {
            activa: false,
            fechaFin: new Date(),
          },
        });

        // Crear nueva asignación
        const nuevaAsignacion = await tx.tbl_asignacion_cartera.create({
          data: {
            idprestamo: datos.idprestamo,
            idusuario: datos.idusuario,
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
            accion: "ASIGNAR_CARTERA",
            detalle: `Préstamo ${prestamo.codigo} asignado al cobrador ${cobrador.nombre}`,
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
      data: asignacion,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

