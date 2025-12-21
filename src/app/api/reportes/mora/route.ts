/**
 * API ROUTE: REPORTE DE MORA
 * 
 * GET /api/reportes/mora
 * Genera reporte de mora diaria
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { prisma } from "@/lib/prisma";
import { EstadoCuotaEnum, EstadoPrestamoEnum } from "@prisma/client";

/**
 * GET /api/reportes/mora
 * Reporte de mora
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "VER_REPORTES");

    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get("fecha");
    const fechaCalculo = fecha ? new Date(fecha) : new Date();

    // Obtener cuotas vencidas
    const cuotasVencidas = await prisma.tbl_cuota.findMany({
      where: {
        deletedAt: null,
        fechaVencimiento: { lt: fechaCalculo },
        estado: {
          in: [
            EstadoCuotaEnum.PENDIENTE,
            EstadoCuotaEnum.PARCIAL,
            EstadoCuotaEnum.VENCIDA,
          ],
        },
      },
      include: {
        prestamo: {
          select: {
            idprestamo: true,
            codigo: true,
            estado: true,
            cliente: {
              select: {
                idcliente: true,
                primer_nombres: true,
                primer_apellido: true,
              },
            },
            asignaciones: {
              where: { activa: true, deletedAt: null },
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
        },
      },
    });

    // Calcular mora total
    const moraTotal = cuotasVencidas.reduce(
      (sum, c) =>
        sum +
        Number(c.moraProgramada) -
        Number(c.moraPagada),
      0
    );

    // Agrupar por préstamo
    const moraPorPrestamo: Record<number, number> = {};
    cuotasVencidas.forEach((cuota) => {
      const moraPendiente =
        Number(cuota.moraProgramada) - Number(cuota.moraPagada);
      moraPorPrestamo[cuota.idprestamo] =
        (moraPorPrestamo[cuota.idprestamo] || 0) + moraPendiente;
    });

    // Agrupar por cobrador
    const moraPorCobrador: Record<string, number> = {};
    cuotasVencidas.forEach((cuota) => {
      const cobrador =
        cuota.prestamo.asignaciones[0]?.usuario?.nombre || "Sin asignar";
      const moraPendiente =
        Number(cuota.moraProgramada) - Number(cuota.moraPagada);
      moraPorCobrador[cobrador] =
        (moraPorCobrador[cobrador] || 0) + moraPendiente;
    });

    // Préstamos en mora
    const prestamosEnMora = await prisma.tbl_prestamo.findMany({
      where: {
        estado: EstadoPrestamoEnum.EN_MORA,
        deletedAt: null,
      },
      select: {
        idprestamo: true,
        codigo: true,
        saldoMora: true,
        cliente: {
          select: {
            idcliente: true,
            primer_nombres: true,
            primer_apellido: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        fechaCalculo,
        estadisticas: {
          totalMora: moraTotal,
          cuotasVencidas: cuotasVencidas.length,
          prestamosEnMora: prestamosEnMora.length,
        },
        moraPorPrestamo,
        moraPorCobrador,
        prestamosEnMora,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}



