import type { MapeoHoja } from './parse-excel-sheet';

export const MAPEO_REGISTROS: MapeoHoja = {
  noPrestamo: { columna: 'NUMERO DE PRESTAMO', tipo: 'texto' },
  nombreGestor: { columna: 'GESTOR', tipo: 'texto' },
  fechaGestion: { columna: 'FECHA GESTION', tipo: 'fecha' },
  telefonoContacto: { columna: 'TELEFONO CONTACTO', tipo: 'texto' },
  codigoAccion: { columna: 'COD_ ACC', tipo: 'texto' },
  codigoResultado: { columna: 'COD_RES', tipo: 'texto' },
  nota: { columna: 'NOTA DE GESTION', tipo: 'texto' },
  razonMora: { columna: 'RAZON MORA', tipo: 'texto' },
  montoPromesa: { columna: 'MONTO PROMESA', tipo: 'numero' },
  fechaPromesa: { columna: 'FECHA PROMESA', tipo: 'fecha' },
  fechaProximaGestion: { columna: 'FECHA GESTION PROXIMA', tipo: 'fecha' },
  comentario: { columna: 'COMENTARIO ADICIONAL', tipo: 'texto' },
  agencia: { columna: 'AGENCIA', tipo: 'texto' },
};

export const MAPEO_PROMESAS: MapeoHoja = {
  ...MAPEO_REGISTROS,
  fechaPromesa: { columna: 'FECHA PROMESA', tipo: 'fecha' },
};

export const MAPEO_PAGOS: MapeoHoja = {
  noPrestamo: { columna: 'NUMERO DE PRESTAMO', tipo: 'texto' },
  monto: { columna: 'MONTO PAGO', tipo: 'numero' },
  fechaPago: { columna: 'FECHA PAGO', tipo: 'fecha' },
  nombreGestor: { columna: 'GESTOR', tipo: 'texto' },
};

export const CAMPOS_REQUERIDOS_REGISTROS = ['noPrestamo', 'nota', 'fechaGestion'];
export const CAMPOS_REQUERIDOS_PAGOS = ['noPrestamo', 'monto', 'fechaPago'];
