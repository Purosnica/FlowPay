import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { ROL } from '@/lib/permissions/role-codes';
import { assertPuedeAsignarRol } from '@/lib/logic/rol-privilege-logic';
import type {
  CreateUsuarioInput,
  UpdateUsuarioInput,
} from '@/lib/validators/usuario';

async function obtenerCodigoRol(idrol: number): Promise<string | null> {
  const rol = await prisma.tbl_rol.findFirst({
    where: { idrol, estado: true, deletedAt: null },
  });
  return rol?.codigo ?? null;
}

async function obtenerCodigoRolActor(
  idusuarioActor: number,
): Promise<string | null> {
  const actor = await prisma.tbl_usuario.findFirst({
    where: { idusuario: idusuarioActor, deletedAt: null },
    include: { rol: { select: { codigo: true } } },
  });
  return actor?.rol.codigo ?? null;
}

async function validarJerarquiaSupervisor(params: {
  idrol: number;
  idsupervisor: number | null | undefined;
  idusuarioExcluir?: number;
  requerirParaSupervisor?: boolean;
}): Promise<void> {
  const {
    idrol,
    idsupervisor,
    idusuarioExcluir,
    requerirParaSupervisor = false,
  } = params;

  const codigoRol = await obtenerCodigoRol(idrol);
  if (!codigoRol) {
    throw new Error('El rol seleccionado no existe o está inactivo');
  }

  const esSupervisor = codigoRol === ROL.SUPERVISOR;
  const esCobrador = codigoRol === ROL.COBRADOR;

  if (!esSupervisor && !esCobrador) {
    return;
  }

  if (idsupervisor == null) {
    if (requerirParaSupervisor && esSupervisor) {
      throw new Error(
        'Un supervisor debe reportar a un gerente o administrador',
      );
    }
    return;
  }

  if (idusuarioExcluir !== undefined && idsupervisor === idusuarioExcluir) {
    throw new Error('Un usuario no puede reportar a sí mismo');
  }

  const superior = await prisma.tbl_usuario.findFirst({
    where: {
      idusuario: idsupervisor,
      activo: true,
      deletedAt: null,
    },
    include: { rol: { select: { codigo: true } } },
  });

  if (!superior) {
    throw new Error('El superior asignado no existe o está inactivo');
  }

  const codigoSuperior = superior.rol.codigo;

  if (esSupervisor) {
    if (codigoSuperior !== ROL.GERENTE && codigoSuperior !== ROL.ADMIN) {
      throw new Error(
        'Un supervisor debe reportar a un gerente o administrador',
      );
    }
    return;
  }

  if (
    codigoSuperior !== ROL.SUPERVISOR &&
    codigoSuperior !== ROL.GERENTE &&
    codigoSuperior !== ROL.ADMIN
  ) {
    throw new Error(
      'Un cobrador debe reportar a un supervisor, gerente o administrador',
    );
  }
}

export async function crearUsuario(
  data: CreateUsuarioInput,
  idusuarioActor: number,
) {
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

  const codigoActor = await obtenerCodigoRolActor(idusuarioActor);
  assertPuedeAsignarRol({
    codigoActor,
    codigoRolObjetivo: rol.codigo,
  });

  await validarJerarquiaSupervisor({
    idrol: data.idrol,
    idsupervisor: data.idsupervisor,
    requerirParaSupervisor: true,
  });

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
    include: { rol: { select: { codigo: true } } },
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

  const idrolFinal = data.idrol ?? usuario.idrol;
  const codigoActor = await obtenerCodigoRolActor(idusuarioActual);

  if (data.idrol) {
    const rol = await prisma.tbl_rol.findFirst({
      where: { idrol: data.idrol, estado: true, deletedAt: null },
    });

    if (!rol) {
      throw new Error('El rol seleccionado no existe o está inactivo');
    }

    assertPuedeAsignarRol({
      codigoActor,
      codigoRolObjetivo: rol.codigo,
    });
  }

  // No permitir que un no-ADMIN edite un ADMIN existente.
  if (
    usuario.rol.codigo === ROL.ADMIN &&
    codigoActor !== ROL.ADMIN
  ) {
    throw new Error('Solo un administrador puede modificar usuarios ADMIN.');
  }

  if (data.activo === false && data.idusuario === idusuarioActual) {
    throw new Error('No puede desactivar su propio usuario');
  }

  const idsupervisorFinal =
    data.idsupervisor !== undefined
      ? data.idsupervisor
      : usuario.idsupervisor;

  await validarJerarquiaSupervisor({
    idrol: idrolFinal,
    idsupervisor: idsupervisorFinal,
    idusuarioExcluir: data.idusuario,
    requerirParaSupervisor: true,
  });

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
