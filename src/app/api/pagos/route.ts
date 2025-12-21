/**
 * API ROUTE: PAGOS
 * 
 * Endpoints:
 * - POST /api/pagos - Registrar pago
 * - GET /api/pagos - Listar pagos (con filtros)
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getRequestInfo } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { registrarPago } from "@/lib/services/pago-service";
import { MetodoPagoEnum, TipoCobroEnum } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registrarPagoSchema = z.object({
  idprestamo: z.number().int().positive(),
  idcuota: z.number().int().positive().optional().nullable(),
  idacuerdo: z.number().int().positive().optional().nullable(),
  montoCapital: z.number().nonnegative(),
  montoInteres: z.number().nonnegative(),
  montoMora: z.number().nonnegative(),
  metodoPago: z.nativeEnum(MetodoPagoEnum),
  tipoCobro: z.nativeEnum(TipoCobroEnum).optional(),
  fechaPago: z.string().datetime().optional(),
  referencia: z.string().optional().nullable(),
  observacion: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  updatedAtPrestamo: z.string().datetime().optional(), // Para optimistic locking
});

/**
 * POST /api/pagos
 * Registrar un nuevo pago
 */
export async function POST(req: NextRequest) {
  try {
    const usuario = await requirePermission(req, "APPLY_PAYMENT");
    const { ip, userAgent } = getRequestInfo(req);

    const body = await req.json();
    const datos = registrarPagoSchema.parse(body);

    // Obtener updatedAt del préstamo para optimistic locking
    const prestamo = await prisma.tbl_prestamo.findUnique({
      where: { idprestamo: datos.idprestamo },
      select: { updatedAt: true },
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

    // Registrar pago usando el servicio seguro
    const resultado = await registrarPago({
      idprestamo: datos.idprestamo,
      idcuota: datos.idcuota ?? null,
      idacuerdo: datos.idacuerdo ?? null,
      idusuario: usuario.idusuario,
      montoCapital: datos.montoCapital,
      montoInteres: datos.montoInteres,
      montoMora: datos.montoMora,
      metodoPago: datos.metodoPago,
      tipoCobro: datos.tipoCobro,
      fechaPago: datos.fechaPago ? new Date(datos.fechaPago) : undefined,
      referencia: datos.referencia ?? null,
      observacion: datos.observacion ?? null,
      notas: datos.notas ?? null,
      updatedAtPrestamo: datos.updatedAtPrestamo
        ? new Date(datos.updatedAtPrestamo)
        : prestamo.updatedAt,
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

/**
 * GET /api/pagos
 * Listar pagos con filtros
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "VIEW_PAYMENT");

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const idprestamo = searchParams.get("idprestamo");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const metodoPago = searchParams.get("metodoPago");

    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (idprestamo) {
      where.idprestamo = parseInt(idprestamo);
    }

    if (fechaDesde || fechaHasta) {
      where.fechaPago = {};
      if (fechaDesde) {
        where.fechaPago.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        where.fechaPago.lte = new Date(fechaHasta);
      }
    }

    if (metodoPago) {
      where.metodoPago = metodoPago;
    }

    const [pagos, total] = await Promise.all([
      prisma.tbl_pago.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { fechaPago: "desc" },
        include: {
          prestamo: {
            select: {
              idprestamo: true,
              codigo: true,
              cliente: {
                select: {
                  idcliente: true,
                  primer_nombres: true,
                  primer_apellido: true,
                },
              },
            },
          },
          cuota: {
            select: {
              idcuota: true,
              numero: true,
            },
          },
          acuerdo: {
            select: {
              idacuerdo: true,
              tipoAcuerdo: true,
            },
          },
          usuario: {
            select: {
              idusuario: true,
              nombre: true,
              email: true,
            },
          },
        },
      }),
      prisma.tbl_pago.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        pagos,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}



