/**
 * EXPORTACIÓN CENTRALIZADA DE UTILIDADES
 * 
 * Este archivo exporta todas las utilidades del sistema organizadas por categoría.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilidad para combinar clases de Tailwind CSS
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Utilidades de fechas
export * from "./date";

// Utilidades de números
export * from "./number";

// Utilidades de formateo
export * from './format';

// Logger: importar desde '@/lib/utils/logger' (no reexportar aquí —
// arrastra @sentry/node al client bundle vía `import { cn } from '@/lib/utils'`).

// Utilidades de sanitización
export * from './sanitize';

