/**
 * Tipos del módulo de importación de cartera.
 */

export type CampoCarteraImport =
  | 'noPrestamo'
  | 'codigoUnico'
  | 'numerodocumento'
  | 'nombreCliente'
  | 'saldoTotal'
  | 'diasMora'
  | 'interesMoratorio'
  | 'montoPrestamo'
  | 'estado'
  | 'celular'
  | 'telefono'
  | 'email'
  | 'direccion'
  | 'noCuenta'
  | 'interes'
  | 'comisionCav'
  | 'comisionInsitu'
  | 'mantenimientoValor'
  | 'gestionCobranza'
  | 'seguroSvsd'
  | 'cargosAdmin'
  | 'fechaVencimiento'
  | 'fechaPrestamo'
  | 'ultimaFechaPago'
  | 'plazoMeses'
  | 'moneda'
  | 'tipoCambio'
  | 'nombreGestor'
  | 'agencia'
  | 'ruta'
  | 'tipoCredito'
  | 'modeloPago';

export type MapeoColumnas = Partial<Record<CampoCarteraImport, string>>;

export interface FilaCarteraParseada {
  fila: number;
  valores: Partial<Record<CampoCarteraImport, string | number | Date | null>>;
}

export interface ErrorImportacionFila {
  fila: number;
  mensaje: string;
}

export interface ResultadoImportacionCartera {
  totalFilas: number;
  clientesCreados: number;
  clientesActualizados: number;
  prestamosCreados: number;
  prestamosActualizados: number;
  prestamosSaldoActualizado: number;
  cortesRegistrados: number;
  contactosCreados: number;
  gestoresAsignados: number;
  omitidos: number;
  saldoTotalCartera: number;
  prestamosAusentes?: number;
  idcarga?: number;
  resumenComparacion?: {
    prestamosNuevos: string[];
    prestamosSaldoCambiado: Array<{
      noPrestamo: string;
      saldoAnterior: number;
      saldoNuevo: number;
    }>;
    prestamosFechaCorteCambiada: string[];
    prestamosAusentes: string[];
    prestamosConErrores: Array<{ fila: number; mensaje: string }>;
  };
  errores: ErrorImportacionFila[];
}

export interface ImportarCarteraParams {
  idmandante: number;
  idcampana: number;
  fechaCorte: Date;
  idusuario: number;
  buffer: Buffer;
  nombreArchivo: string;
  nombreHoja?: string;
  mapeo?: MapeoColumnas;
  idplantillaImp?: number;
  /** Solo para pruebas: limita filas procesadas. */
  maxFilas?: number;
}
