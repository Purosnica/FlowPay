/**
 * API ROUTE: PRÉSTAMOS
 * 
 * Endpoints:
 * - POST /api/prestamos - Crear préstamo
 * - GET /api/prestamos - Listar préstamos (con filtros)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, getRequestInfo } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { crearPrestamoConCuotas } from "@/lib/graphql/resolvers/finanzas/transactions";
import { EstadoPrestamoEnum, TipoPrestamoEnum } from "@prisma/client";
import { z } from "zod";

const crearPrestamoSchema = z.object({
  idcliente: z.number().int().positive(),
  tipoprestamo: z.nativeEnum(TipoPrestamoEnum),
  codigo: z.string().min(1),
  referencia: z.string().optional().nullable(),
  montoSolicitado: z.number().positive(),
  montoAprobado: z.number().positive().optional().nullable(),
  montoDesembolsado: z.number().positive().optional().nullable(),
  tasaInteresAnual: z.number().nonnegative(),
  plazoMeses: z.number().int().positive(),
  fechaSolicitud: z.string().datetime().optional(),
  fechaAprobacion: z.string().datetime().optional().nullable(),
  fechaDesembolso: z.string().datetime().optional().nullable(),
  fechaVencimiento: z.string().datetime().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  idusuarioGestor: z.number().int().positive().optional().nullable(),
  generarCuotas: z.boolean().default(true),
  diaPago: z.number().int().min(1).max(31).default(1),
});

/**
 * POST /api/prestamos
 * Crear un nuevo préstamo con cuotas
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticar y validar permisos
    const usuario = await requirePermission(req, "CREATE_LOAN");
    const { ip, userAgent } = getRequestInfo(req);

    // 2. Parsear y validar datos
    const body = await req.json();
    const datos = crearPrestamoSchema.parse(body);

    // 3. Verificar que el código no exista
    const prestamoExistente = await prisma.tbl_prestamo.findUnique({
      where: { codigo: datos.codigo },
    });

    if (prestamoExistente) {
      return NextResponse.json(
        {
          success: false,
          error: `Ya existe un préstamo con el código ${datos.codigo}`,
          code: "CODIGO_DUPLICADO",
        },
        { status: 409 }
      );
    }

    // 4. Crear préstamo en transacción
    const resultado = await prisma.$transaction(
      async (tx) => {
        const { prestamo, cuotas } = await crearPrestamoConCuotas(
          tx,
          {
            idcliente: datos.idcliente,
            idusuarioCreador: usuario.idusuario,
            tipoprestamo: datos.tipoprestamo,
            codigo: datos.codigo,
            referencia: datos.referencia ?? null,
            montoSolicitado: datos.montoSolicitado,
            montoAprobado: datos.montoAprobado ?? null,
            montoDesembolsado: datos.montoDesembolsado ?? null,
            tasaInteresAnual: datos.tasaInteresAnual,
            plazoMeses: datos.plazoMeses,
            fechaSolicitud: datos.fechaSolicitud
              ? new Date(datos.fechaSolicitud)
              : new Date(),
            fechaAprobacion: datos.fechaAprobacion
              ? new Date(datos.fechaAprobacion)
              : null,
            fechaDesembolso: datos.fechaDesembolso
              ? new Date(datos.fechaDesembolso)
              : null,
            fechaVencimiento: datos.fechaVencimiento
              ? new Date(datos.fechaVencimiento)
              : null,
            observaciones: datos.observaciones ?? null,
            idusuarioGestor: datos.idusuarioGestor ?? null,
          },
          {
            generarCuotas: datos.generarCuotas,
            diaPago: datos.diaPago,
          }
        );

        // Registrar auditoría
        await tx.tbl_auditoria.create({
          data: {
            idusuario: usuario.idusuario,
            entidad: "tbl_prestamo",
            entidadId: prestamo.idprestamo,
            accion: "CREAR_PRESTAMO",
            detalle: `Préstamo ${prestamo.codigo} creado con ${cuotas.length} cuotas`,
            ip,
            userAgent,
          },
        });

        return { prestamo, cuotas };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/prestamos
 * Listar préstamos con filtros
 */
export async function GET(req: NextRequest) {
  try {
    // Autenticar
    await requirePermission(req, "VIEW_LOAN");

    // Parsear query params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const estado = searchParams.get("estado");
    const idcliente = searchParams.get("idcliente");
    const codigo = searchParams.get("codigo");

    const skip = (page - 1) * pageSize;

    // Construir filtros
    const where: any = {
      deletedAt: null,
    };

    if (estado) {
      where.estado = estado;
    }

    if (idcliente) {
      where.idcliente = parseInt(idcliente);
    }

    if (codigo) {
      where.codigo = { contains: codigo };
    }

    // Consultar préstamos
    const [prestamos, total] = await Promise.all([
      prisma.tbl_prestamo.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          cliente: {
            select: {
              idcliente: true,
              primer_nombres: true,
              primer_apellido: true,
              numerodocumento: true,
            },
          },
          usuarioGestor: {
            select: {
              idusuario: true,
              nombre: true,
              email: true,
            },
          },
        },
      }),
      prisma.tbl_prestamo.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        prestamos,
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



