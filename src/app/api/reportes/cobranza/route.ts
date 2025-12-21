/**
 * API ROUTE: REPORTE DE COBRANZA
 * 
 * GET /api/reportes/cobranza
 * Genera reporte de cobranza con filtros
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/reportes/cobranza
 * Reporte de cobranza
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "VER_REPORTES");

    const { searchParams } = new URL(req.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const idcobrador = searchParams.get("idcobrador");
    const idcliente = searchParams.get("idcliente");

    const fechaDesdeDate = fechaDesde ? new Date(fechaDesde) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Últimos 30 días
    const fechaHastaDate = fechaHasta ? new Date(fechaHasta) : new Date();

    const wherePago: any = {
      deletedAt: null,
      fechaPago: {
        gte: fechaDesdeDate,
        lte: fechaHastaDate,
      },
    };

    if (idcobrador) {
      wherePago.idusuario = parseInt(idcobrador);
    }

    if (idcliente) {
      wherePago.prestamo = {
        idcliente: parseInt(idcliente),
      };
    }

    // Obtener pagos
    const pagos = await prisma.tbl_pago.findMany({
      where: wherePago,
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
          },
        },
      },
    });

    // Calcular estadísticas
    const totalRecaudado = pagos.reduce(
      (sum, p) => sum + Number(p.montoTotal),
      0
    );
    const totalCapital = pagos.reduce(
      (sum, p) => sum + Number(p.montoCapital),
      0
    );
    const totalInteres = pagos.reduce(
      (sum, p) => sum + Number(p.montoInteres),
      0
    );
    const totalMora = pagos.reduce((sum, p) => sum + Number(p.montoMora), 0);

    // Agrupar por día
    const recuperacionPorDia: Record<string, number> = {};
    pagos.forEach((pago) => {
      const fecha = new Date(pago.fechaPago).toLocaleDateString("es-PY");
      recuperacionPorDia[fecha] =
        (recuperacionPorDia[fecha] || 0) + Number(pago.montoTotal);
    });

    // Agrupar por cobrador
    const recuperacionPorCobrador: Record<string, number> = {};
    pagos.forEach((pago) => {
      if (pago.usuario) {
        const nombre = pago.usuario.nombre || "Sin asignar";
        recuperacionPorCobrador[nombre] =
          (recuperacionPorCobrador[nombre] || 0) + Number(pago.montoTotal);
      }
    });

    // Agrupar por método de pago
    const recuperacionPorMetodo: Record<string, number> = {};
    pagos.forEach((pago) => {
      recuperacionPorMetodo[pago.metodoPago] =
        (recuperacionPorMetodo[pago.metodoPago] || 0) + Number(pago.montoTotal);
    });

    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          fechaDesde: fechaDesdeDate,
          fechaHasta: fechaHastaDate,
        },
        estadisticas: {
          totalRecaudado,
          totalCapital,
          totalInteres,
          totalMora,
          totalPagos: pagos.length,
        },
        recuperacionPorDia,
        recuperacionPorCobrador,
        recuperacionPorMetodo,
        pagos: pagos.slice(0, 100), // Limitar a 100 pagos en el resumen
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}



