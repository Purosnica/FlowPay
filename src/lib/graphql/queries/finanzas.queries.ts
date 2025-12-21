// Mutations
export const CREATE_PRESTAMO = /* GraphQL */ `
  mutation CreatePrestamo($input: CreatePrestamoInput!) {
    createPrestamo(input: $input) {
      idprestamo
      codigo
      estado
      tipoprestamo
      idcliente
    }
  }
`;

export const UPDATE_PRESTAMO = /* GraphQL */ `
  mutation UpdatePrestamo($input: UpdatePrestamoInput!) {
    updatePrestamo(input: $input) {
      idprestamo
      codigo
      estado
      tipoprestamo
      idcliente
    }
  }
`;

export const CREATE_PAGO = /* GraphQL */ `
  mutation CreatePago($input: CreatePagoInput!) {
    createPago(input: $input) {
      idpago
      idprestamo
      idcuota
      montoTotal
      metodoPago
      fechaPago
    }
  }
`;

export const UPDATE_PAGO = /* GraphQL */ `
  mutation UpdatePago($input: UpdatePagoInput!) {
    updatePago(input: $input) {
      idpago
      idprestamo
      idcuota
      montoTotal
      metodoPago
      fechaPago
    }
  }
`;

// Queries
export const LIST_CLIENTES_COMBO = /* GraphQL */ `
  query ClientesCombo($page: Int, $pageSize: Int, $filters: ClienteFiltersInput) {
    clientes(page: $page, pageSize: $pageSize, filters: $filters) {
      clientes {
        idcliente
        primer_nombres
        primer_apellido
        numerodocumento
      }
    }
  }
`;

export const LIST_PRESTAMOS_COMBO = /* GraphQL */ `
  query PrestamosCombo($filters: PrestamoFiltersInput) {
    prestamos(filters: $filters) {
      prestamos {
        idprestamo
        codigo
        idcliente
        estado
      }
    }
  }
`;

export const LIST_PRESTAMOS = /* GraphQL */ `
  query Prestamos($filters: PrestamoFiltersInput) {
    prestamos(filters: $filters) {
      prestamos {
        idprestamo
        codigo
        referencia
        estado
        tipoprestamo
        montoSolicitado
        montoAprobado
        montoDesembolsado
        fechaSolicitud
        fechaVencimiento
        cliente {
          idcliente
          primer_nombres
          primer_apellido
          numerodocumento
        }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

// ======================================================
// QUERIES Y MUTATIONS DOCUMENTOS
// ======================================================

export const CREATE_DOCUMENTO = /* GraphQL */ `
  mutation CreateDocumento($input: CreateDocumentoInput!) {
    createDocumento(input: $input) {
      iddocumento
      idprestamo
      tipo
      nombre
      nombreArchivo
      rutaArchivo
      version
      esVersionActual
      createdAt
    }
  }
`;

export const DELETE_DOCUMENTO = /* GraphQL */ `
  mutation DeleteDocumento($id: Int!, $idusuario: Int) {
    deleteDocumento(id: $id, idusuario: $idusuario) {
      iddocumento
      nombre
    }
  }
`;

export const GET_DOCUMENTO = /* GraphQL */ `
  query Documento($id: Int!, $idusuario: Int) {
    documento(id: $id, idusuario: $idusuario) {
      iddocumento
      idprestamo
      tipo
      nombre
      nombreArchivo
      rutaArchivo
      mimeType
      tamano
      version
      esVersionActual
      observaciones
      createdAt
      usuario {
        idusuario
        nombre
      }
    }
  }
`;

// ======================================================
// QUERIES REPORTES Y KPIs
// ======================================================

export const AGING_CARTERA = /* GraphQL */ `
  query AgingCartera($filters: ReporteFiltersInput) {
    agingCartera(filters: $filters) {
      items {
        rango
        diasMin
        diasMax
        cantidad
        monto
        porcentaje
      }
      total
      montoTotal
    }
  }
`;

export const RECUPERACION_REAL_VS_ESPERADA = /* GraphQL */ `
  query RecuperacionRealVsEsperada($filters: ReporteFiltersInput) {
    recuperacionRealVsEsperada(filters: $filters) {
      items {
        periodo
        montoEsperado
        montoReal
        porcentajeRecuperacion
        diferencia
      }
      montoTotalEsperado
      montoTotalReal
      porcentajeTotalRecuperacion
    }
  }
`;

export const RANKING_GESTORES = /* GraphQL */ `
  query RankingGestores($filters: ReporteFiltersInput) {
    rankingGestores(filters: $filters) {
      items {
        idusuario
        nombre
        email
        cantidadPrestamos
        montoTotal
        montoRecuperado
        porcentajeRecuperacion
        moraPromedio
        posicion
      }
      periodo
    }
  }
