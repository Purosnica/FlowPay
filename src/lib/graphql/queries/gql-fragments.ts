/** Fragmentos GraphQL reutilizados en cobranza.queries.ts */

export const CODIGO_ACCION_FIELDS = `
  idcodaccion
  codigo
  descripcion
  esTercero
`;

export const CODIGO_RESULTADO_FIELDS = `
  idcodresultado
  codigo
  descripcion
  grupo
  tipoGestion
`;

export const PRESTAMO_CLIENTE_LIST_FIELDS = `
  idcliente
  primer_nombres
  segundo_nombres
  primer_apellido
  segundo_apellido
  numerodocumento
`;

export const PRESTAMO_LIST_FIELDS = `
  idprestamo
  idmandante
  noPrestamo
  estado
  moneda
  diasMora
  saldoTotal
  reportableCentralRiesgo
  cliente {
    ${PRESTAMO_CLIENTE_LIST_FIELDS}
  }
  mandante {
    idmandante
    nombre
  }
`;

export const RANKING_COBRADOR_FIELDS = `
  idgestor
  nombre
  gestiones
  montoRecuperado
  promesasCumplidas
  posicion
  nivel
  xp
  insignias
`;
