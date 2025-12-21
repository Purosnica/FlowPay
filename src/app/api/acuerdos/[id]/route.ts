/**
 * API ROUTE: ACUERDO INDIVIDUAL
 * 
 * Endpoints:
 * - GET /api/acuerdos/[id] - Obtener acuerdo
 * - PUT /api/acuerdos/[id] - Actualizar acuerdo
 * - DELETE /api/acuerdos/[id] - Cancelar acuerdo
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, getRequestInfo } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { EstadoAcuerdoEnum } from "@prisma/client";
import { z } from "zod";

const actualizarAcuerdoSchema = z.object({
  estado: z.nativeEnum(EstadoAcuerdoEnum).optional(),
  montoAcordado: z.number().positive().optional(),
  fechaFin: z.string().datetime().optional(),
  observacion: z.string().optional().nullable(),
});

/**
 * GET /api/acuerdos/[id]
 * Obtener un acuerdo por ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(req, "VER_CARTERA");
    const { id } = await params;
    const idacuerdo = parseInt(id);

    const acuerdo = await prisma.tbl_acuerdo.findFirst({
      where: { idacuerdo, deletedAt: null },
      include: {
        prestamo: {
          include: {
            cliente: true,
          },
        },
        usuario: {
          select: {
            idusuario: true,
            nombre: true,
            email: true,
          },
        },
        pagos: {
          orderBy: { fechaPago: "desc" },
          include: {
            usuario: {
              select: {
                idusuario: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    if (!acuerdo) {
      return NextResponse.json(
        {
          success: false,
          error: "Acuerdo no encontrado",
          code: "ACUERDO_NO_ENCONTRADO",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: acuerdo,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/acuerdos/[id]
 * Actualizar un acuerdo
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await requirePermission(req, "EDITAR_ACUERDO");
    const { ip, userAgent } = getRequestInfo(req);
    const { id } = await params;
    const idacuerdo = parseInt(id);

    const body = await req.json();
    const datos = actualizarAcuerdoSchema.parse(body);

    const acuerdoActualizado = await prisma.$transaction(
      async (tx) => {
        const acuerdo = await tx.tbl_acuerdo.findFirst({
          where: { idacuerdo, deletedAt: null },
        });

        if (!acuerdo) {
          throw new Error("Acuerdo no encontrado");
        }

        const updateData: any = {};

        if (datos.estado !== undefined) {
          updateData.estado = datos.estado;
        }
        if (datos.montoAcordado !== undefined) {
          updateData.montoAcordado = datos.montoAcordado;
        }
        if (datos.fechaFin !== undefined) {
          updateData.fechaFin = new Date(datos.fechaFin);
        }
        if (datos.observacion !== undefined) {
          updateData.observacion = datos.observacion;
        }

        const acuerdoActualizado = await tx.tbl_acuerdo.update({
          where: { idacuerdo },
          data: updateData,
        });

        // Registrar auditoría
        await tx.tbl_auditoria.create({
          data: {
            idusuario: usuario.idusuario,
            entidad: "tbl_acuerdo",
            entidadId: idacuerdo,
            accion: "ACTUALIZAR_ACUERDO",
            detalle: `Acuerdo ${idacuerdo} actualizado`,
            ip,
            userAgent,
          },
        });

        return acuerdoActualizado;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return NextResponse.json({
      success: true,
      data: acuerdoActualizado,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/acuerdos/[id]
 * Cancelar un acuerdo (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await requirePermission(req, "ELIMINAR_ACUERDO");
    const { ip, userAgent } = getRequestInfo(req);
    const { id } = await params;
    const idacuerdo = parseInt(id);

    const acuerdoCancelado = await prisma.$transaction(
      async (tx) => {
        const acuerdo = await tx.tbl_acuerdo.findFirst({
          where: { idacuerdo, deletedAt: null },
        });

        if (!acuerdo) {
          throw new Error("Acuerdo no encontrado");
        }

        // Soft delete
        const acuerdoCancelado = await tx.tbl_acuerdo.update({
          where: { idacuerdo },
          data: {
            estado: EstadoAcuerdoEnum.INCUMPLIDO,
            deletedAt: new Date(),
          },
        });

        // Registrar auditoría
        await tx.tbl_auditoria.create({
          data: {
            idusuario: usuario.idusuario,
            entidad: "tbl_acuerdo",
            entidadId: idacuerdo,
            accion: "CANCELAR_ACUERDO",
            detalle: `Acuerdo ${idacuerdo} cancelado`,
            ip,
            userAgent,
          },
        });

        return acuerdoCancelado;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return NextResponse.json({
      success: true,
      data: acuerdoCancelado,
    });
  } catch (error) {
    return handleApiError(error);
  }
}



