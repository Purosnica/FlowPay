/** TTL absoluto de sesión (segundos). No se extiende indefinidamente con /me. */
export const SESSION_ABSOLUTE_SECONDS = 60 * 60 * 8;

/** Segundos máximos de validez de permisos embebidos en el JWT (UI/middleware). */
export const PERMISOS_MAX_AGE_SECONDS = 15 * 60;

export function remainingSessionSeconds(sessionStartedAt: number): number {
  const elapsed = Math.floor(Date.now() / 1000) - sessionStartedAt;
  return Math.max(0, SESSION_ABSOLUTE_SECONDS - elapsed);
}

export function resolverSessionStartedAt(params: {
  sessionStartedAt?: number;
  iat?: number;
}): number {
  return (
    params.sessionStartedAt ??
    params.iat ??
    Math.floor(Date.now() / 1000)
  );
}

export function permisosJwtEstanFrescos(
  permisosAt: number | undefined,
): boolean {
  if (permisosAt == null || !Number.isFinite(permisosAt)) {
    return false;
  }
  const edad = Math.floor(Date.now() / 1000) - permisosAt;
  return edad >= 0 && edad <= PERMISOS_MAX_AGE_SECONDS;
}
