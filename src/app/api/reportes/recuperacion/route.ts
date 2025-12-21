/**
 * API ROUTE: REPORTE DE RECUPERACIÓN
 * 
 * GET /api/reportes/recuperacion
 * Genera reporte de recuperación por cliente o por cobrador
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/reportes/recuperacion
 * Reporte de recuperación
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "VER_REPORTES");

    const { searchParams } = new URL(req.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const tipo = searchParams.get("tipo") || "cobrador"; // "cobrador" o "cliente"
    const idcobrador = searchParams.get("idcobrador");
    const idcliente = searchParams.get("idcliente");

    const fechaDesdeDate = fechaDesde
      ? new Date(fechaDesde)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
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
                numerodocumento: true,
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
      },
    });

    if (tipo === "cliente") {
      // Agrupar por cliente
      const recuperacionPorCliente: Record<
        number,
        {
          cliente: any;
          totalRecaudado: number;
          totalPagos: number;
          pagos: any[];
        }
      > = {};

      pagos.forEach((pago) => {
        const idcliente = pago.prestamo.cliente.idcliente;
        if (!recuperacionPorCliente[idcliente]) {
          recuperacionPorCliente[idcliente] = {
            cliente: pago.prestamo.cliente,
            totalRecaudado: 0,
            totalPagos: 0,
            pagos: [],
          };
        }
        recuperacionPorCliente[idcliente].totalRecaudado += Number(
          pago.montoTotal
        );
        recuperacionPorCliente[idcliente].totalPagos += 1;
        recuperacionPorCliente[idcliente].pagos.push(pago);
      });

      return NextResponse.json({
        success: true,
        data: {
          tipo: "cliente",
          periodo: {
            fechaDesde: fechaDesdeDate,
            fechaHasta: fechaHastaDate,
          },
          recuperacionPorCliente: Object.values(recuperacionPorCliente),
        },
      });
    } else {
      // Agrupar por cobrador
      const recuperacionPorCobrador: Record<
        number,
        {
          cobrador: any;
          totalRecaudado: number;
          totalPagos: number;
          pagos: any[];
        }
      > = {};

      pagos.forEach((pago) => {
        if (pago.usuario) {
          const idusuario = pago.usuario.idusuario;
          if (!recuperacionPorCobrador[idusuario]) {
            recuperacionPorCobrador[idusuario] = {
              cobrador: pago.usuario,
              totalRecaudado: 0,
              totalPagos: 0,
              pagos: [],
            };
          }
          recuperacionPorCobrador[idusuario].totalRecaudado += Number(
            pago.montoTotal
          );
          recuperacionPorCobrador[idusuario].totalPagos += 1;
          recuperacionPorCobrador[idusuario].pagos.push(pago);
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          tipo: "cobrador",
          periodo: {
            fechaDesde: fechaDesdeDate,
            fechaHasta: fechaHastaDate,
          },
          recuperacionPorCobrador: Object.values(recuperacionPorCobrador),
        },
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}



