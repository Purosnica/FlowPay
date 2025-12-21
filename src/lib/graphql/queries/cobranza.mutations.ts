// ======================================================
// MUTATIONS DE COBROS (PAGOS)
// ======================================================

export const CREATE_PAGO = `
  mutation CreatePago($input: CreatePagoInput!) {
    createPago(input: $input) {
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
      prestamo {
        idprestamo
        codigo
        saldoCapital
        saldoInteres
        saldoMora
        saldoTotal
      }
    }
  }
`;

export const REGISTRAR_PAGO_CON_APLICACION = `
  mutation RegistrarPagoConAplicacion($input: CreatePagoInput!) {
    registrarPagoConAplicacion(input: $input) {
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
      prestamo {
        idprestamo
        codigo
        saldoCapital
        saldoInteres
        saldoMora
        saldoTotal
      }
    }
  }
`;

export const UPDATE_PAGO = `
  mutation UpdatePago($input: UpdatePagoInput!) {
    updatePago(input: $input) {
      idpago
      idprestamo
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
      updatedAt
    }
  }
`;

export const DELETE_PAGO = `
  mutation DeletePago($id: Int!, $idusuario: Int) {
    deletePago(id: $id, idusuario: $idusuario) {
      idpago
      deletedAt
    }
  }
`;

// ======================================================
// MUTATIONS DE GESTIONES
// ======================================================

export const CREATE_GESTION = `
  mutation CreateGestion($input: CreateGestionCobroInput!) {
    createGestionCobro(input: $input) {
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
      prestamo {
        idprestamo
        codigo
      }
      usuario {
        idusuario
        nombre
      }
    }
  }
`;

export const UPDATE_GESTION = `
  mutation UpdateGestion($input: UpdateGestionCobroInput!) {
    updateGestionCobro(input: $input) {
      idgestion
      idprestamo
      tipoGestion
      canal
      estado
      fechaGestion
      proximaAccion
      duracionLlamada
      resumen
      notas
      updatedAt
    }
  }
`;

// ======================================================
// MUTATIONS DE ACUERDOS
// ======================================================

export const CREATE_ACUERDO = `
  mutation CreateAcuerdo($input: CreateAcuerdoInput!) {
    createAcuerdo(input: $input) {
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
      prestamo {
        idprestamo
        codigo
      }
      usuario {
        idusuario
        nombre
      }
    }
  }
`;

export const UPDATE_ACUERDO = `
  mutation UpdateAcuerdo($input: UpdateAcuerdoInput!) {
    updateAcuerdo(input: $input) {
      idacuerdo
      idprestamo
      tipoAcuerdo
      estado
      montoAcordado
      numeroCuotas
      fechasPagoProgramadas
      fechaInicio
      fechaFin
      observacion
      updatedAt
    }
  }
`;

export const DELETE_ACUERDO = `
  mutation DeleteAcuerdo($id: Int!, $idusuario: Int) {
    deleteAcuerdo(id: $id, idusuario: $idusuario) {
      idacuerdo
      deletedAt
    }
  }
`;

// ======================================================
// MUTATIONS DE ASIGNACIONES
// ======================================================

export const ASIGNAR_CARTERA = `
  mutation AsignarCartera($input: CreateAsignacionCarteraInput!) {
    asignarCartera(input: $input) {
      idasignacion
      idprestamo
      idusuario
      idusuarioAsignador
      fechaAsignacion
      motivo
      activa
      createdAt
      prestamo {
        idprestamo
        codigo
      }
      usuario {
        idusuario
        nombre
      }
    }
  }
`;

export const REASIGNAR_CARTERA = `
  mutation ReasignarCartera($idasignacion: Int!, $idusuarioNuevo: Int!, $idusuarioAsignador: Int, $motivo: String) {
    reasignarCartera(
      idasignacion: $idasignacion
      idusuarioNuevo: $idusuarioNuevo
      idusuarioAsignador: $idusuarioAsignador
      motivo: $motivo
    ) {
      idasignacion
      idprestamo
      idusuario
      fechaAsignacion
      activa
    }
  }
`;

export const DESASIGNAR_CARTERA = `
  mutation DesasignarCartera($idasignacion: Int!, $idusuario: Int) {
    desasignarCartera(idasignacion: $idasignacion, idusuario: $idusuario) {
      idasignacion
      activa
      fechaFin
    }
  }
`;

