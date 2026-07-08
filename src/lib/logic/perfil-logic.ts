import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, simpleHash } from '@/lib/auth/password';
import type { UpdatePerfilInput } from '@/lib/validators/usuario/perfil';

export async function obtenerMiPerfil(idusuario: number) {
  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario, activo: true, deletedAt: null },
    include: {
      rol: {
        select: {
          idrol: true,
          codigo: true,
          descripcion: true,
        },
      },
    },
  });

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  return usuario;
}

export async function actualizarMiPerfil(
  idusuario: number,
  data: UpdatePerfilInput,
) {
  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario, activo: true, deletedAt: null },
  });

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  if (data.email && data.email !== usuario.email) {
    const emailExiste = await prisma.tbl_usuario.findFirst({
      where: {
        email: data.email,
        deletedAt: null,
        NOT: { idusuario },
      },
    });

    if (emailExiste) {
      throw new Error('Ya existe un usuario con ese email');
    }
  }

  const updateData: {
    nombre?: string;
    email?: string;
    telefono?: string | null;
    passwordHash?: string;
    salt?: string;
  } = {};

  if (data.nombre !== undefined) {
    updateData.nombre = data.nombre;
  }
  if (data.email !== undefined) {
    updateData.email = data.email;
  }
  if (data.telefono !== undefined) {
    updateData.telefono = data.telefono;
  }

  if (data.passwordNueva) {
    if (!data.passwordActual) {
      throw new Error('Debe ingresar su contraseña actual');
    }

    let passwordValid = false;

    if (usuario.passwordHash) {
      passwordValid = await verifyPassword(
        data.passwordActual,
        usuario.passwordHash,
        usuario.salt ?? '',
      );
    } else if (usuario.password) {
      passwordValid = simpleHash(data.passwordActual) === usuario.password;
    }

    if (!passwordValid) {
      throw new Error('La contraseña actual es incorrecta');
    }

    const { hash, salt } = await hashPassword(data.passwordNueva);
    updateData.passwordHash = hash;
    updateData.salt = salt;
  }

  return prisma.tbl_usuario.update({
    where: { idusuario },
    data: updateData,
    include: {
      rol: {
        select: {
          idrol: true,
          codigo: true,
          descripcion: true,
        },
      },
    },
  });
}
