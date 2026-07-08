/**
 * Autenticación para endpoints de cron.
 * Vercel Cron envía Authorization: Bearer CRON_SECRET.
 */

export function validarCronAuth(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}
