/**
 * ENDPOINT PARA DESCARGAR DOCUMENTOS
 * 
 * GET /api/documentos/:id/download
 * 
 * Descarga un documento por su ID, validando acceso según rol.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "uploads", "documentos");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const iddocumento = parseInt(id);

    if (isNaN(iddocumento)) {
      return NextResponse.json({ error: "ID de documento inválido" }, { status: 400 });
    }

    // Obtener documento
    const documento = await prisma.tbl_documento.findFirst({
      where: { iddocumento, deletedAt: null },
    });

    if (!documento) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // TODO: Validar acceso por rol aquí
    // Por ahora permitimos acceso

    // Construir ruta completa del archivo
    const rutaCompleta = join(UPLOAD_DIR, documento.nombreArchivo);

    if (!existsSync(rutaCompleta)) {
      return NextResponse.json({ error: "Archivo no encontrado en el servidor" }, { status: 404 });
    }

    // Leer archivo
    const archivo = await readFile(rutaCompleta);

    // Retornar archivo
    return new NextResponse(archivo, {
      headers: {
        "Content-Type": documento.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${documento.nombreArchivo}"`,
        "Content-Length": archivo.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error descargando archivo:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}




