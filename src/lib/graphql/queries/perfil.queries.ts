export const GET_MI_PERFIL = `
  query GetMiPerfil {
    miPerfil {
      idusuario
      nombre
      email
      telefono
      ultimoAcceso
      rol {
        idrol
        codigo
        descripcion
      }
    }
  }
`;

export const ACTUALIZAR_MI_PERFIL = `
  mutation ActualizarMiPerfil($input: UpdatePerfilInput!) {
    actualizarMiPerfil(input: $input) {
      idusuario
      nombre
      email
      telefono
    }
  }
`;
