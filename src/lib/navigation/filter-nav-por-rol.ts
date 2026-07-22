/**
 * Reduce el menú para rol cobrador (menos Hick en navegación diaria).
 */

import { esRolCobrador } from '@/lib/permissions/role-codes';
import type { NavSection } from '@/lib/navigation/filter-nav-by-permisos';

/** Rutas diarias del cobrador; el resto se oculta en sidebar. */
const URLS_COBRADOR = new Set([
  '/dashboard',
  '/cobranza/mi-dia',
  '/cobranza/bandeja',
  '/cobranza/gestiones',
  '/cobranza/reclamos',
  '/clientes',
]);

function subItemPermitido(url: string): boolean {
  return URLS_COBRADOR.has(url);
}

export function filtrarNavPorRol(
  sections: NavSection[],
  rolCodigo: string | null | undefined,
): NavSection[] {
  if (!esRolCobrador(rolCodigo)) {
    return sections;
  }

  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => {
          if (item.items?.length) {
            const subItems = item.items.filter((sub) =>
              subItemPermitido(sub.url),
            );
            if (subItems.length === 0) {
              return null;
            }
            return { ...item, items: subItems };
          }
          if (item.url && !subItemPermitido(item.url)) {
            return null;
          }
          return item;
        })
        .filter((item): item is (typeof section.items)[number] => item !== null),
    }))
    .filter((section) => section.items.length > 0);
}
