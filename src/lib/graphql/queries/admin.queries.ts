export const GET_USUARIOS = `
  query GetUsuarios($page: Int, $pageSize: Int) {
    usuarios(page: $page, pageSize: $pageSize) {
      usuarios {
        idusuario
        nombre
        email
        telefono
        porcentajeComision
        activo
        idrol
        ultimoAcceso
        idsupervisor
        rol {
          idrol
          codigo
          descripcion
          estado
        }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_ROLES = `
  query GetRoles($page: Int, $pageSize: Int) {
    roles(page: $page, pageSize: $pageSize) {
      roles {
        idrol
        codigo
        descripcion
        estado
        permisos
        cantidadUsuarios
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_ROLES_ACTIVOS = `
  query GetRolesActivos {
    rolesActivos {
      idrol
      codigo
      descripcion
      estado
    }
  }
`;

export const GET_PERMISOS_CATALOGO = `
  query GetPermisosCatalogo {
    permisosCatalogo {
      idpermiso
      codigo
      nombre
      descripcion
      categoria
    }
  }
`;

export const GET_SUPERVISORES_ACTIVOS = `
  query GetSupervisoresActivos {
    supervisoresActivos {
      idusuario
      nombre
      email
      idrol
    }
  }
`;

export const CREATE_USUARIO = `
  mutation CreateUsuario($input: CreateUsuarioInput!) {
    createUsuario(input: $input) {
      idusuario
      nombre
      email
    }
  }
`;

export const UPDATE_USUARIO = `
  mutation UpdateUsuario($input: UpdateUsuarioInput!) {
    updateUsuario(input: $input) {
      idusuario
      nombre
      email
      activo
    }
  }
`;

export const SET_USUARIO_ACTIVO = `
  mutation SetUsuarioActivo($idusuario: Int!, $activo: Boolean!) {
    setUsuarioActivo(idusuario: $idusuario, activo: $activo) {
      idusuario
      activo
    }
  }
`;

export const CREATE_ROL = `
  mutation CreateRol($input: CreateRolInput!) {
    createRol(input: $input) {
      idrol
      codigo
      descripcion
    }
  }
`;

export const UPDATE_ROL = `
  mutation UpdateRol($input: UpdateRolInput!) {
    updateRol(input: $input) {
      idrol
      codigo
      descripcion
      estado
    }
  }
`;

export const SET_PERMISOS_ROL = `
  mutation SetPermisosRol($input: SetPermisosRolInput!) {
    setPermisosRol(input: $input) {
      idrol
      permisos
    }
  }
`;
