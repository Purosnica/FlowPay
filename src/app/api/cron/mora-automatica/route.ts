/**
 * ENDPOINT PARA CRON JOB - MORA AUTOMÁTICA
 * 
 * Este endpoint ejecuta el proceso de mora automática.
 * Debe ser llamado diariamente por un servicio de cron job.
 * 
 * CONFIGURACIÓN DE CRON JOB:
 * 
 * Opción 1: Usando servicios externos (recomendado para producción)
 * - Vercel Cron: https://vercel.com/docs/cron-jobs
 * - GitHub Actions: https://docs.github.com/en/actions
 * - AWS EventBridge / Lambda
 * - Google Cloud Scheduler
 * 
 * Opción 2: Usando un servicio interno
 * - node-cron en servidor dedicado
 * - PM2 con cron
 * 
 * EJEMPLO DE CONFIGURACIÓN (Vercel):
 * En vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/mora-automatica",
 *     "schedule": "0 2 * * *"  // Diario a las 2:00 AM
 *   }]
 * }
 * 
 * EJEMPLO DE CONFIGURACIÓN (node-cron):
 * const cron = require('node-cron');
 * cron.schedule('0 2 * * *', async () => {
 *   await fetch('https://tu-dominio.com/api/cron/mora-automatica');
 * });
 * 
 * SEGURIDAD:
 * - Este endpoint debe estar protegido con autenticación
 * - Usar un token secreto o API key
 * - Validar origen de la petición
 */

import { NextRequest, NextResponse } from "next/server";
import { ejecutarMoraAutomatica } from "@/lib/services/mora-automatica";

// Token secreto para autenticación (debe estar en variables de entorno)
const CRON_SECRET = process.env.CRON_SECRET || "cambiar-en-produccion";

/**
 * Valida que la petición sea autorizada
 */
function validarAutenticacion(request: NextRequest): boolean {
  // Verificar token en header
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${CRON_SECRET}`) {
    return true;
  }

  // Verificar token en query parameter (alternativa)
  const token = request.nextUrl.searchParams.get("token");
  if (token === CRON_SECRET) {
    return true;
  }

  return false;
}

/**
 * GET /api/cron/mora-automatica
 * Ejecuta el proceso de mora automática
 */
export async function GET(request: NextRequest) {
  try {
    // Validar autenticación
    if (!validarAutenticacion(request)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Ejecutar proceso de mora automática
    const resultado = await ejecutarMoraAutomatica();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      resultado,
    });
  } catch (error) {
    console.error("[CRON] Error ejecutando mora automática:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/mora-automatica
 * Alternativa POST para servicios que no soportan GET
 */
export async function POST(request: NextRequest) {
  return GET(request);
}




