/**
 * Mensajes seguros para el cliente (ERR-01).
 * No reenvía stacks, SQL ni errores de infraestructura.
 */

import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { ServicioError } from '@/lib/services/error-types';

const LEAK_HINT =
  /prisma|ECONN|ETIMEDOUT|ENOTFOUND|SQL|stack|at\s+\S+\s+\(|\$queryRaw|DATABASE_URL|password|secret/i;

/**
 * Si el error ya es de dominio tipado, reutiliza su mensaje.
 * Si no, usa el fallback (nunca el message crudo de infra).
 */
export function mensajeClienteSeguro(
  err: unknown,
  fallback: string,
): string {
  if (err instanceof GraphQLValidationError) {
    return err.message;
  }
  if (err instanceof ServicioError) {
    return err.message;
  }
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (
      msg.length > 0 &&
      msg.length <= 180 &&
      !LEAK_HINT.test(msg) &&
      !msg.includes('\n')
    ) {
      return msg;
    }
  }
  return fallback;
}
