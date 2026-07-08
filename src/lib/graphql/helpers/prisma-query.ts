/**
 * Helpers para spreads de query Prisma en resolvers Pothos.
 */
export function spreadPrismaQuery(
  query: unknown,
): Record<string, unknown> {
  return query as Record<string, unknown>;
}
