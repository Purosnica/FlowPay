/**
 * ENDPOINT PARA GENERAR REPORTE DE LIQUIDACIÓN
 * 
 * Genera un reporte descargable en formato PDF o Excel de una liquidación de terceros.
 * 
 * GET /api/liquidaciones/:id/reporte?formato=pdf|excel
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TipoPrestamoEnum } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idliquidacion = parseInt(id);
    const formato = request.nextUrl.searchParams.get("formato") || "pdf";

    if (isNaN(idliquidacion)) {
      return NextResponse.json({ error: "ID de liquidación inválido" }, { status: 400 });
    }

    // Obtener liquidación con todas sus relaciones
    const liquidacion = await prisma.tbl_liquidacion_tercero.findFirst({
      where: { idliquidacion, deletedAt: null },
      include: {
        empresa: true,
        usuarioCreador: true,
        usuarioAutorizador: true,
        comisiones: {
          include: {
            prestamo: {
              select: {
                idprestamo: true,
                codigo: true,
                tipoprestamo: true,
                montoDesembolsado: true,
                cliente: {
                  select: {
                    primer_nombres: true,
                    primer_apellido: true,
                    numerodocumento: true,
                  },
                },
              },
            },
            pago: {
              select: {
                idpago: true,
                fechaPago: true,
                montoTotal: true,
              },
            },
          },
          orderBy: { fechaGeneracion: "asc" },
        },
      },
    });

    if (!liquidacion) {
      return NextResponse.json({ error: "Liquidación no encontrada" }, { status: 404 });
    }

    // Validar que todas las comisiones sean de préstamos tercerizados
    const comisionesInvalidas = liquidacion.comisiones.filter(
      (c) => c.prestamo.tipoprestamo !== TipoPrestamoEnum.TERCERIZADO
    );

    if (comisionesInvalidas.length > 0) {
      return NextResponse.json(
        { error: "La liquidación contiene comisiones de préstamos propios. Esto no debería ocurrir." },
        { status: 500 }
      );
    }

    // Preparar datos del reporte
    const datosReporte = {
      liquidacion: {
        codigo: liquidacion.codigo,
        periodoDesde: liquidacion.periodoDesde.toISOString().split("T")[0],
        periodoHasta: liquidacion.periodoHasta.toISOString().split("T")[0],
        estado: liquidacion.estado,
        montoTotalComisiones: Number(liquidacion.montoTotalComisiones),
        montoTotalLiquidado: liquidacion.montoTotalLiquidado
          ? Number(liquidacion.montoTotalLiquidado)
          : null,
        montoTotalPagado: liquidacion.montoTotalPagado
          ? Number(liquidacion.montoTotalPagado)
          : null,
        fechaLiquidacion: liquidacion.fechaLiquidacion?.toISOString().split("T")[0] || null,
        fechaPago: liquidacion.fechaPago?.toISOString().split("T")[0] || null,
        numeroComisiones: liquidacion.numeroComisiones,
        observaciones: liquidacion.observaciones,
      },
      empresa: {
        nombre: liquidacion.empresa.nombre,
        codigo: liquidacion.empresa.codigo,
        ruc: liquidacion.empresa.ruc,
        contacto: liquidacion.empresa.contacto,
        email: liquidacion.empresa.email,
      },
      usuarioCreador: liquidacion.usuarioCreador
        ? {
            nombre: liquidacion.usuarioCreador.nombre,
            email: liquidacion.usuarioCreador.email,
          }
        : null,
      usuarioAutorizador: liquidacion.usuarioAutorizador
        ? {
            nombre: liquidacion.usuarioAutorizador.nombre,
            email: liquidacion.usuarioAutorizador.email,
          }
        : null,
      comisiones: liquidacion.comisiones.map((c) => ({
        idcomision: c.idcomision,
        codigoPrestamo: c.prestamo.codigo,
        cliente: `${c.prestamo.cliente.primer_nombres} ${c.prestamo.cliente.primer_apellido}`,
        documentoCliente: c.prestamo.cliente.numerodocumento,
        fechaGeneracion: c.fechaGeneracion.toISOString().split("T")[0],
        montoBase: Number(c.montoBase),
        montoComision: Number(c.montoComision),
        descripcion: c.descripcion,
        fechaPago: c.pago?.fechaPago.toISOString().split("T")[0] || null,
        montoPago: c.pago ? Number(c.pago.montoTotal) : null,
      })),
    };

    // Generar reporte según formato
    if (formato === "csv" || formato === "excel") {
      // Generar CSV (formato simple para Excel)
      const csv = generarCSV(datosReporte);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="liquidacion_${liquidacion.codigo}.csv"`,
        },
      });
    } else if (formato === "pdf") {
      // Generar JSON estructurado (para PDF se puede usar una librería como pdfkit o puppeteer)
      // Por ahora retornamos JSON estructurado que puede ser consumido por un generador de PDF
      return NextResponse.json(datosReporte, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="liquidacion_${liquidacion.codigo}.json"`,
        },
      });
    } else {
      // JSON por defecto
      return NextResponse.json(datosReporte, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="liquidacion_${liquidacion.codigo}.json"`,
        },
      });
    }
  } catch (error) {
    console.error("Error generando reporte:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

/**
 * Genera un CSV con los datos de la liquidación
 */
