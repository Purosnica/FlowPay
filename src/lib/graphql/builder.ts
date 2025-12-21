import PrismaPlugin from "@pothos/plugin-prisma";
import ZodPlugin from "@pothos/plugin-zod";
import SchemaBuilder from "@pothos/core";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
  PrismaTypes: {
    PrismaClient: typeof prisma;
  };
  Scalars: {
    DateTime: {
      Input: Date;
      Output: Date;
    };
    JSON: {
      Input: any;
      Output: any;
    };
  };
}>({
  plugins: [PrismaPlugin, ZodPlugin],
  prisma: {
    client: prisma,
    dmmf: Prisma.dmmf,
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
  serialize: (value: any) => value,
  parseValue: (value: unknown): any => value,
});

builder.queryType();
builder.mutationType();
