/**
 * ENDPOINT PARA SUBIR DOCUMENTOS
 * 
 * POST /api/documentos/upload
 * 
 * Recibe un archivo multipart/form-data y lo guarda en el sistema de archivos.
 * Retorna la información del archivo para crear el registro en la base de datos.
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Directorio base para almacenar documentos
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "uploads", "documentos");

/**
 * Asegura que el directorio de uploads existe
 */
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Genera un nombre único para el archivo
 */
function generarNombreArchivo(originalName: string, idprestamo: number): string {
  const timestamp = Date.now();
  const extension = originalName.split(".").pop() || "";
  const nombreBase = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
  return `prestamo_${idprestamo}_${nombreBase}_${timestamp}.${extension}`;
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const idprestamo = formData.get("idprestamo") as string;
    const tipo = formData.get("tipo") as string;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    if (!idprestamo) {
      return NextResponse.json({ error: "No se proporcionó idprestamo" }, { status: 400 });
    }

    if (!tipo) {
      return NextResponse.json({ error: "No se proporcionó tipo de documento" }, { status: 400 });
    }

    // Validar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo excede el tamaño máximo permitido (10MB)" },
        { status: 400 }
      );
    }

    // Generar nombre único y ruta
    const nombreArchivo = generarNombreArchivo(file.name, parseInt(idprestamo));
    const rutaCompleta = join(UPLOAD_DIR, nombreArchivo);

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(rutaCompleta, buffer);

    // Retornar información del archivo
    return NextResponse.json({
      success: true,
      nombreArchivo,
      nombreOriginal: file.name,
      rutaArchivo: `/uploads/documentos/${nombreArchivo}`, // Ruta relativa para acceso
      mimeType: file.type,
      tamano: file.size,
    });
  } catch (error) {
    console.error("Error subiendo archivo:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido al subir archivo" },
      { status: 500 }
    );
  }
}




