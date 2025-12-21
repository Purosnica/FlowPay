/**
 * Tipos compartidos para la aplicación
 */

// Nota: User y Payment no existen en el schema de Prisma actual
// Usar tbl_usuario y tbl_pago en su lugar

/**
 * Respuesta estándar de la API
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  errors?: string[];
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Estado de carga genérico
 */
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

/**
 * Opciones de ordenamiento
 */
export type SortOrder = "asc" | "desc";

/**
 * Filtros genéricos
 */
export interface BaseFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
}

/**
 * Resultado de una operación
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}











