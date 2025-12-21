/**
 * SERVICIO DE PERMISOS (RBAC)
 * 
 * Este servicio implementa un sistema de permisos dinámico basado en roles (RBAC).
 * Los permisos se almacenan en la base de datos y se validan dinámicamente.
 * 
 * ESTRUCTURA:
 * - tbl_permiso: Catálogo de permisos disponibles
 * - tbl_rol_permiso: Relación muchos a muchos entre roles y permisos
 * - tbl_rol: Roles del sistema
 * - tbl_usuario: Usuarios con un rol asignado
 * 
 * FLUJO DE VALIDACIÓN:
 * 1. Usuario intenta realizar una operación
 * 2. Sistema obtiene el rol del usuario
 * 3. Sistema obtiene los permisos asociados al rol
 * 4. Sistema verifica si el permiso requerido está en la lista
 * 5. Si tiene permiso: permite la operación
 * 6. Si no tiene permiso: rechaza con error
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/utils/logger";

export type PermisoCodigo =
  | "CREATE_LOAN"
  | "EDIT_LOAN"
  | "DELETE_LOAN"
  | "VIEW_LOAN"
  | "APPLY_PAYMENT"
  | "EDIT_PAYMENT"
  | "DELETE_PAYMENT"
  | "VIEW_PAYMENT"
  | "MANAGE_COLLECTION"
  | "VIEW_REPORTS"
  | "CONFIG_SYSTEM"
  | "RESTRUCTURE_LOAN"
  | "ASSIGN_MANAGER"
  | "VIEW_PORTFOLIO"
  | "MANAGE_DOCUMENTS"
  | "MANAGE_THIRD_PARTY";

/**
 * Verifica si un usuario tiene un permiso específico
 * 
 * @param idusuario ID del usuario
 * @param codigoPermiso Código del permiso a verificar
 * @returns true si el usuario tiene el permiso, false en caso contrario
 */
