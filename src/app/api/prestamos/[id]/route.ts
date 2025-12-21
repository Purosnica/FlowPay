/**
 * API ROUTE: PRÉSTAMO INDIVIDUAL
 * 
 * Endpoints:
 * - GET /api/prestamos/[id] - Obtener préstamo
 * - PUT /api/prestamos/[id] - Modificar préstamo
 * - DELETE /api/prestamos/[id] - Cancelar préstamo
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, getRequestInfo } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { EstadoPrestamoEnum } from "@prisma/client";
import { z } from "zod";

const actualizarPrestamoSchema = z.object({
  montoAprobado: z.number().positive().optional(),
  montoDesembolsado: z.number().positive().optional(),
  tasaInteresAnual: z.number().nonnegative().optional(),
  plazoMeses: z.number().int().positive().optional(),
  fechaAprobacion: z.string().datetime().optional().nullable(),
  fechaDesembolso: z.string().datetime().optional().nullable(),
  fechaVencimiento: z.string().datetime().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  idusuarioGestor: z.number().int().positive().optional().nullable(),
  estado: z.nativeEnum(EstadoPrestamoEnum).optional(),
});

/**
 * GET /api/prestamos/[id]
 * Obtener un préstamo por ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(req, "VIEW_LOAN");
    const { id } = await params;
    const idprestamo = parseInt(id);

    const prestamo = await prisma.tbl_prestamo.findFirst({
      where: { idprestamo, deletedAt: null },
      include: {
        cliente: true,
        usuarioCreador: {
          select: {
            idusuario: true,
            nombre: true,
            email: true,
          },
        },
        usuarioGestor: {
          select: {
            idusuario: true,
            nombre: true,
            email: true,
          },
        },
        cuotas: {
          where: { deletedAt: null },
          orderBy: { numero: "asc" },
        },
        asignaciones: {
          where: { activa: true, deletedAt: null },
          include: {
            usuario: {
              select: {
                idusuario: true,
                nombre: true,
                email: true,
              },
            },
          },
        },
      },
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

    return NextResponse.json({
      success: true,
      data: prestamo,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/prestamos/[id]
 * Modificar un préstamo
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await requirePermission(req, "EDIT_LOAN");
    const { ip, userAgent } = getRequestInfo(req);
    const { id } = await params;
    const idprestamo = parseInt(id);

    const body = await req.json();
    const datos = actualizarPrestamoSchema.parse(body);

    // Obtener préstamo actual para optimistic locking
    const prestamoActual = await prisma.tbl_prestamo.findFirst({
      where: { idprestamo, deletedAt: null },
    });

    if (!prestamoActual) {
      return NextResponse.json(
        {
          success: false,
          error: "Préstamo no encontrado",
          code: "PRESTAMO_NO_ENCONTRADO",
        },
        { status: 404 }
      );
    }

    // Validar estado
    if (
      prestamoActual.estado === EstadoPrestamoEnum.PAGADO ||
      prestamoActual.estado === EstadoPrestamoEnum.CASTIGADO ||
      prestamoActual.estado === EstadoPrestamoEnum.CANCELADO
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede modificar un préstamo con estado ${prestamoActual.estado}`,
          code: "ESTADO_INVALIDO",
        },
        { status: 400 }
      );
    }

    // Actualizar en transacción
    const prestamoActualizado = await prisma.$transaction(
      async (tx) => {
        const updateData: any = {};

        if (datos.montoAprobado !== undefined) {
          updateData.montoAprobado = datos.montoAprobado;
        }
        if (datos.montoDesembolsado !== undefined) {
          updateData.montoDesembolsado = datos.montoDesembolsado;
        }
        if (datos.tasaInteresAnual !== undefined) {
          updateData.tasaInteresAnual = datos.tasaInteresAnual;
        }
        if (datos.plazoMeses !== undefined) {
          updateData.plazoMeses = datos.plazoMeses;
        }
        if (datos.fechaAprobacion !== undefined) {
          updateData.fechaAprobacion = datos.fechaAprobacion
            ? new Date(datos.fechaAprobacion)
            : null;
        }
        if (datos.fechaDesembolso !== undefined) {
          updateData.fechaDesembolso = datos.fechaDesembolso
            ? new Date(datos.fechaDesembolso)
            : null;
        }
        if (datos.fechaVencimiento !== undefined) {
          updateData.fechaVencimiento = datos.fechaVencimiento
            ? new Date(datos.fechaVencimiento)
            : null;
        }
        if (datos.observaciones !== undefined) {
          updateData.observaciones = datos.observaciones;
        }
        if (datos.idusuarioGestor !== undefined) {
          updateData.idusuarioGestor = datos.idusuarioGestor;
        }
        if (datos.estado !== undefined) {
          updateData.estado = datos.estado;
        }

        updateData.idusuarioMod = usuario.idusuario;

        const prestamo = await tx.tbl_prestamo.update({
          where: { idprestamo },
          data: updateData,
        });

        // Registrar auditoría
        await tx.tbl_auditoria.create({
          data: {
            idusuario: usuario.idusuario,
            entidad: "tbl_prestamo",
            entidadId: idprestamo,
            accion: "MODIFICAR_PRESTAMO",
            detalle: `Préstamo ${prestamo.codigo} modificado`,
            ip,
            userAgent,
          },
        });

        return prestamo;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return NextResponse.json({
      success: true,
      data: prestamoActualizado,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/prestamos/[id]
 * Cancelar un préstamo (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await requirePermission(req, "DELETE_LOAN");
    const { ip, userAgent } = getRequestInfo(req);
    const { id } = await params;
    const idprestamo = parseInt(id);

    const prestamoActualizado = await prisma.$transaction(
      async (tx) => {
        const prestamo = await tx.tbl_prestamo.findFirst({
          where: { idprestamo, deletedAt: null },
        });

        if (!prestamo) {
          throw new Error("Préstamo no encontrado");
        }

        // Validar que se pueda cancelar
        if (
          prestamo.estado === EstadoPrestamoEnum.PAGADO ||
          prestamo.estado === EstadoPrestamoEnum.CASTIGADO
        ) {
          throw new Error(
            `No se puede cancelar un préstamo con estado ${prestamo.estado}`
          );
        }

        // Soft delete
        const prestamoCancelado = await tx.tbl_prestamo.update({
          where: { idprestamo },
          data: {
            estado: EstadoPrestamoEnum.CANCELADO,
            deletedAt: new Date(),
          },
        });

        // Registrar auditoría
        await tx.tbl_auditoria.create({
          data: {
            idusuario: usuario.idusuario,
            entidad: "tbl_prestamo",
            entidadId: idprestamo,
            accion: "CANCELAR_PRESTAMO",
            detalle: `Préstamo ${prestamo.codigo} cancelado`,
            ip,
            userAgent,
          },
        });

        return prestamoCancelado;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return NextResponse.json({
      success: true,
      data: prestamoActualizado,
    });
  } catch (error) {
    return handleApiError(error);
  }
}



