export const GET_CODIGOS_COBRANZA = `
  query GetCodigosCobranza {
    codigosAccion(todos: true) { idcodaccion codigo descripcion esTercero estado }
    codigosResultado(todos: true) { idcodresultado codigo descripcion grupo tipoGestion estado }
  }
`;
export const CREATE_CODIGO_ACCION = `mutation CreateCodigoAccion($input: CreateCodigoAccionInput!) { createCodigoAccion(input: $input) { idcodaccion } }`;
export const UPDATE_CODIGO_ACCION = `mutation UpdateCodigoAccion($input: UpdateCodigoAccionInput!) { updateCodigoAccion(input: $input) { idcodaccion } }`;
export const CREATE_CODIGO_RESULTADO = `mutation CreateCodigoResultado($input: CreateCodigoResultadoInput!) { createCodigoResultado(input: $input) { idcodresultado } }`;
export const UPDATE_CODIGO_RESULTADO = `mutation UpdateCodigoResultado($input: UpdateCodigoResultadoInput!) { updateCodigoResultado(input: $input) { idcodresultado } }`;
