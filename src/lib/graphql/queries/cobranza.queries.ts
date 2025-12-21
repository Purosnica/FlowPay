// ======================================================
// QUERIES DE COBROS (PAGOS)
// ======================================================

export const GET_PAGOS = `
  query GetPagos($filters: PagoFiltersInput) {
    pagos(filters: $filters) {
      pagos {
        idpago
        idprestamo
        idcuota
        idacuerdo
        idusuario
        metodoPago
        tipoCobro
        fechaPago
        referencia
        montoCapital
        montoInteres
        montoMora
        montoTotal
        observacion
        notas
        createdAt
        updatedAt
        prestamo {
          idprestamo
          codigo
          cliente {
            idcliente
            primer_nombres
            primer_apellido
            numerodocumento
          }
        }
        cuota {
          idcuota
          numero
        }
        acuerdo {
          idacuerdo
          tipoAcuerdo
        }
        usuario {
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

export const GET_PAGO = `
  query GetPago($id: Int!) {
    pago(id: $id) {
      idpago
      idprestamo
      idcuota
      idacuerdo
      idusuario
      metodoPago
      tipoCobro
      fechaPago
      referencia
      montoCapital
      montoInteres
      montoMora
      montoTotal
      observacion
      notas
      createdAt
      updatedAt
      prestamo {
        idprestamo
        codigo
        montoDesembolsado
        saldoCapital
        saldoInteres
        saldoMora
        saldoTotal
        cliente {
          idcliente
          primer_nombres
          segundo_nombres
          primer_apellido
          segundo_apellido
          numerodocumento
          telefono
          celular
          email
        }
      }
      cuota {
        idcuota
        numero
        fechaVencimiento
        capitalProgramado
        interesProgramado
        moraProgramada
        capitalPagado
        interesPagado
        moraPagada
      }
      acuerdo {
        idacuerdo
        tipoAcuerdo
        montoAcordado
        fechaFin
      }
      usuario {
        idusuario
        nombre
        email
      }
    }
  }
`;

export const GET_PAGOS_BY_PRESTAMO = `
  query GetPagosByPrestamo($idprestamo: Int!, $filters: PagoFiltersInput) {
    pagosPorPrestamo(idprestamo: $idprestamo, filters: $filters) {
      idpago
      idprestamo
      idcuota
      idacuerdo
      metodoPago
      tipoCobro
      fechaPago
      referencia
      montoCapital
      montoInteres
      montoMora
      montoTotal
      observacion
      createdAt
      cuota {
        idcuota
        numero
      }
      acuerdo {
        idacuerdo
        tipoAcuerdo
      }
    }
  }
