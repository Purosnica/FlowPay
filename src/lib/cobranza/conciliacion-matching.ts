import { roundMoney } from './decimal-utils';

export type CandidatoConciliacion = {
  idpago: number;
  referencia?: string | null;
  monto: number;
  moneda: string;
  fechaPago: Date;
};

export type ResultadoMatching =
  | { estado: 'MATCH_EXACT' | 'MATCH_PROBABLE'; candidato: CandidatoConciliacion; confidence: number; metodo: string }
  | { estado: 'AMBIGUO' | 'SIN_COINCIDENCIA'; candidatos: CandidatoConciliacion[] };

export function normalizarReferenciaBancaria(valor: string | null | undefined): string | null {
  const normalizada = valor?.trim().toUpperCase().replace(/[\s\-_/.:]+/g, '');
  return normalizada || null;
}

/** Nunca selecciona automáticamente si dos candidatos tienen la misma prioridad. */
export function resolverMatchingBancario(
  linea: { referencia?: string | null; monto: number; moneda: string; fechaOperacion: Date },
  candidatos: CandidatoConciliacion[],
): ResultadoMatching {
  const referencia = normalizarReferenciaBancaria(linea.referencia);
  const exactos = referencia
    ? candidatos.filter((p) => normalizarReferenciaBancaria(p.referencia) === referencia)
    : [];
  if (exactos.length === 1) return { estado: 'MATCH_EXACT', candidato: exactos[0]!, confidence: 100, metodo: 'REFERENCIA_NORMALIZADA' };
  if (exactos.length > 1) return { estado: 'AMBIGUO', candidatos: exactos };
  const porMontoFecha = candidatos.filter((p) => {
    const dias = Math.abs(p.fechaPago.getTime() - linea.fechaOperacion.getTime()) / 86_400_000;
    return p.moneda === linea.moneda && roundMoney(p.monto) === roundMoney(linea.monto) && dias <= 1;
  });
  if (porMontoFecha.length === 1) return { estado: 'MATCH_PROBABLE', candidato: porMontoFecha[0]!, confidence: 80, metodo: 'MONTO_MONEDA_FECHA' };
  if (porMontoFecha.length > 1) return { estado: 'AMBIGUO', candidatos: porMontoFecha };
  return { estado: 'SIN_COINCIDENCIA', candidatos: [] };
}
