import PrismaPlugin from "@pothos/plugin-prisma";
import ValidationPlugin from "@pothos/plugin-validation";
import ZodPlugin from "@pothos/plugin-zod";
import SchemaBuilder from "@pothos/core";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Tipos para el contexto
export interface GraphQLContext {
  prisma: typeof prisma;
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
  };
}>({
  plugins: [PrismaPlugin, ValidationPlugin, ZodPlugin],
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

builder.queryType();
builder.mutationType();
