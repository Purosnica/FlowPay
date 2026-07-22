/**
 * Autenticación Bearer para endpoints del SMSGateway Android.
 */

export function validarSmsGatewayAuth(request: Request): boolean {
  const token = process.env.SMS_GATEWAY_TOKEN;
  if (!token) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${token}`;
}