`;

export const MORA_PROMEDIO = /* GraphQL */ `
  query MoraPromedio($filters: ReporteFiltersInput) {
    moraPromedio(filters: $filters) {
      items {
        periodo
        moraPromedio
        cantidadPrestamos
        montoTotalMora
      }
      moraPromedioGeneral
    }
  }
`;

export const LIST_DOCUMENTOS_POR_PRESTAMO = /* GraphQL */ `
  query DocumentosPorPrestamo($idprestamo: Int!, $tipo: TipoDocumentoEnum, $soloVersionesActuales: Boolean, $idusuario: Int) {
    documentosPorPrestamo(
      idprestamo: $idprestamo
      tipo: $tipo
      soloVersionesActuales: $soloVersionesActuales
      idusuario: $idusuario
    ) {
      iddocumento
      tipo
      nombre
      nombreArchivo
      rutaArchivo
      mimeType
      tamano
      version
      esVersionActual
      observaciones
      createdAt
      usuario {
        idusuario
        nombre
      }
    }
  }
`;

export const HISTORIAL_DOCUMENTO = /* GraphQL */ `
  query HistorialDocumento($idprestamo: Int!, $tipo: TipoDocumentoEnum!, $idusuario: Int) {
    historialDocumento(idprestamo: $idprestamo, tipo: $tipo, idusuario: $idusuario) {
      iddocumento
      nombre
      nombreArchivo
      version
      esVersionActual
      tamano
      createdAt
      usuario {
        idusuario
        nombre
      }
    }
  }
`;

export const LIST_CUOTAS_POR_PRESTAMO = /* GraphQL */ `
  query CuotasPorPrestamo($idprestamo: Int!, $estado: EstadoCuotaEnum) {
    cuotasPorPrestamo(idprestamo: $idprestamo, estado: $estado) {
      cuotas {
        idcuota
        numero
        estado
        fechaVencimiento
      }
      total
    }
  }
`;

export const LIST_PAGOS_POR_PRESTAMO = /* GraphQL */ `
  query PagosPorPrestamo($idprestamo: Int!, $idcuota: Int) {
    pagosPorPrestamo(idprestamo: $idprestamo, idcuota: $idcuota) {
      pagos {
        idpago
        idprestamo
        idcuota
        idusuario
        metodoPago
        fechaPago
        referencia
        montoCapital
        montoInteres
        montoMora
        montoTotal
        notas
      }
      total
    }
  }
