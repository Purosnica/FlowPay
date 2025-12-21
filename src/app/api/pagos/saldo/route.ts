/**
 * API ROUTE: CONSULTAR SALDO
 * 
 * GET /api/pagos/saldo?idprestamo=123
 * Consulta el saldo pendiente de un préstamo
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { prisma } from "@/lib/prisma";
import { EstadoCuotaEnum } from "@prisma/client";

/**
 * GET /api/pagos/saldo
 * Consultar saldo de un préstamo
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "VIEW_LOAN");

    const { searchParams } = new URL(req.url);
    const idprestamo = searchParams.get("idprestamo");

    if (!idprestamo) {
      return NextResponse.json(
        {
          success: false,
          error: "El parámetro idprestamo es requerido",
          code: "PARAMETRO_REQUERIDO",
        },
        { status: 400 }
      );
    }

    const prestamo = await prisma.tbl_prestamo.findFirst({
      where: {
        idprestamo: parseInt(idprestamo),
        deletedAt: null,
      },
      include: {
        cuotas: {
          where: { deletedAt: null },
          orderBy: { numero: "asc" },
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

    // Calcular saldos desde las cuotas
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

    // Cuotas pendientes
    const cuotasPendientes = prestamo.cuotas.filter(
      (c) =>
        c.estado === EstadoCuotaEnum.PENDIENTE ||
        c.estado === EstadoCuotaEnum.PARCIAL ||
        c.estado === EstadoCuotaEnum.VENCIDA
    );

    // Cuotas vencidas
    const ahora = new Date();
    const cuotasVencidas = prestamo.cuotas.filter(
      (c) =>
        new Date(c.fechaVencimiento) < ahora &&
        (c.estado === EstadoCuotaEnum.PENDIENTE ||
          c.estado === EstadoCuotaEnum.VENCIDA)
    );

    return NextResponse.json({
      success: true,
      data: {
        idprestamo: prestamo.idprestamo,
        codigo: prestamo.codigo,
        saldoCapital,
        saldoInteres,
        saldoMora,
        saldoTotal,
        cuotasPendientes: cuotasPendientes.length,
        cuotasVencidas: cuotasVencidas.length,
        totalCuotas: prestamo.cuotas.length,
        estado: prestamo.estado,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}



