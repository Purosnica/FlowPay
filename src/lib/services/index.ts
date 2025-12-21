/**
 * EXPORTACIÓN CENTRALIZADA DE SERVICIOS
 * 
 * Este archivo exporta todos los servicios seguros y transaccionales
 * para operaciones críticas del sistema de préstamos y cobranza.
 */

// Servicios principales
export {
  registrarPago,
  type DatosRegistroPago,
  type ResultadoRegistroPago,
} from "./pago-service";

export {
  generarCuotas,
  type DatosGeneracionCuotas,
  type ResultadoGeneracionCuotas,
} from "./cuota-service";

export {
  aplicarMora,
  type DatosAplicacionMora,
  type ResultadoAplicacionMora,
  type ConfiguracionMora,
} from "./mora-service";

export {
  crearAcuerdo,
  type DatosCreacionAcuerdo,
  type ResultadoCreacionAcuerdo,
} from "./acuerdo-service";

export {
  refinanciarPrestamo,
  type DatosRefinanciamiento,
  type ResultadoRefinanciamiento,
} from "./refinanciamiento-service";

export {
  castigarCartera,
  castigarPrestamo,
  estaPrestamoCastigado,
  validarPagoPrestamoCastigado,
  type DatosCastigo,
  type DatosCastigoPrestamo,
  type ResultadoCastigo,
  type ResultadoCastigoPrestamo,
} from "./castigo-service";

// Tipos de errores
export {
  ServicioError,
  ErrorCode,
  errorValidacion,
  errorNegocio,
  errorConcurrencia,
} from "./error-types";