`;

// ======================================================
// QUERIES CARTERA
// ======================================================

export const LIST_CARTERA = /* GraphQL */ `
  query Cartera($filters: CarteraFiltersInput) {
    cartera(filters: $filters) {
      items {
        prestamo {
          idprestamo
          codigo
          referencia
          estado
          tipoprestamo
          montoSolicitado
          montoAprobado
          montoDesembolsado
          fechaSolicitud
          fechaVencimiento
          cliente {
            idcliente
            primer_nombres
            primer_apellido
            numerodocumento
          }
          usuarioGestor {
            idusuario
            nombre
            email
          }
        }
        diasAtraso
        saldoPendiente
        cuotaVencida {
          idcuota
          numero
          fechaVencimiento
          estado
          diasMoraAcumulados
        }
        nivelRiesgo
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const LIST_USUARIOS_COMBO = /* GraphQL */ `
  query UsuariosCombo {
    usuarios {
      usuarios {
        idusuario
        nombre
        email
      }
    }
  }
`;

// ======================================================
// MUTATIONS CARTERA
// ======================================================

export const ASIGNAR_GESTOR = /* GraphQL */ `
  mutation AsignarGestor($idprestamo: Int!, $idusuarioGestor: Int, $idusuarioMod: Int) {
    asignarGestor(idprestamo: $idprestamo, idusuarioGestor: $idusuarioGestor, idusuarioMod: $idusuarioMod) {
      idprestamo
      idusuarioGestor
      usuarioGestor {
        idusuario
        nombre
      }
    }
  }
`;

// ======================================================
// QUERIES Y MUTATIONS REESTRUCTURACIÓN
// ======================================================

export const REESTRUCTURAR_PRESTAMO = /* GraphQL */ `
  mutation ReestructurarPrestamo($input: CreateReestructuracionInput!) {
    reestructurarPrestamo(input: $input) {
      idreestructuracion
      idprestamoOriginal
      idprestamoNuevo
      idusuarioSolicitante
      idusuarioAutorizador
      motivo
      observaciones
      fechaReestructuracion
      prestamoOriginal {
        idprestamo
        codigo
        estado
        montoDesembolsado
      }
      prestamoNuevo {
        idprestamo
        codigo
        estado
        montoSolicitado
        montoAprobado
      }
      usuarioSolicitante {
        idusuario
        nombre
      }
      usuarioAutorizador {
        idusuario
        nombre
      }
    }
  }
`;

export const LIST_REESTRUCTURACIONES = /* GraphQL */ `
  query Reestructuraciones($filters: ReestructuracionFiltersInput) {
    reestructuraciones(filters: $filters) {
      reestructuraciones {
        idreestructuracion
        idprestamoOriginal
        idprestamoNuevo
        idusuarioSolicitante
        idusuarioAutorizador
        motivo
        observaciones
        fechaReestructuracion
        prestamoOriginal {
          idprestamo
          codigo
          estado
          montoDesembolsado
          cliente {
            idcliente
            primer_nombres
            primer_apellido
            numerodocumento
          }
        }
        prestamoNuevo {
          idprestamo
          codigo
          estado
          montoSolicitado
          montoAprobado
        }
        usuarioSolicitante {
          idusuario
          nombre
          email
        }
        usuarioAutorizador {
          idusuario
          nombre
          email
        }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_REESTRUCTURACION = /* GraphQL */ `
  query Reestructuracion($id: Int!) {
    reestructuracion(id: $id) {
      idreestructuracion
      idprestamoOriginal
      idprestamoNuevo
      idusuarioSolicitante
      idusuarioAutorizador
      motivo
      observaciones
      fechaReestructuracion
      prestamoOriginal {
        idprestamo
        codigo
        estado
        montoDesembolsado
        fechaVencimiento
        cliente {
          idcliente
          primer_nombres
          primer_apellido
          numerodocumento
        }
      }
      prestamoNuevo {
        idprestamo
        codigo
        estado
        montoSolicitado
        montoAprobado
        montoDesembolsado
        tasaInteresAnual
        plazoMeses
        fechaSolicitud
        fechaVencimiento
      }
      usuarioSolicitante {
        idusuario
        nombre
        email
      }
      usuarioAutorizador {
        idusuario
        nombre
        email
      }
    }
  }
`;

export const LIST_REESTRUCTURACIONES_POR_PRESTAMO = /* GraphQL */ `
  query ReestructuracionesPorPrestamo($idprestamo: Int!) {
    reestructuracionesPorPrestamo(idprestamo: $idprestamo) {
      idreestructuracion
      idprestamoOriginal
      idprestamoNuevo
      motivo
      fechaReestructuracion
      prestamoNuevo {
        idprestamo
        codigo
        estado
        montoSolicitado
        montoAprobado
      }
      usuarioSolicitante {
        idusuario
        nombre
      }
      usuarioAutorizador {
        idusuario
        nombre
      }
    }
  }
`;

// ======================================================
// QUERIES Y MUTATIONS LIQUIDACIÓN DE TERCEROS
// ======================================================

export const CREATE_LIQUIDACION_TERCERO = /* GraphQL */ `
  mutation CreateLiquidacionTercero($input: CreateLiquidacionTerceroInput!) {
    createLiquidacionTercero(input: $input) {
      idliquidacion
      idempresa
      codigo
      periodoDesde
      periodoHasta
      estado
      montoTotalComisiones
      numeroComisiones
      empresa {
        idempresa
        nombre
        codigo
      }
    }
  }
`;

export const UPDATE_LIQUIDACION_TERCERO = /* GraphQL */ `
  mutation UpdateLiquidacionTercero($input: UpdateLiquidacionTerceroInput!) {
    updateLiquidacionTercero(input: $input) {
      idliquidacion
      estado
      montoTotalLiquidado
      montoTotalPagado
      fechaLiquidacion
      fechaPago
    }
  }
`;

export const GET_LIQUIDACION_TERCERO = /* GraphQL */ `
  query LiquidacionTercero($id: Int!) {
    liquidacionTercero(id: $id) {
      idliquidacion
      idempresa
      codigo
      periodoDesde
      periodoHasta
      estado
      montoTotalComisiones
      montoTotalLiquidado
      montoTotalPagado
      fechaLiquidacion
      fechaPago
      numeroComisiones
      observaciones
      empresa {
        idempresa
        nombre
        codigo
        ruc
        contacto
        email
      }
      usuarioCreador {
        idusuario
        nombre
        email
      }
      usuarioAutorizador {
        idusuario
        nombre
        email
      }
      comisiones {
        idcomision
        idprestamo
        idpago
        fechaGeneracion
        montoBase
        montoComision
        descripcion
        prestamo {
          idprestamo
          codigo
          montoDesembolsado
        }
        pago {
          idpago
          fechaPago
          montoTotal
        }
      }
    }
  }
`;

export const LIST_LIQUIDACIONES_TERCERO = /* GraphQL */ `
  query LiquidacionesTercero($filters: LiquidacionTerceroFiltersInput) {
    liquidacionesTercero(filters: $filters) {
      liquidaciones {
        idliquidacion
        idempresa
        codigo
        periodoDesde
        periodoHasta
        estado
        montoTotalComisiones
        montoTotalLiquidado
        montoTotalPagado
        fechaLiquidacion
        fechaPago
        numeroComisiones
        empresa {
          idempresa
          nombre
          codigo
        }
        usuarioCreador {
          idusuario
          nombre
        }
        usuarioAutorizador {
          idusuario
          nombre
        }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

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

