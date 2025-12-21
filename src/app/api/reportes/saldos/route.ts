/**
 * API ROUTE: REPORTE DE SALDOS
 * 
 * GET /api/reportes/saldos
 * Genera reporte de saldos totales
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { prisma } from "@/lib/prisma";
import { EstadoPrestamoEnum } from "@prisma/client";

/**
 * GET /api/reportes/saldos
 * Reporte de saldos totales
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "VER_REPORTES");

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado");
    const idcobrador = searchParams.get("idcobrador");

    const where: any = {
      deletedAt: null,
    };

    if (estado) {
      where.estado = estado;
    }

    // Obtener préstamos
    const prestamos = await prisma.tbl_prestamo.findMany({
      where,
      include: {
        cuotas: {
          where: { deletedAt: null },
        },
        asignaciones: idcobrador
          ? {
              where: {
                idusuario: parseInt(idcobrador),
                activa: true,
                deletedAt: null,
              },
              include: {
                usuario: {
                  select: {
                    nombre: true,
                  },
                },
              },
            }
          : {
              where: { activa: true, deletedAt: null },
              include: {
                usuario: {
                  select: {
                    nombre: true,
                  },
                },
              },
            },
      },
    });

    // Filtrar por cobrador si se especifica
    const prestamosFiltrados = idcobrador
      ? prestamos.filter((p) => p.asignaciones.length > 0)
      : prestamos;

    // Calcular saldos totales
    let saldoCapitalTotal = 0;
    let saldoInteresTotal = 0;
    let saldoMoraTotal = 0;
    let saldoTotalGeneral = 0;

    prestamosFiltrados.forEach((prestamo) => {
      const saldoCapital = prestamo.cuotas.reduce(
        (sum, c) =>
          sum + Number(c.capitalProgramado) - Number(c.capitalPagado),
        0
      );
      const saldoInteres = prestamo.cuotas.reduce(
        (sum, c) =>
          sum + Number(c.interesProgramado) - Number(c.interesPagado),
        0
      );
      const saldoMora = prestamo.cuotas.reduce(
        (sum, c) => sum + Number(c.moraProgramada) - Number(c.moraPagada),
        0
      );

      saldoCapitalTotal += saldoCapital;
      saldoInteresTotal += saldoInteres;
      saldoMoraTotal += saldoMora;
      saldoTotalGeneral += saldoCapital + saldoInteres + saldoMora;
    });

    // Agrupar por estado
    const saldosPorEstado: Record<string, number> = {};
    prestamosFiltrados.forEach((prestamo) => {
      const saldoCapital = prestamo.cuotas.reduce(
        (sum, c) =>
          sum + Number(c.capitalProgramado) - Number(c.capitalPagado),
        0
      );
      const saldoInteres = prestamo.cuotas.reduce(
        (sum, c) =>
          sum + Number(c.interesProgramado) - Number(c.interesPagado),
        0
      );
      const saldoMora = prestamo.cuotas.reduce(
        (sum, c) => sum + Number(c.moraProgramada) - Number(c.moraPagada),
        0
      );
      const saldoTotal = saldoCapital + saldoInteres + saldoMora;

      saldosPorEstado[prestamo.estado] =
        (saldosPorEstado[prestamo.estado] || 0) + saldoTotal;
    });

    // Agrupar por cobrador
    const saldosPorCobrador: Record<string, number> = {};
    prestamosFiltrados.forEach((prestamo) => {
      const saldoCapital = prestamo.cuotas.reduce(
        (sum, c) =>
          sum + Number(c.capitalProgramado) - Number(c.capitalPagado),
        0
      );
      const saldoInteres = prestamo.cuotas.reduce(
        (sum, c) =>
          sum + Number(c.interesProgramado) - Number(c.interesPagado),
        0
      );
      const saldoMora = prestamo.cuotas.reduce(
        (sum, c) => sum + Number(c.moraProgramada) - Number(c.moraPagada),
        0
      );
      const saldoTotal = saldoCapital + saldoInteres + saldoMora;

      const cobrador =
        prestamo.asignaciones[0]?.usuario?.nombre || "Sin asignar";
      saldosPorCobrador[cobrador] =
        (saldosPorCobrador[cobrador] || 0) + saldoTotal;
    });

    return NextResponse.json({
      success: true,
      data: {
        saldosTotales: {
          saldoCapital: saldoCapitalTotal,
          saldoInteres: saldoInteresTotal,
          saldoMora: saldoMoraTotal,
          saldoTotal: saldoTotalGeneral,
        },
        saldosPorEstado,
        saldosPorCobrador,
        totalPrestamos: prestamosFiltrados.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}



