/**
 * Mitigación CSRF ligera: header personalizado en peticiones same-origin.
 * Los navegadores no envían headers custom en formularios cross-site.
 */

export const CSRF_HEADER = 'x-flowpay-request';
export const CSRF_HEADER_VALUE = '1';

export function validarCsrfHeader(request: Request): boolean {
  return request.headers.get(CSRF_HEADER) === CSRF_HEADER_VALUE;
}

export function csrfHeaders(): Record<string, string> {
  return { [CSRF_HEADER]: CSRF_HEADER_VALUE };
}
