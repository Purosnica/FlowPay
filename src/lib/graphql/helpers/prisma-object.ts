import type { Prisma } from '@prisma/client';
import { builder } from '../builder';

interface PrismaObjectConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: (t: any) => any;
  name?: string;
}

/**
 * Wrapper tipado para builder.prismaObject con PrismaTypes generados.
 */
export function definePrismaObject(
  modelName: Prisma.ModelName,
  options: PrismaObjectConfig,
) {
  return builder.prismaObject(modelName, options);
}