`;

// ======================================================
// QUERIES DE GESTIONES
// ======================================================

export const GET_GESTIONES = `
  query GetGestiones($filters: GestionCobroFiltersInput) {
    gestionesCobro(filters: $filters) {
      gestiones {
        idgestion
        idprestamo
        idcuota
        idusuario
        idresultado
        tipoGestion
        canal
        estado
        fechaGestion
        proximaAccion
        duracionLlamada
        resumen
        notas
        evidenciaArchivo
        createdAt
        updatedAt
        prestamo {
          idprestamo
          codigo
          cliente {
            idcliente
            primer_nombres
            primer_apellido
            numerodocumento
          }
        }
        cuota {
          idcuota
          numero
        }
        usuario {
          idusuario
          nombre
          email
        }
        resultado {
          idresultado
          codigo
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

export const GET_GESTION = `
  query GetGestion($id: Int!) {
    gestionCobro(id: $id) {
      idgestion
      idprestamo
      idcuota
      idusuario
      idresultado
      tipoGestion
      canal
      estado
      fechaGestion
      proximaAccion
      duracionLlamada
      resumen
      notas
      evidenciaArchivo
      createdAt
      updatedAt
      prestamo {
        idprestamo
        codigo
        cliente {
          idcliente
          primer_nombres
          segundo_nombres
          primer_apellido
          segundo_apellido
          numerodocumento
          telefono
          celular
          email
        }
      }
      cuota {
        idcuota
        numero
        fechaVencimiento
        estado
      }
      usuario {
        idusuario
        nombre
        email
      }
      resultado {
        idresultado
        codigo
        descripcion
      }
    }
  }
`;

export const GET_GESTIONES_BY_PRESTAMO = `
  query GetGestionesByPrestamo($idprestamo: Int!) {
    gestionesPorPrestamo(idprestamo: $idprestamo) {
      idgestion
      idprestamo
      tipoGestion
      canal
      estado
      fechaGestion
      proximaAccion
      resumen
      notas
      createdAt
      usuario {
        idusuario
        nombre
      }
    }
  }
`;

export const GET_GESTIONES_PENDIENTES = `
  query GetGestionesPendientes($filters: GestionCobroFiltersInput) {
    gestionesPendientes(filters: $filters) {
      gestiones {
        idgestion
        idprestamo
        tipoGestion
        estado
        fechaGestion
        proximaAccion
        resumen
        prestamo {
          idprestamo
          codigo
          cliente {
            primer_nombres
            primer_apellido
          }
        }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_RESULTADOS_GESTION = `
  query GetResultadosGestion($activos: Boolean) {
    resultadosGestion(activos: $activos) {
      idresultado
      codigo
      descripcion
      estado
    }
  }
`;

// ======================================================
// QUERIES DE ACUERDOS
// ======================================================

export const GET_ACUERDOS = `
  query GetAcuerdos($filters: AcuerdoFiltersInput) {
    acuerdos(filters: $filters) {
      acuerdos {
        idacuerdo
        idprestamo
        idusuario
        tipoAcuerdo
        estado
        montoAcordado
        numeroCuotas
        fechasPagoProgramadas
        fechaInicio
        fechaFin
        observacion
        createdAt
        updatedAt
        prestamo {
          idprestamo
          codigo
          cliente {
            idcliente
            primer_nombres
            primer_apellido
            numerodocumento
          }
        }
        usuario {
          idusuario
          nombre
          email
        }
        pagos {
          idpago
          fechaPago
          montoTotal
        }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_ACUERDO = `
  query GetAcuerdo($id: Int!) {
    acuerdo(id: $id) {
      idacuerdo
      idprestamo
      idusuario
      tipoAcuerdo
      estado
      montoAcordado
      numeroCuotas
      fechasPagoProgramadas
      fechaInicio
      fechaFin
      observacion
      createdAt
      updatedAt
      prestamo {
        idprestamo
        codigo
        montoDesembolsado
        saldoTotal
        cliente {
          idcliente
          primer_nombres
          segundo_nombres
          primer_apellido
          segundo_apellido
          numerodocumento
          telefono
          celular
          email
        }
      }
      usuario {
        idusuario
        nombre
        email
      }
      pagos {
        idpago
        fechaPago
        montoCapital
        montoInteres
        montoMora
        montoTotal
        metodoPago
      }
    }
  }
`;

export const GET_ACUERDOS_BY_PRESTAMO = `
  query GetAcuerdosByPrestamo($idprestamo: Int!, $activos: Boolean) {
    acuerdosPorPrestamo(idprestamo: $idprestamo, activos: $activos) {
      idacuerdo
      tipoAcuerdo
      estado
      montoAcordado
      fechaInicio
      fechaFin
      createdAt
    }
  }
`;

export const GET_ACUERDOS_VENCIDOS = `
  query GetAcuerdosVencidos($filters: AcuerdoFiltersInput) {
    acuerdosVencidos(filters: $filters) {
      acuerdos {
        idacuerdo
        idprestamo
        tipoAcuerdo
        estado
        montoAcordado
        fechaFin
        prestamo {
          idprestamo
          codigo
          cliente {
            primer_nombres
            primer_apellido
          }
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
// QUERIES DE ASIGNACIONES
// ======================================================

export const GET_ASIGNACIONES = `
  query GetAsignaciones($filters: AsignacionCarteraFiltersInput) {
    asignacionesCartera(filters: $filters) {
      asignaciones {
        idasignacion
        idprestamo
        idusuario
        idusuarioAsignador
        fechaAsignacion
        fechaFin
        motivo
        activa
        createdAt
        updatedAt
        prestamo {
          idprestamo
          codigo
          estado
          cliente {
            idcliente
            primer_nombres
            primer_apellido
            numerodocumento
          }
        }
        usuario {
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

export const GET_ASIGNACION = `
  query GetAsignacion($id: Int!) {
    asignacionCartera(id: $id) {
      idasignacion
      idprestamo
      idusuario
      idusuarioAsignador
      fechaAsignacion
      fechaFin
      motivo
      activa
      createdAt
      updatedAt
      prestamo {
        idprestamo
        codigo
        cliente {
          idcliente
          primer_nombres
          primer_apellido
        }
      }
      usuario {
        idusuario
        nombre
        email
      }
    }
  }
`;

export const GET_CARTERA_POR_COBRADOR = `
  query GetCarteraPorCobrador($idusuario: Int!) {
    carteraPorCobrador(idusuario: $idusuario)
  }
`;

export const GET_PRESTAMOS_ASIGNADOS_A_COBRADOR = `
  query GetPrestamosAsignadosACobrador($idusuario: Int!) {
    prestamosAsignadosACobrador(idusuario: $idusuario)
  }
`;

// ======================================================
// QUERIES DE COBRADORES
// ======================================================

export const GET_COBRADORES = `
  query GetCobradores {
    usuarios(rol: COBRADOR) {
      idusuario
      nombre
      email
      telefono
      activo
    }
  }
`;

