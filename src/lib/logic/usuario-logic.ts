import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import type {
  CreateUsuarioInput,
  UpdateUsuarioInput,
} from '@/lib/validators/usuario';

export async function crearUsuario(data: CreateUsuarioInput) {
  const emailExiste = await prisma.tbl_usuario.findFirst({
    where: { email: data.email, deletedAt: null },
  });

  if (emailExiste) {
    throw new Error('Ya existe un usuario con ese email');
  }

  const rol = await prisma.tbl_rol.findFirst({
    where: { idrol: data.idrol, estado: true, deletedAt: null },
  });

  if (!rol) {
    throw new Error('El rol seleccionado no existe o está inactivo');
  }

  const { hash, salt } = await hashPassword(data.password);

  return prisma.tbl_usuario.create({
    data: {
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono ?? null,
      idrol: data.idrol,
      porcentajeComision: data.porcentajeComision,
      passwordHash: hash,
      salt,
      activo: data.activo,
      idsupervisor: data.idsupervisor ?? null,
    },
    include: {
      rol: {
        select: { idrol: true, codigo: true, descripcion: true, estado: true },
      },
    },
  });
}

export async function actualizarUsuario(
  data: UpdateUsuarioInput,
  idusuarioActual: number,
) {
  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario: data.idusuario, deletedAt: null },
  });

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  if (data.email && data.email !== usuario.email) {
    const emailExiste = await prisma.tbl_usuario.findFirst({
      where: {
        email: data.email,
        deletedAt: null,
        NOT: { idusuario: data.idusuario },
      },
    });

    if (emailExiste) {
      throw new Error('Ya existe un usuario con ese email');
    }
  }

  if (data.idrol) {
    const rol = await prisma.tbl_rol.findFirst({
      where: { idrol: data.idrol, estado: true, deletedAt: null },
    });

    if (!rol) {
      throw new Error('El rol seleccionado no existe o está inactivo');
    }
  }

  if (data.activo === false && data.idusuario === idusuarioActual) {
    throw new Error('No puede desactivar su propio usuario');
  }

  const updateData: {
    nombre?: string;
    email?: string;
    telefono?: string | null;
    idrol?: number;
    porcentajeComision?: number;
    activo?: boolean;
    passwordHash?: string;
    salt?: string;
    idsupervisor?: number | null;
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
  if (data.idrol !== undefined) {
    updateData.idrol = data.idrol;
  }
  if (data.porcentajeComision !== undefined) {
    updateData.porcentajeComision = data.porcentajeComision;
  }
  if (data.activo !== undefined) {
    updateData.activo = data.activo;
  }
  if (data.idsupervisor !== undefined) {
    updateData.idsupervisor = data.idsupervisor;
  }

  if (data.password) {
    const { hash, salt } = await hashPassword(data.password);
    updateData.passwordHash = hash;
    updateData.salt = salt;
  }

  return prisma.tbl_usuario.update({
    where: { idusuario: data.idusuario },
    data: updateData,
    include: {
      rol: {
        select: { idrol: true, codigo: true, descripcion: true, estado: true },
      },
    },
  });
}

export async function cambiarEstadoUsuario(
  idusuario: number,
  activo: boolean,
  idusuarioActual: number,
) {
  if (idusuario === idusuarioActual && !activo) {
    throw new Error('No puede desactivar su propio usuario');
  }

  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario, deletedAt: null },
  });

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  return prisma.tbl_usuario.update({
    where: { idusuario },
    data: { activo },
    include: {
      rol: {
        select: { idrol: true, codigo: true, descripcion: true, estado: true },
      },
    },
  });
}
