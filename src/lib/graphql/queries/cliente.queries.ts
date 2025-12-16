// GraphQL queries para clientes

export const GET_CLIENTE = `
  query GetCliente($id: Int!) {
    cliente(id: $id) {
      idcliente
      primer_nombres
      segundo_nombres
      primer_apellido
      segundo_apellido
      fechanacimiento
      numerodocumento
      fechavencimientodoc
      direccion
      ciudad
      codigopostal
      telefono
      celular
      email
      sitioweb
      espep
      observaciones
      estado
      createdAt
      updatedAt
      tipodocumento {
        idtipodocumento
        descripcion
      }
      genero {
        idgenero
        descripcion
      }
      estadocivil {
        idestadocivil
        descripcion
      }
      ocupacion {
        idocupacion
        descripcion
      }
      tipopersona {
        idtipopersona
        descripcion
      }
      pais {
        idpais
        descripcion
      }
      departamento {
        iddepartamento
        descripcion
        pais {
          idpais
          descripcion
        }
      }
    }
  }
`;

export const GET_CLIENTES = `
  query GetClientes($page: Int, $pageSize: Int, $filters: ClienteFiltersInput) {
    clientes(page: $page, pageSize: $pageSize, filters: $filters) {
      clientes {
        idcliente
        primer_nombres
        segundo_nombres
        primer_apellido
        segundo_apellido
        fechanacimiento
        numerodocumento
        fechavencimientodoc
        direccion
        ciudad
        codigopostal
        telefono
        celular
        email
        sitioweb
        espep
        observaciones
        estado
        createdAt
        updatedAt
        tipodocumento {
          idtipodocumento
          descripcion
        }
        genero {
          idgenero
          descripcion
        }
        estadocivil {
          idestadocivil
          descripcion
        }
        ocupacion {
          idocupacion
          descripcion
        }
        tipopersona {
          idtipopersona
          descripcion
        }
        pais {
          idpais
          descripcion
        }
        departamento {
          iddepartamento
          descripcion
        }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const CREATE_CLIENTE = `
  mutation CreateCliente($input: CreateClienteInput!) {
    createCliente(input: $input) {
      idcliente
      primer_nombres
      segundo_nombres
      primer_apellido
      segundo_apellido
      numerodocumento
      email
      estado
      tipodocumento {
        idtipodocumento
        descripcion
      }
      tipopersona {
        idtipopersona
        descripcion
      }
      pais {
        idpais
        descripcion
      }
    }
  }
`;

export const UPDATE_CLIENTE = `
  mutation UpdateCliente($input: UpdateClienteInput!) {
    updateCliente(input: $input) {
      idcliente
      primer_nombres
      segundo_nombres
      primer_apellido
      segundo_apellido
      numerodocumento
      email
      estado
      tipodocumento {
        idtipodocumento
        descripcion
      }
      tipopersona {
        idtipopersona
        descripcion
      }
      pais {
        idpais
        descripcion
      }
    }
  }
`;

export const DELETE_CLIENTE = `
  mutation DeleteCliente($id: Int!) {
    deleteCliente(id: $id) {
      idcliente
      primer_nombres
      primer_apellido
    }
  }
`;

// Queries para catálogos
export const GET_TIPOS_DOCUMENTO = `
  query GetTiposDocumento($estado: Boolean) {
    tiposDocumento(estado: $estado) {
      idtipodocumento
      descripcion
      estado
    }
  }
`;

export const GET_GENEROS = `
  query GetGeneros($estado: Boolean) {
    generos(estado: $estado) {
      idgenero
      descripcion
      estado
    }
  }
`;

export const GET_ESTADOS_CIVILES = `
  query GetEstadosCiviles($estado: Boolean) {
    estadosCiviles(estado: $estado) {
      idestadocivil
      descripcion
      estado
    }
  }
`;

export const GET_OCUPACIONES = `
  query GetOcupaciones($estado: Boolean) {
    ocupaciones(estado: $estado) {
      idocupacion
      descripcion
      estado
    }
  }
`;

export const GET_TIPOS_PERSONA = `
  query GetTiposPersona($estado: Boolean) {
    tiposPersona(estado: $estado) {
      idtipopersona
      descripcion
      estado
    }
  }
`;

export const GET_PAISES = `
  query GetPaises($estado: Boolean) {
    paises(estado: $estado) {
      idpais
      codepais
      descripcion
      estado
    }
  }
`;

export const GET_DEPARTAMENTOS = `
  query GetDepartamentos($idpais: Int, $estado: Boolean) {
    departamentos(idpais: $idpais, estado: $estado) {
      iddepartamento
      idpais
      descripcion
      estado
      pais {
        idpais
        descripcion
      }
    }
  }
`;




