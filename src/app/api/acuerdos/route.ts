/**
 * API ROUTE: ACUERDOS
 * 
 * Endpoints:
 * - POST /api/acuerdos - Crear acuerdo
 * - GET /api/acuerdos - Listar acuerdos (con filtros)
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getRequestInfo } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { crearAcuerdo } from "@/lib/services/acuerdo-service";
import { TipoAcuerdoEnum } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const crearAcuerdoSchema = z.object({
  idprestamo: z.number().int().positive(),
  tipoAcuerdo: z.nativeEnum(TipoAcuerdoEnum),
  montoAcordado: z.number().positive(),
  numeroCuotas: z.number().int().positive(),
  fechaInicio: z.string().datetime(),
  fechaFin: z.string().datetime(),
  fechasPagoProgramadas: z.array(z.string()).optional(),
  observacion: z.string().optional().nullable(),
});

/**
 * POST /api/acuerdos
 * Crear un nuevo acuerdo de pago
 */
export async function POST(req: NextRequest) {
  try {
    const usuario = await requirePermission(req, "CREAR_ACUERDO");
    const { ip, userAgent } = getRequestInfo(req);

    const body = await req.json();
    const datos = crearAcuerdoSchema.parse(body);

    const resultado = await crearAcuerdo({
      idprestamo: datos.idprestamo,
      idusuario: usuario.idusuario,
      tipoAcuerdo: datos.tipoAcuerdo,
      montoAcordado: datos.montoAcordado,
      numeroCuotas: datos.numeroCuotas,
      fechaInicio: new Date(datos.fechaInicio),
      fechaFin: new Date(datos.fechaFin),
      fechasPagoProgramadas: datos.fechasPagoProgramadas,
      observacion: datos.observacion ?? null,
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
 * GET /api/acuerdos
 * Listar acuerdos con filtros
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "VER_CARTERA");

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const idprestamo = searchParams.get("idprestamo");
    const estado = searchParams.get("estado");
    const tipoAcuerdo = searchParams.get("tipoAcuerdo");

    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (idprestamo) {
      where.idprestamo = parseInt(idprestamo);
    }

    if (estado) {
      where.estado = estado;
    }

    if (tipoAcuerdo) {
      where.tipoAcuerdo = tipoAcuerdo;
    }

    const [acuerdos, total] = await Promise.all([
      prisma.tbl_acuerdo.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
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
          usuario: {
            select: {
              idusuario: true,
              nombre: true,
              email: true,
            },
          },
          pagos: {
            select: {
              idpago: true,
              fechaPago: true,
              montoTotal: true,
            },
            orderBy: { fechaPago: "desc" },
            take: 5,
          },
        },
      }),
      prisma.tbl_acuerdo.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        acuerdos,
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



