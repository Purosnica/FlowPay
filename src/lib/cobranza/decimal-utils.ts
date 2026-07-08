import { type Decimal } from "@prisma/client/runtime/library";

/**
 * Convierte un valor Prisma Decimal a número para cálculos internos.
 */
export function decimalToNumber(value: Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number.parseFloat(value);
  }
  return value.toNumber();
}

/**
 * Convierte un valor Prisma Decimal a string para GraphQL / UI.
 */
export function decimalToString(value: Decimal | number | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

/**
 * Redondea a 2 decimales (montos monetarios).
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
