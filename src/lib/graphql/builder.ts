import PrismaPlugin from "@pothos/plugin-prisma";
import ZodPlugin from "@pothos/plugin-zod";
import SchemaBuilder from "@pothos/core";
import { getDatamodel, type default as PrismaTypes } from "@pothos/plugin-prisma/generated";
import { prisma } from "@/lib/prisma";

// Tipos para el contexto
export interface GraphQLContext {
  prisma: typeof prisma;
  usuario: {
    idusuario: number;
    nombre: string;
    email: string;
    idrol: number;
  } | null;
}

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  PrismaTypes: PrismaTypes;
  Scalars: {
    DateTime: {
      Input: Date;
      Output: Date;
    };
    JSON: {
      Input: unknown;
      Output: unknown;
    };
    Decimal: {
      Input: string;
      Output: string | null;
    };
  };
}>({
  plugins: [PrismaPlugin, ZodPlugin],
  prisma: {
    client: prisma,
    dmmf: getDatamodel(),
    filterConnectionTotalCount: true,
    onUnusedQuery: process.env.NODE_ENV === "production" ? null : "warn",
  },
});

// Agregar scalar DateTime
builder.scalarType("DateTime", {
  serialize: (date: Date) => date.toISOString(),
  parseValue: (date: unknown): Date => {
    if (typeof date === "string") {
      return new Date(date);
    }
    if (date instanceof Date) {
      return date;
    }
    throw new Error("Invalid date value");
  },
});

// Agregar scalar JSON
builder.scalarType("JSON", {
  serialize: (value: unknown) => value,
  parseValue: (value: unknown): unknown => value,
});

builder.scalarType("Decimal", {
  serialize: (value: unknown) => {
    if (value === null || value === undefined) {
      return null;
    }
    return String(value);
  },
  parseValue: (value: unknown): string => {
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    throw new Error("Valor decimal inválido");
  },
});

builder.queryType();
builder.mutationType();