export async function tienePermiso(
  idusuario: number | null | undefined,
  codigoPermiso: PermisoCodigo | string
): Promise<boolean> {
  if (!idusuario) {
    return false; // Usuario no autenticado
  }

  try {
    // 1. Obtener usuario con su rol
    const usuario = await prisma.tbl_usuario.findUnique({
      where: { idusuario },
      include: {
        rol: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
              where: {
                permiso: {
                  estado: true,
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
    });

    if (!usuario || !usuario.activo || usuario.deletedAt) {
      return false; // Usuario no existe, inactivo o eliminado
    }

    if (!usuario.rol || !usuario.rol.estado || usuario.rol.deletedAt) {
      return false; // Rol no existe, inactivo o eliminado
    }

    // 2. Verificar si el rol tiene el permiso
    const tienePermiso = usuario.rol.permisos.some(
      (rp) => rp.permiso.codigo === codigoPermiso && rp.permiso.estado && !rp.permiso.deletedAt
    );

    return tienePermiso;
  } catch (error) {
    logger.error("Error al verificar permiso", error instanceof Error ? error : undefined, {
      idusuario,
      codigoPermiso,
    });
    return false; // En caso de error, denegar acceso
  }
}

/**
 * Verifica si un usuario tiene al menos uno de los permisos especificados
 * 
 * @param idusuario ID del usuario
 * @param codigosPermisos Array de códigos de permisos
 * @returns true si el usuario tiene al menos uno de los permisos
 */
export async function tieneAlgunPermiso(
  idusuario: number | null | undefined,
  codigosPermisos: (PermisoCodigo | string)[]
): Promise<boolean> {
  if (!idusuario || codigosPermisos.length === 0) {
    return false;
  }

  // Verificar cada permiso hasta encontrar uno que tenga
  for (const codigo of codigosPermisos) {
    if (await tienePermiso(idusuario, codigo)) {
      return true;
    }
  }

  return false;
}

/**
 * Verifica si un usuario tiene todos los permisos especificados
 * 
 * @param idusuario ID del usuario
 * @param codigosPermisos Array de códigos de permisos
 * @returns true si el usuario tiene todos los permisos
 */
export async function tieneTodosLosPermisos(
  idusuario: number | null | undefined,
  codigosPermisos: (PermisoCodigo | string)[]
): Promise<boolean> {
  if (!idusuario || codigosPermisos.length === 0) {
    return false;
  }

  // Verificar que tenga todos los permisos
  for (const codigo of codigosPermisos) {
    if (!(await tienePermiso(idusuario, codigo))) {
      return false;
    }
  }

  return true;
}

/**
 * Obtiene todos los permisos de un usuario (a través de su rol)
 * 
 * @param idusuario ID del usuario
 * @returns Array de códigos de permisos del usuario
 */
export async function obtenerPermisosUsuario(
  idusuario: number | null | undefined
): Promise<string[]> {
  if (!idusuario) {
    return [];
  }

  try {
    const usuario = await prisma.tbl_usuario.findUnique({
      where: { idusuario },
      include: {
        rol: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
              where: {
                permiso: {
                  estado: true,
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
    });

    if (!usuario || !usuario.activo || !usuario.rol || !usuario.rol.estado) {
      return [];
    }

    return usuario.rol.permisos.map((rp) => rp.permiso.codigo);
  } catch (error) {
    logger.error("Error al obtener permisos del usuario", error instanceof Error ? error : undefined, {
      idusuario,
    });
    return [];
  }
}

/**
 * Obtiene todos los permisos disponibles en el sistema
 * 
 * @returns Array de permisos con su información
 */
export async function obtenerTodosLosPermisos() {
  try {
    return await prisma.tbl_permiso.findMany({
      where: {
        estado: true,
        deletedAt: null,
      },
      orderBy: {
        categoria: "asc",
        codigo: "asc",
      },
    });
  } catch (error) {
    logger.error("Error al obtener todos los permisos", error instanceof Error ? error : undefined);
    return [];
  }
}

/**
 * Obtiene los permisos de un rol específico
 * 
 * @param idrol ID del rol
 * @returns Array de códigos de permisos del rol
 */
export async function obtenerPermisosRol(idrol: number): Promise<string[]> {
  try {
    const rol = await prisma.tbl_rol.findUnique({
      where: { idrol },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
          where: {
            permiso: {
              estado: true,
              deletedAt: null,
            },
          },
        },
      },
    });

    if (!rol || !rol.estado) {
      return [];
    }

    return rol.permisos.map((rp) => rp.permiso.codigo);
  } catch (error) {
    logger.error("Error al obtener permisos del rol", error instanceof Error ? error : undefined, {
      idrol,
    });
    return [];
  }
}

/**
 * Asigna un permiso a un rol
 * 
 * @param idrol ID del rol
 * @param idpermiso ID del permiso
 * @returns true si se asignó correctamente
 */
export async function asignarPermisoARol(
  idrol: number,
  idpermiso: number
): Promise<boolean> {
  try {
    await prisma.tbl_rol_permiso.upsert({
      where: {
        idrol_idpermiso: {
          idrol,
          idpermiso,
        },
      },
      create: {
        idrol,
        idpermiso,
      },
      update: {},
    });

    return true;
  } catch (error) {
    logger.error("Error al asignar permiso a rol", error instanceof Error ? error : undefined, {
      idrol,
      idpermiso,
    });
    return false;
  }
}

/**
 * Remueve un permiso de un rol
 * 
 * @param idrol ID del rol
 * @param idpermiso ID del permiso
 * @returns true si se removió correctamente
 */
export async function removerPermisoDeRol(
  idrol: number,
  idpermiso: number
): Promise<boolean> {
  try {
    await prisma.tbl_rol_permiso.delete({
      where: {
        idrol_idpermiso: {
          idrol,
          idpermiso,
        },
      },
    });

    return true;
  } catch (error) {
    logger.error("Error al remover permiso de rol", error instanceof Error ? error : undefined, {
      idrol,
      idpermiso,
    });
    return false;
  }
}

/**
 * Crea un nuevo permiso en el sistema
 * 
 * @param codigo Código único del permiso
 * @param nombre Nombre legible del permiso
 * @param descripcion Descripción del permiso
 * @param categoria Categoría del permiso
 * @returns El permiso creado o null si hubo error
 */
export async function crearPermiso(
  codigo: string,
  nombre: string,
  descripcion?: string,
  categoria?: string
) {
  try {
    return await prisma.tbl_permiso.create({
      data: {
        codigo,
        nombre,
        descripcion,
        categoria,
        estado: true,
      },
    });
  } catch (error) {
    logger.error("Error al crear permiso", error instanceof Error ? error : undefined, {
      codigo,
      nombre,
    });
    return null;
  }
}

/**
 * Helper para lanzar error si no tiene permiso
 * Útil para usar en mutations GraphQL
 * 
 * @param idusuario ID del usuario
 * @param codigoPermiso Código del permiso requerido
 * @throws Error si no tiene permiso
 */
export async function requerirPermiso(
  idusuario: number | null | undefined,
  codigoPermiso: PermisoCodigo | string
): Promise<void> {
  const tiene = await tienePermiso(idusuario, codigoPermiso);

  if (!tiene) {
    throw new Error(
      `No tienes permiso para realizar esta operación. Permiso requerido: ${codigoPermiso}`
    );
  }
}

/**
 * Helper para lanzar error si no tiene al menos uno de los permisos
 * 
 * @param idusuario ID del usuario
 * @param codigosPermisos Array de códigos de permisos
 * @throws Error si no tiene ninguno de los permisos
 */
export async function requerirAlgunPermiso(
  idusuario: number | null | undefined,
  codigosPermisos: (PermisoCodigo | string)[]
): Promise<void> {
  const tiene = await tieneAlgunPermiso(idusuario, codigosPermisos);

  if (!tiene) {
    throw new Error(
      `No tienes permiso para realizar esta operación. Permisos requeridos: ${codigosPermisos.join(", ")}`
    );
  }
}




