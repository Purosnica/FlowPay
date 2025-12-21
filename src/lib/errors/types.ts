/**
 * TIPOS DE ERROR ESTRUCTURADOS
 * 
 * Define los tipos de error que pueden ocurrir en la aplicación
 * y cómo deben ser formateados para el frontend.
 */

export enum ErrorCode {
  // Errores de Prisma
  PRISMA_UNIQUE_CONSTRAINT = "PRISMA_UNIQUE_CONSTRAINT",
  PRISMA_FOREIGN_KEY_CONSTRAINT = "PRISMA_FOREIGN_KEY_CONSTRAINT",
  PRISMA_NOT_FOUND = "PRISMA_NOT_FOUND",
  PRISMA_VALIDATION = "PRISMA_VALIDATION",
  PRISMA_CONNECTION = "PRISMA_CONNECTION",
  
  // Errores de validación
  VALIDATION_ERROR = "VALIDATION_ERROR",
  ZOD_VALIDATION = "ZOD_VALIDATION",
  
  // Errores de autenticación/autorización
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  
  // Errores de negocio
  BUSINESS_LOGIC_ERROR = "BUSINESS_LOGIC_ERROR",
  
  // Errores de red
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  
  // Errores genéricos
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export type ErrorDetails = Record<string, unknown>;

export interface StructuredError {
  code: ErrorCode;
  message: string;
  userMessage: string; // Mensaje amigable para el usuario
  details?: ErrorDetails;
  field?: string; // Campo específico si es un error de validación
  statusCode: number;
  timestamp: string;
  path?: string; // Path de GraphQL si aplica
}

export interface ErrorResponse {
  error: StructuredError;
  errors?: StructuredError[]; // Para múltiples errores
}




