import type { ComponentType } from 'react';
import type { PermisoCodigo } from '@/lib/permissions/permiso-codes';

export interface NavSubItem {
  title: string;
  url: string;
  permiso?: PermisoCodigo | string;
  permisos?: (PermisoCodigo | string)[];
}

export interface NavItem {
  title: string;
  url?: string;
  icon?: ComponentType<{ className?: string }>;
  items?: NavSubItem[];
  permiso?: PermisoCodigo | string;
  permisos?: (PermisoCodigo | string)[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

function puedeVer(
  permisosUsuario: string[],
  permiso?: string,
  permisos?: string[],
): boolean {
  if (!permiso && (!permisos || permisos.length === 0)) {
    return true;
  }
  if (permiso && permisosUsuario.includes(permiso)) {
    return true;
  }
  if (permisos?.some((p) => permisosUsuario.includes(p))) {
    return true;
  }
  return false;
}

export function filtrarNavPorPermisos(
  sections: NavSection[],
  permisosUsuario: string[],
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => {
          if (item.items?.length) {
            const subItems = item.items.filter((sub) =>
              puedeVer(permisosUsuario, sub.permiso, sub.permisos),
            );
            if (subItems.length === 0) {
              return null;
            }
            return { ...item, items: subItems };
          }
          if (!puedeVer(permisosUsuario, item.permiso, item.permisos)) {
            return null;
          }
          return item;
        })
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((section) => section.items.length > 0);
}
