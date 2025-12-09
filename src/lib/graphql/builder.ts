import PrismaPlugin from "@pothos/plugin-prisma";
import ValidationPlugin from "@pothos/plugin-validation";
import ZodPlugin from "@pothos/plugin-zod";
import SchemaBuilder from "@pothos/core";
import type PrismaTypes from "@pothos/plugin-prisma/generated";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const builder = new SchemaBuilder<{
  PrismaTypes: PrismaTypes;
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
  },
  validationOptions: {
    // Configuración de validación
  },
});

// Agregar scalar DateTime
builder.scalarType("DateTime", {
  serialize: (date) => date.toISOString(),
  parseValue: (date) => {
    if (typeof date === "string") {
      return new Date(date);
    }
    return date;
  },
});

builder.queryType();
builder.mutationType();
