/**
 * Maker-checker de liquidación (H07).
 */

export function puedeEmitirComoChecker(params: {
  idusuarioActor: number;
  idusuarioCreacion: number | null | undefined;
}): boolean {
  if (params.idusuarioCreacion == null) {
    return true;
  }
  return params.idusuarioActor !== params.idusuarioCreacion;
}

export function puedeMarcarPagadaComoChecker(params: {
  idusuarioActor: number;
  idusuarioEmision: number | null | undefined;
}): boolean {
  if (params.idusuarioEmision == null) {
    return true;
  }
  return params.idusuarioActor !== params.idusuarioEmision;
}
