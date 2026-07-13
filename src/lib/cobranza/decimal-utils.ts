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
 * Redondea a 2 decimales (montos monetarios) vía centavos enteros.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(Number(`${value}e2`)) / 100;
}
