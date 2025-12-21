/**
 * UTILIDADES DE SANITIZACIÓN
 * 
 * Funciones para sanitizar y validar inputs del usuario
 * previniendo XSS, inyección y otros ataques.
 */

/**
 * Remueve caracteres peligrosos de un string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>]/g, "") // Remover < y >
    .replace(/javascript:/gi, "") // Remover javascript:
    .replace(/on\w+=/gi, ""); // Remover event handlers (onclick=, etc.)
}

/**
 * Sanitiza un objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "string") {
      (sanitized as any)[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      (sanitized as any)[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      (sanitized as any)[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeString(item)
          : typeof item === "object" && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      );
    }
  }

  return sanitized;
}

/**
 * Valida y sanitiza un email
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeString(email);
  // Validación básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error("Email inválido");
  }
  return sanitized.toLowerCase();
}

/**
 * Valida y sanitiza un número
 */
export function sanitizeNumber(input: unknown): number {
  if (typeof input === "number") {
    return input;
  }
  if (typeof input === "string") {
    const num = parseFloat(input);
    if (isNaN(num)) {
      throw new Error("Número inválido");
    }
    return num;
  }
  throw new Error("Tipo de dato inválido para número");
}

/**
 * Valida y sanitiza un entero
 */
export function sanitizeInteger(input: unknown): number {
  const num = sanitizeNumber(input);
  if (!Number.isInteger(num)) {
    throw new Error("Debe ser un número entero");
  }
  return num;
}

