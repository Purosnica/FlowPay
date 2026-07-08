// GraphQL queries y mutations para configuración del sistema

export const LIST_CONFIGURACIONES = /* GraphQL */ `
  query ConfiguracionesSistema($categoria: String) {
    configuracionesSistema(categoria: $categoria) {
      idconfiguracion
      clave
      valor
      tipo
      descripcion
      categoria
      idusuarioMod
      createdAt
      updatedAt
      usuarioMod {
        idusuario
        nombre
      }
    }
  }
`;

export const GET_CONFIGURACION = /* GraphQL */ `
  query ConfiguracionSistema($clave: String!) {
    configuracionSistema(clave: $clave) {
      idconfiguracion
      clave
      valor
      tipo
      descripcion
      categoria
      idusuarioMod
      updatedAt
    }
  }
`;

export const UPDATE_CONFIGURACION = /* GraphQL */ `
  mutation UpdateConfiguracionSistema($input: UpdateConfiguracionInput!) {
    updateConfiguracionSistema(input: $input) {
      idconfiguracion
      clave
      valor
      tipo
      updatedAt
    }
  }
`;

export const BULK_UPDATE_CONFIGURACION = /* GraphQL */ `
  mutation BulkUpdateConfiguracionSistema($input: BulkUpdateConfiguracionInput!) {
    bulkUpdateConfiguracionSistema(input: $input) {
      idconfiguracion
      clave
      valor
      tipo
      updatedAt
    }
  }
`;
