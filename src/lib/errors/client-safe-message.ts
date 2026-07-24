/**
 * Mensajes seguros para el cliente (ERR-01).
 * No reenvía stacks, SQL ni errores de infraestructura.
 */

import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { ServicioError } from '@/lib/services/error-types';

const LEAK_HINT =
  /prisma|ECONN|ETIMEDOUT|ENOTFOUND|SQL|stack|at\s+\S+\s+\(|\$queryRaw|DATABASE_URL|password|secret/i;

const MENSAJES_ENMASCARADOS = new Set([
  'Unexpected error.',
  'Unexpected error',
  'Internal Server Error',
]);

/** True si el mensaje es seguro para mostrar al cliente. */
export function esMensajeClienteSeguro(msg: string): boolean {
  const t = msg.trim();
  return (
    t.length > 0 &&
    t.length <= 180 &&
    !LEAK_HINT.test(t) &&
    !t.includes('\n') &&
    !MENSAJES_ENMASCARADOS.has(t)
  );
}

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
    if (esMensajeClienteSeguro(msg)) {
      return msg;
    }
  }
  return fallback;
}

/**
 * Convierte cualquier error en GraphQLValidationError con mensaje seguro.
 */
export function asGraphQLValidationError(
  err: unknown,
  fallback: string,
): GraphQLValidationError {
  if (err instanceof GraphQLValidationError) {
    return err;
  }
  return new GraphQLValidationError(mensajeClienteSeguro(err, fallback));
}
