/**
 * RATE LIMITING BÁSICO
 * 
 * Implementa rate limiting en memoria para prevenir
 * ataques de fuerza bruta y DDoS.
 * 
 * NOTA: Para producción, considerar usar Redis o un servicio
 * externo como Upstash Rate Limit.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpiar entradas expiradas cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Limpia entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.store.forEach((entry, key) => {
      if (entry.resetTime < now) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.store.delete(key));
  }

  /**
   * Verifica si una request está dentro del límite
   * 
   * @param identifier Identificador único (IP, userId, etc.)
   * @param maxRequests Número máximo de requests
   * @param windowMs Ventana de tiempo en milisegundos
   * @returns true si está dentro del límite, false si excedió
   */
  check(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || entry.resetTime < now) {
      // Nueva entrada o expirada, crear nueva
      this.store.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    // Incrementar contador
    entry.count++;

    // Verificar si excedió el límite
    if (entry.count > maxRequests) {
      return false;
    }

    return true;
  }

  /**
   * Obtiene información sobre el rate limit actual
   */
  getInfo(identifier: string): { remaining: number; resetTime: number } | null {
    const entry = this.store.get(identifier);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (entry.resetTime < now) {
      return null;
    }

    return {
      remaining: Math.max(0, entry.count),
      resetTime: entry.resetTime,
    };
  }

  /**
   * Limpia todas las entradas (útil para testing)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Destruye el limiter y limpia el intervalo
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Configuraciones de rate limit por tipo de endpoint
 */
export const RATE_LIMIT_CONFIG = {
  LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
  },
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
  },
  GRAPHQL: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minuto
  },
} as const;