function generarCSV(datos: any): string {
  const lineas: string[] = [];

  // BOM para UTF-8 (permite mostrar caracteres especiales en Excel)
  lineas.push("\uFEFF");

  // Encabezado del reporte
  lineas.push("REPORTE DE LIQUIDACIÓN DE TERCEROS");
  lineas.push("");
  
  // Información general
  lineas.push("INFORMACIÓN GENERAL");
  lineas.push(`Código,${datos.liquidacion.codigo}`);
  lineas.push(`Empresa,${datos.empresa.nombre} (${datos.empresa.codigo})`);
  if (datos.empresa.ruc) {
    lineas.push(`RUC,${datos.empresa.ruc}`);
  }
  if (datos.empresa.contacto) {
    lineas.push(`Contacto,${datos.empresa.contacto}`);
  }
  if (datos.empresa.email) {
    lineas.push(`Email,${datos.empresa.email}`);
  }
  lineas.push(`Período,${datos.liquidacion.periodoDesde} al ${datos.liquidacion.periodoHasta}`);
  lineas.push(`Estado,${datos.liquidacion.estado}`);
  lineas.push(`Monto Total Comisiones,${datos.liquidacion.montoTotalComisiones.toFixed(2)}`);
  if (datos.liquidacion.montoTotalLiquidado) {
    lineas.push(`Monto Total Liquidado,${datos.liquidacion.montoTotalLiquidado.toFixed(2)}`);
  }
  if (datos.liquidacion.montoTotalPagado) {
    lineas.push(`Monto Total Pagado,${datos.liquidacion.montoTotalPagado.toFixed(2)}`);
  }
  lineas.push(`Número de Comisiones,${datos.liquidacion.numeroComisiones}`);
  if (datos.liquidacion.fechaLiquidacion) {
    lineas.push(`Fecha Liquidación,${datos.liquidacion.fechaLiquidacion}`);
  }
  if (datos.liquidacion.fechaPago) {
    lineas.push(`Fecha Pago,${datos.liquidacion.fechaPago}`);
  }
  if (datos.usuarioCreador) {
    lineas.push(`Creado por,${datos.usuarioCreador.nombre} (${datos.usuarioCreador.email})`);
  }
  if (datos.usuarioAutorizador) {
    lineas.push(`Autorizado por,${datos.usuarioAutorizador.nombre} (${datos.usuarioAutorizador.email})`);
  }
  if (datos.liquidacion.observaciones) {
    lineas.push(`Observaciones,"${datos.liquidacion.observaciones.replace(/"/g, '""')}"`);
  }
  lineas.push("");

  // Resumen por préstamo
  const resumenPorPrestamo = new Map<string, { comisiones: number; montoTotal: number }>();
  for (const comision of datos.comisiones) {
    const codigo = comision.codigoPrestamo;
    if (!resumenPorPrestamo.has(codigo)) {
      resumenPorPrestamo.set(codigo, { comisiones: 0, montoTotal: 0 });
    }
    const resumen = resumenPorPrestamo.get(codigo)!;
    resumen.comisiones += 1;
    resumen.montoTotal += comision.montoComision;
  }

  lineas.push("RESUMEN POR PRÉSTAMO");
  lineas.push("Código Préstamo,Número Comisiones,Monto Total");
  for (const [codigo, resumen] of resumenPorPrestamo.entries()) {
    lineas.push(`${codigo},${resumen.comisiones},${resumen.montoTotal.toFixed(2)}`);
  }
  lineas.push("");

  // Detalle de comisiones
  lineas.push("DETALLE DE COMISIONES");
  lineas.push(
    "ID,Préstamo,Cliente,Documento,Fecha Generación,Monto Base,Monto Comisión,Descripción,Fecha Pago,Monto Pago"
  );

  for (const comision of datos.comisiones) {
    lineas.push(
      [
        comision.idcomision,
        comision.codigoPrestamo,
        `"${(comision.cliente || "").replace(/"/g, '""')}"`,
        comision.documentoCliente || "",
        comision.fechaGeneracion,
        comision.montoBase.toFixed(2),
        comision.montoComision.toFixed(2),
        `"${(comision.descripcion || "").replace(/"/g, '""')}"`,
        comision.fechaPago || "",
        comision.montoPago ? comision.montoPago.toFixed(2) : "",
      ].join(",")
    );
  }

  // Totales
  lineas.push("");
  lineas.push("TOTALES");
  const totalMontoBase = datos.comisiones.reduce((sum: number, c: any) => sum + c.montoBase, 0);
  const totalMontoComision = datos.comisiones.reduce((sum: number, c: any) => sum + c.montoComision, 0);
  const totalMontoPago = datos.comisiones.reduce((sum: number, c: any) => sum + (c.montoPago || 0), 0);
  lineas.push(`Total Monto Base,${totalMontoBase.toFixed(2)}`);
  lineas.push(`Total Monto Comisión,${totalMontoComision.toFixed(2)}`);
  lineas.push(`Total Monto Pago,${totalMontoPago.toFixed(2)}`);

  return lineas.join("\n");
}

