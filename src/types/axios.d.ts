import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Si es true, no muestra toast global en errores de red/timeout. */
    suppressErrorToast?: boolean;
  }
}
