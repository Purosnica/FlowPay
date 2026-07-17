import {
  CODIGO_ACCION_FIELDS,
  CODIGO_RESULTADO_FIELDS,
  PRESTAMO_LIST_FIELDS,
  RANKING_COBRADOR_FIELDS,
} from './gql-fragments';

export const GET_MANDANTES = `
  query GetMandantes($page: Int, $pageSize: Int) {
    mandantes(page: $page, pageSize: $pageSize) {
      mandantes {
        idmandante
        codigo
        nombre
        regulador
        descuentoMaximo
        estado
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_MANDANTE_BY_ID = `
  query GetMandanteById($id: Int!) {
    mandante(id: $id) {
      idmandante
      codigo
      nombre
      ruc
      regulador
      descuentoMaximo
      estado
    }
  }
`;

export const GET_PAGOS_CONCILIACION = `
  query GetPagosConciliacion(
    $page: Int
    $pageSize: Int
    $idmandante: Int
    $soloPendientes: Boolean
  ) {
    pagosConciliacion(
      page: $page
      pageSize: $pageSize
      idmandante: $idmandante
      soloPendientes: $soloPendientes
    ) {
      pagos {
        idpago
        idprestamo
        idmandante
        noPrestamo
        nombreCliente
        fechaPago
        monto
        moneda
        medio
        aplicado
      }
      total
      page
      pageSize
      totalPages
      pendientesTotal
    }
  }
`;

export const GET_CAMPANAS = `
  query GetCampanas($idmandante: Int!, $page: Int, $pageSize: Int) {
    campanas(idmandante: $idmandante, page: $page, pageSize: $pageSize) {
      campanas {
        idcampana
        idmandante
        nombre
        fechaCorte
        estado
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_PRESTAMOS = `
  query GetPrestamos($page: Int, $pageSize: Int, $filters: PrestamoFiltersInput) {
    prestamos(page: $page, pageSize: $pageSize, filters: $filters) {
      prestamos {
        ${PRESTAMO_LIST_FIELDS}
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_PRESTAMO = `
  query GetPrestamo($id: Int!) {
    prestamo(id: $id) {
      idprestamo
      idmandante
      idcampana
      idcliente
      noPrestamo
      codigoUnico
      noCuenta
      estado
      moneda
      diasMora
      saldoTotal
      montoPrestamo
      interes
      interesMoratorio
      comisionCav
      comisionInsitu
      mantenimientoValor
      gestionCobranza
      reportableCentralRiesgo
      fechaPrestamo
      fechaVencimiento
      ultimaFechaPago
      cliente {
        idcliente
        primer_nombres
        segundo_nombres
        primer_apellido
        segundo_apellido
        numerodocumento
        celular
        telefono
        email
        direccion
      }
      mandante {
        idmandante
        nombre
        codigo
        descuentoMaximo
      }
      gestor {
        idusuario
        nombre
      }
    }
  }
`;

export const GET_DESGLOSE_SALDO_PRESTAMO = `
  query GetDesgloseSaldoPrestamo($idprestamo: Int!) {
    desgloseSaldoPrestamo(idprestamo: $idprestamo) {
      montoPrestamo
      interes
      gestionCobranza
      comisionCav
      comisionInsitu
      mantenimientoValor
      seguroSvsd
      cargosAdmin
      devolucionSaldoFavor
      descuentosArchivo
      interesMoratorio
      subtotalComponentes
      totalPagosAplicados
      saldoCalculado
      saldoRegistrado
      baseAcuerdo
      descuentoAcuerdoVigente
      diferencia
      cuadra
    }
  }
`;

export const GET_GESTIONES_HOY = `
  query MisGestionesHoy(
    $page: Int
    $pageSize: Int
    $fechaDesde: String
    $fechaHasta: String
  ) {
    misGestionesHoy(
      page: $page
      pageSize: $pageSize
      fechaDesde: $fechaDesde
      fechaHasta: $fechaHasta
    ) {
      gestiones {
        idgestion
        idprestamo
        fechaGestion
        nota
        telefonoContacto
        montoPromesa
        fechaPromesa
        fechaProximaGestion
        gestor { nombre }
        codaccion { codigo descripcion }
        codresult { codigo descripcion }
        prestamo {
          idprestamo
          noPrestamo
          diasMora
          saldoTotal
          cliente {
            primer_nombres
            primer_apellido
            numerodocumento
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

export const GET_GESTIONES = `
  query GetGestiones($idprestamo: Int!, $page: Int, $pageSize: Int) {
    gestiones(idprestamo: $idprestamo, page: $page, pageSize: $pageSize) {
      gestiones {
        idgestion
        idprestamo
        fechaGestion
        nota
        telefonoContacto
        contactoTercero
        montoPromesa
        fechaPromesa
        gestor { nombre }
        codaccion { codigo descripcion }
        codresult { codigo descripcion }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_ACUERDOS = `
  query GetAcuerdos($idprestamo: Int!) {
    acuerdos(idprestamo: $idprestamo) {
      idacuerdo
      idprestamo
      porcentajeDesc
      baseNegociable
      montoDescuento
      montoAcordado
      numeroCuotas
      montoCuota
      pagoMinimo
      dispensarInteresMoratorio
      dispensarGestionCobranza
      fechaInicio
      estado
      cuotas {
        idcuota
        numeroCuota
        montoCuota
        fechaVencimiento
        estado
      }
    }
  }
`;

export const GET_PAGOS = `
  query GetPagos($idprestamo: Int!, $page: Int, $pageSize: Int) {
    pagos(idprestamo: $idprestamo, page: $page, pageSize: $pageSize) {
      pagos {
        idpago
        idprestamo
        fechaPago
        monto
        moneda
        medio
        aplicado
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_CODIGOS_ACCION = `
  query GetCodigosAccion {
    codigosAccion {
      ${CODIGO_ACCION_FIELDS}
    }
  }
`;

export const GET_CODIGOS_RESULTADO = `
  query GetCodigosResultado {
    codigosResultado {
      ${CODIGO_RESULTADO_FIELDS}
    }
  }
`;

export const SIMULAR_ACUERDO = `
  query SimularAcuerdo($input: SimularAcuerdoInput!) {
    simularAcuerdo(input: $input) {
      baseNegociable
      montoDescuento
      montoAcordado
      montoCuota
      pagoMinimo
      interesMoratorioExcluido
      gestionCobranzaExcluida
    }
  }
`;

export const CREATE_CAMPANA = `
  mutation CreateCampana($input: CreateCampanaInput!) {
    createCampana(input: $input) {
      idcampana
      nombre
      fechaCorte
      estado
    }
  }
`;

export const CREATE_SECUENCIA_CONTACTO = `
  mutation CreateSecuenciaContacto($input: CreateSecuenciaContactoInput!) {
    createSecuenciaContacto(input: $input) {
      idsecuencia
      idcampana
      nombre
      estado
      pasos {
        idpaso
        orden
        diasDesdeInicio
        canal
        accion
        idplantilla
        plantillaNombre
      }
    }
  }
`;

export const GET_SECUENCIAS_MANDANTE = `
  query GetSecuenciasMandante($idmandante: Int!) {
    secuenciasPorMandante(idmandante: $idmandante) {
      idsecuencia
      idcampana
      nombre
      estado
      campanaNombre
      pasos {
        orden
        diasDesdeInicio
        canal
        accion
        plantillaNombre
      }
    }
  }
`;

export const GET_METAS_MANDANTE = `
  query GetMetasMandante($idmandante: Int!) {
    metasMandante(idmandante: $idmandante) {
      idmandante
      metaGestionesSemana
      metaRecuperacionSemana
      metaRecuperacionMes
      usaGlobalGestionesSemana
      usaGlobalRecuperacionSemana
      usaGlobalRecuperacionMes
    }
  }
`;

export const ACTUALIZAR_METAS_MANDANTE = `
  mutation ActualizarMetasMandante(
    $idmandante: Int!
    $metaGestionesSemana: Int
    $metaRecuperacionSemana: Float
    $metaRecuperacionMes: Float
  ) {
    actualizarMetasMandante(
      idmandante: $idmandante
      metaGestionesSemana: $metaGestionesSemana
      metaRecuperacionSemana: $metaRecuperacionSemana
      metaRecuperacionMes: $metaRecuperacionMes
    ) {
      idmandante
      metaGestionesSemana
      metaRecuperacionSemana
      metaRecuperacionMes
      usaGlobalGestionesSemana
      usaGlobalRecuperacionSemana
      usaGlobalRecuperacionMes
    }
  }
`;

export const RESTABLECER_METAS_MANDANTE = `
  mutation RestablecerMetasMandanteGlobal($idmandante: Int!) {
    restablecerMetasMandanteGlobal(idmandante: $idmandante) {
      idmandante
      metaGestionesSemana
      metaRecuperacionSemana
      metaRecuperacionMes
      usaGlobalGestionesSemana
      usaGlobalRecuperacionSemana
      usaGlobalRecuperacionMes
    }
  }
`;

export const GET_METAS_COBRADOR = `
  query GetMetasCobrador($idgestor: Int!) {
    metasCobrador(idgestor: $idgestor) {
      idgestor
      nombre
      metaGestionesSemana
      metaRecuperacionSemana
      usaGlobalGestionesSemana
      usaGlobalRecuperacionSemana
    }
  }
`;

export const ACTUALIZAR_METAS_COBRADOR = `
  mutation ActualizarMetasCobrador(
    $idgestor: Int!
    $metaGestionesSemana: Int
    $metaRecuperacionSemana: Float
  ) {
    actualizarMetasCobrador(
      idgestor: $idgestor
      metaGestionesSemana: $metaGestionesSemana
      metaRecuperacionSemana: $metaRecuperacionSemana
    ) {
      idgestor
      nombre
      metaGestionesSemana
      metaRecuperacionSemana
      usaGlobalGestionesSemana
      usaGlobalRecuperacionSemana
    }
  }
`;

export const MARCAR_NOTIFICACIONES_LEIDAS = `
  mutation MarcarNotificacionesLeidas($ids: [String!]!) {
    marcarNotificacionesOperativasLeidas(ids: $ids)
  }
`;

export const GET_SECUENCIAS_CAMPANA = `
  query GetSecuenciasCampana($idcampana: Int!) {
    secuenciasPorCampana(idcampana: $idcampana) {
      idsecuencia
      nombre
      estado
      pasos {
        orden
        diasDesdeInicio
        canal
        accion
        plantillaNombre
      }
    }
  }
`;

export const GET_AGENDA_SECUENCIA_HOY = `
  query GetAgendaSecuenciaHoy($idcampana: Int) {
    agendaSecuenciaHoy(idcampana: $idcampana) {
      idprestamo
      noPrestamo
      canal
      accion
      diasDesdeInicio
      nombreCliente
    }
  }
`;

export const GET_IMPORTACION_JOBS = `
  query GetImportacionJobs($limite: Int) {
    importacionJobs(limite: $limite) {
      idjob
      idmandante
      idcampana
      tipo
      estado
      nombreArchivo
      progresoPct
      filasProcesadas
      filasTotales
      error
      createdAt
      finalizadoEn
    }
  }
`;

export const GET_IMPORTACION_JOB = `
  query GetImportacionJob($idjob: Int!) {
    importacionJob(idjob: $idjob) {
      idjob
      estado
      progresoPct
      filasProcesadas
      filasTotales
      error
      resultado
      nombreArchivo
      finalizadoEn
    }
  }
`;

export const CREATE_GESTION = `
  mutation CreateGestion($input: CreateGestionInput!) {
    createGestion(input: $input) {
      idgestion
      fechaGestion
    }
  }
`;

export const CREATE_ACUERDO = `
  mutation CreateAcuerdo($input: CreateAcuerdoInput!) {
    createAcuerdo(input: $input) {
      idacuerdo
      estado
      montoAcordado
    }
  }
`;

export const ACTUALIZAR_ESTADO_ACUERDO = `
  mutation ActualizarEstadoAcuerdo($idacuerdo: Int!, $estado: String!) {
    actualizarEstadoAcuerdo(idacuerdo: $idacuerdo, estado: $estado) {
      idacuerdo
      estado
    }
  }
`;

export const CREATE_PAGO = `
  mutation CreatePago($input: CreatePagoInput!) {
    createPago(input: $input) {
      idpago
      monto
      fechaPago
    }
  }
`;

export const CREATE_MANDANTE = `
  mutation CreateMandante($input: CreateMandanteInput!) {
    createMandante(input: $input) {
      idmandante
      codigo
      nombre
      regulador
      descuentoMaximo
      estado
    }
  }
`;

export const UPDATE_MANDANTE = `
  mutation UpdateMandante($input: UpdateMandanteInput!) {
    updateMandante(input: $input) {
      idmandante
      codigo
      nombre
      regulador
      descuentoMaximo
      estado
    }
  }
`;

export const ASIGNAR_USUARIO_MANDANTE = `
  mutation AsignarUsuarioMandante($idusuario: Int!, $idmandante: Int!) {
    asignarUsuarioMandante(idusuario: $idusuario, idmandante: $idmandante)
  }
`;

export const DESASIGNAR_USUARIO_MANDANTE = `
  mutation DesasignarUsuarioMandante($idusuario: Int!, $idmandante: Int!) {
    desasignarUsuarioMandante(idusuario: $idusuario, idmandante: $idmandante)
  }
`;

export const GET_USUARIOS_ACTIVOS = `
  query GetUsuariosActivos {
    usuariosActivos {
      idusuario
      nombre
      email
      idrol
    }
  }
`;

export const GET_USUARIOS_MANDANTE = `
  query GetUsuariosMandante($idmandante: Int!) {
    usuariosMandante(idmandante: $idmandante) {
      idusuario
      nombre
      email
      idrol
      porcentajeComisionMandante
      porcentajeComisionUsuario
      porcentajeComision
    }
  }
`;

export const ACTUALIZAR_COMISION_USUARIO_MANDANTE = `
  mutation ActualizarComisionUsuarioMandante($input: UpdateComisionUsuarioMandanteInput!) {
    actualizarComisionUsuarioMandante(input: $input) {
      idusuario
      nombre
      porcentajeComisionMandante
      porcentajeComisionUsuario
      porcentajeComision
    }
  }
`;

export const GET_PLANTILLAS_IMPORTACION = `
  query GetPlantillasImportacion($idmandante: Int!, $page: Int, $pageSize: Int) {
    plantillasImportacion(idmandante: $idmandante, page: $page, pageSize: $pageSize) {
      plantillas {
        idplantillaImp
        idmandante
        nombre
        mapeo
        formatoFecha
        estado
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const CREATE_PLANTILLA_IMPORTACION = `
  mutation CreatePlantillaImportacion($input: CreatePlantillaImportacionInput!) {
    createPlantillaImportacion(input: $input) {
      idplantillaImp
      nombre
    }
  }
`;

export const UPDATE_PLANTILLA_IMPORTACION = `
  mutation UpdatePlantillaImportacion($input: UpdatePlantillaImportacionInput!) {
    updatePlantillaImportacion(input: $input) {
      idplantillaImp
      nombre
      estado
    }
  }
`;

export const DELETE_PLANTILLA_IMPORTACION = `
  mutation DeletePlantillaImportacion($id: Int!) {
    deletePlantillaImportacion(id: $id)
  }
`;

export const GET_LIQUIDACIONES = `
  query GetLiquidaciones(
    $idmandante: Int!
    $periodo: String
    $page: Int
    $pageSize: Int
  ) {
    liquidaciones(
      idmandante: $idmandante
      periodo: $periodo
      page: $page
      pageSize: $pageSize
    ) {
      liquidaciones {
        idliquidacion
        idmandante
        periodo
        totalRecuperado
        totalComision
        estado
        createdAt
        mandante {
          nombre
          codigo
        }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const SIMULAR_LIQUIDACION = `
  query SimularLiquidacion($idmandante: Int!, $periodo: String!) {
    simularLiquidacion(idmandante: $idmandante, periodo: $periodo) {
      idmandante
      periodo
      totalRecuperado
      totalIngresoEmpresa
      totalComision
      cantidadPagos
      detalle {
        idpago
        noPrestamo
        monto
        diasMora
        nombreGestor
        porcentajeRecuperacion
        ingresoEmpresa
        porcentajeComisionCobrador
        montoComision
      }
    }
  }
`;

export const GENERAR_LIQUIDACION = `
  mutation GenerarLiquidacion($idmandante: Int!, $periodo: String!) {
    generarLiquidacion(idmandante: $idmandante, periodo: $periodo) {
      idliquidacion
      simulacion {
        totalRecuperado
        totalIngresoEmpresa
        totalComision
        cantidadPagos
      }
    }
  }
`;

export const EMITIR_LIQUIDACION = `
  mutation EmitirLiquidacion($idliquidacion: Int!) {
    emitirLiquidacion(idliquidacion: $idliquidacion) {
      idliquidacion
      estado
    }
  }
`;

export const MARCAR_LIQUIDACION_PAGADA = `
  mutation MarcarLiquidacionPagada($idliquidacion: Int!) {
    marcarLiquidacionPagada(idliquidacion: $idliquidacion) {
      idliquidacion
      estado
    }
  }
`;

export const REVERTIR_LIQUIDACION_PAGADA = `
  mutation RevertirLiquidacionPagada($idliquidacion: Int!) {
    revertirLiquidacionPagada(idliquidacion: $idliquidacion) {
      idliquidacion
      estado
    }
  }
`;

export const ANULAR_LIQUIDACION = `
  mutation AnularLiquidacion($idliquidacion: Int!) {
    anularLiquidacion(idliquidacion: $idliquidacion)
  }
`;

export const GET_REPORTE_COBRANZA = `
  query GetReporteCobranza($idmandante: Int!, $periodo: String) {
    reporteCobranza(idmandante: $idmandante, periodo: $periodo) {
      idmandante
      periodo
      totalPrestamos
      prestamosEnMora
      saldoCartera
      totalRecuperado
      totalGestiones
      totalAcuerdosVigentes
      tasaRecuperacion
      porGestor {
        idgestor
        nombre
        gestiones
        montoRecuperado
      }
    }
  }
`;

export const GET_REPORTE_AGING = `
  query GetReporteAgingCartera($idmandante: Int!) {
    reporteAgingCartera(idmandante: $idmandante) {
      idmandante
      saldoCarteraTotal
      totalPrestamos
      tramos {
        tramo
        tramoMoraMin
        tramoMoraMax
        cantidadPrestamos
        saldoTotal
        porcentajeSaldo
      }
    }
  }
`;

export const GET_COMISIONES_COBRO = `
  query GetComisionesCobro($idmandante: Int!, $page: Int, $pageSize: Int) {
    comisionesCobro(idmandante: $idmandante, page: $page, pageSize: $pageSize) {
      comisiones {
        idcomision
        idmandante
        tramoMoraMin
        tramoMoraMax
        porcentaje
        estado
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const CREATE_COMISION_COBRO = `
  mutation CreateComisionCobro($input: CreateComisionCobroInput!) {
    createComisionCobro(input: $input) {
      idcomision
      tramoMoraMin
      tramoMoraMax
      porcentaje
      estado
    }
  }
`;

export const UPDATE_COMISION_COBRO = `
  mutation UpdateComisionCobro($input: UpdateComisionCobroInput!) {
    updateComisionCobro(input: $input) {
      idcomision
      tramoMoraMin
      tramoMoraMax
      porcentaje
      estado
    }
  }
`;

export const DELETE_COMISION_COBRO = `
  mutation DeleteComisionCobro($idcomision: Int!) {
    deleteComisionCobro(idcomision: $idcomision)
  }
`;

export const ASIGNAR_GESTOR_PRESTAMO = `
  mutation AsignarGestorPrestamo($idprestamo: Int!, $idgestor: Int!, $motivo: String) {
    asignarGestorPrestamo(idprestamo: $idprestamo, idgestor: $idgestor, motivo: $motivo) {
      idprestamo
      gestor { idusuario nombre }
    }
  }
`;

export const GET_BANDEJA_COBRADOR = `
  query GetBandejaCobrador(
    $page: Int
    $pageSize: Int
    $filters: BandejaFiltersInput
  ) {
    bandejaCobrador(page: $page, pageSize: $pageSize, filters: $filters) {
      prestamos {
        idprestamo
        idmandante
        noPrestamo
        diasMora
        saldoTotal
        moneda
        estado
        scorePrioridad
        motivoPrioridad
        cliente
        mandante
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const CERRAR_CAMPANA = `
  mutation CerrarCampana($idcampana: Int!) {
    cerrarCampana(idcampana: $idcampana) {
      idcampana
      estado
    }
  }
`;

export const GET_POLITICAS_DESCUENTO = `
  query GetPoliticasDescuento($idmandante: Int!, $page: Int, $pageSize: Int) {
    politicasDescuento(idmandante: $idmandante, page: $page, pageSize: $pageSize) {
      politicas {
        idpolitica
        tramoMoraMin
        tramoMoraMax
        porcentaje
        estado
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const CREATE_POLITICA_DESCUENTO = `
  mutation CreatePoliticaDescuento($input: CreatePoliticaDescuentoInput!) {
    createPoliticaDescuento(input: $input) {
      idpolitica
      porcentaje
    }
  }
`;

export const UPDATE_POLITICA_DESCUENTO = `
  mutation UpdatePoliticaDescuento($input: UpdatePoliticaDescuentoInput!) {
    updatePoliticaDescuento(input: $input) {
      idpolitica
      porcentaje
    }
  }
`;

export const DELETE_POLITICA_DESCUENTO = `
  mutation DeletePoliticaDescuento($idpolitica: Int!) {
    deletePoliticaDescuento(idpolitica: $idpolitica)
  }
`;

export const GET_PLANTILLAS_MENSAJE = `
  query GetPlantillasMensaje($idmandante: Int!, $page: Int, $pageSize: Int) {
    plantillasMensaje(idmandante: $idmandante, page: $page, pageSize: $pageSize) {
      plantillas {
        idplantilla
        nombre
        canal
        etapa
        contenido
        estado
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const CREATE_PLANTILLA_MENSAJE = `
  mutation CreatePlantillaMensaje($input: CreatePlantillaMensajeInput!) {
    createPlantillaMensaje(input: $input) {
      idplantilla
      nombre
    }
  }
`;

export const UPDATE_PLANTILLA_MENSAJE = `
  mutation UpdatePlantillaMensaje($input: UpdatePlantillaMensajeInput!) {
    updatePlantillaMensaje(input: $input) {
      idplantilla
      nombre
      estado
    }
  }
`;

export const DELETE_PLANTILLA_MENSAJE = `
  mutation DeletePlantillaMensaje($idplantilla: Int!) {
    deletePlantillaMensaje(idplantilla: $idplantilla)
  }
`;

export const GET_HORARIOS_COBRANZA = `
  query GetHorariosCobranza($idmandante: Int, $page: Int, $pageSize: Int) {
    horariosCobranza(idmandante: $idmandante, page: $page, pageSize: $pageSize) {
      horarios {
        idhorario
        diaSemana
        horaInicio
        horaFin
        permitido
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const UPDATE_HORARIO_COBRANZA = `
  mutation UpdateHorarioCobranza($idhorario: Int!, $horaInicio: String, $horaFin: String, $permitido: Boolean) {
    updateHorarioCobranza(idhorario: $idhorario, horaInicio: $horaInicio, horaFin: $horaFin, permitido: $permitido) {
      idhorario
      horaInicio
      horaFin
      permitido
    }
  }
`;

export const MARCAR_PAGO_APLICADO = `
  mutation MarcarPagoAplicado($idpago: Int!, $aplicado: Boolean!) {
    marcarPagoAplicado(idpago: $idpago, aplicado: $aplicado) {
      idpago
      aplicado
    }
  }
`;

export const GET_FIADORES = `
  query GetFiadores($idprestamo: Int!, $page: Int, $pageSize: Int) {
    fiadores(idprestamo: $idprestamo, page: $page, pageSize: $pageSize) {
      fiadores {
        idfiador
        nombre
        telefono
        tipo
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const CREATE_FIADOR = `
  mutation CreateFiador($input: CreateFiadorInput!) {
    createFiador(input: $input) {
      idfiador
      nombre
      tipo
    }
  }
`;

export const DELETE_FIADOR = `
  mutation DeleteFiador($idfiador: Int!) {
    deleteFiador(idfiador: $idfiador)
  }
`;

export const GET_DOCUMENTOS = `
  query GetDocumentos(
    $idprestamo: Int
    $idcliente: Int
    $page: Int
    $pageSize: Int
  ) {
    documentos(
      idprestamo: $idprestamo
      idcliente: $idcliente
      page: $page
      pageSize: $pageSize
    ) {
      documentos {
        iddocumento
        tipo
        url
        createdAt
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const CREATE_DOCUMENTO = `
  mutation CreateDocumento($input: CreateDocumentoInput!) {
    createDocumento(input: $input) {
      iddocumento
      tipo
      url
    }
  }
`;

export const DELETE_DOCUMENTO = `
  mutation DeleteDocumento($iddocumento: Int!) {
    deleteDocumento(iddocumento: $iddocumento)
  }
`;

export const GET_RECLAMOS = `
  query GetReclamos(
    $idmandante: Int
    $idprestamo: Int
    $estado: String
    $page: Int
    $pageSize: Int
  ) {
    reclamos(
      idmandante: $idmandante
      idprestamo: $idprestamo
      estado: $estado
      page: $page
      pageSize: $pageSize
    ) {
      reclamos {
        idreclamo
        descripcion
        estado
        fechaLimite
        createdAt
        cliente {
          primer_nombres
          primer_apellido
          numerodocumento
        }
        prestamo {
          noPrestamo
        }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const CREATE_RECLAMO = `
  mutation CreateReclamo($input: CreateReclamoInput!) {
    createReclamo(input: $input) {
      idreclamo
      estado
    }
  }
`;

export const UPDATE_RECLAMO_ESTADO = `
  mutation UpdateReclamoEstado($input: UpdateReclamoEstadoInput!) {
    updateReclamoEstado(input: $input) {
      idreclamo
      estado
    }
  }
`;

export const ASIGNAR_GESTOR_MASIVO = `
  mutation AsignarGestorMasivo($idprestamos: [Int!]!, $idgestor: Int!, $motivo: String) {
    asignarGestorMasivo(idprestamos: $idprestamos, idgestor: $idgestor, motivo: $motivo)
  }
`;

export const ASIGNAR_GESTOR_POR_REFERENCIAS = `
  mutation AsignarGestorPorReferencias(
    $idmandante: Int!
    $referenciasTexto: String!
    $idgestor: Int!
    $motivo: String
  ) {
    asignarGestorPorReferencias(
      idmandante: $idmandante
      referenciasTexto: $referenciasTexto
      idgestor: $idgestor
      motivo: $motivo
    ) {
      asignados
      encontrados
      omitidosYaAsignados
      noEncontrados
    }
  }
`;

export const VERIFICAR_HORARIO_COBRANZA = `
  query VerificarHorarioCobranza($idmandante: Int) {
    verificarHorarioCobranza(idmandante: $idmandante) {
      permitido
      motivo
    }
  }
`;

export const GET_DEUDORES_CONTACTO = `
  query GetDeudoresContacto($idcliente: Int!, $page: Int, $pageSize: Int) {
    deudoresContacto(idcliente: $idcliente, page: $page, pageSize: $pageSize) {
      contactos {
        idcontacto
        tipo
        valor
        fuente
        autorizado
        esTercero
        noContactar
        estado
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const CREATE_DEUDOR_CONTACTO = `
  mutation CreateDeudorContacto($input: CreateDeudorContactoInput!) {
    createDeudorContacto(input: $input) {
      idcontacto
      tipo
      valor
    }
  }
`;

export const UPDATE_DEUDOR_CONTACTO = `
  mutation UpdateDeudorContacto($input: UpdateDeudorContactoInput!) {
    updateDeudorContacto(input: $input) {
      idcontacto
      autorizado
      noContactar
      estado
    }
  }
`;

export const DELETE_DEUDOR_CONTACTO = `
  mutation DeleteDeudorContacto($idcontacto: Int!) {
    deleteDeudorContacto(idcontacto: $idcontacto)
  }
`;

export const GET_CORTES_PRESTAMO = `
  query GetCortesPrestamo($idprestamo: Int!, $page: Int, $pageSize: Int) {
    cortesPrestamo(idprestamo: $idprestamo, page: $page, pageSize: $pageSize) {
      cortes {
        idcorte
        fechaCorte
        saldoTotal
        diasMora
        estado
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_CONTRATOS_MANDANTE = `
  query GetContratosMandante($idmandante: Int!, $page: Int, $pageSize: Int) {
    contratosMandante(idmandante: $idmandante, page: $page, pageSize: $pageSize) {
      contratos {
        idcontrato
        fechaInicio
        fechaFin
        permitePagoAnticipado
        estado
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const CREATE_CONTRATO_MANDANTE = `
  mutation CreateContratoMandante($input: CreateContratoMandanteInput!) {
    createContratoMandante(input: $input) {
      idcontrato
      fechaInicio
    }
  }
`;

export const UPDATE_CONTRATO_MANDANTE = `
  mutation UpdateContratoMandante($input: UpdateContratoMandanteInput!) {
    updateContratoMandante(input: $input) {
      idcontrato
      estado
    }
  }
`;

export const DELETE_CONTRATO_MANDANTE = `
  mutation DeleteContratoMandante($idcontrato: Int!) {
    deleteContratoMandante(idcontrato: $idcontrato)
  }
`;

export const GET_TIPIFICACIONES_MANDANTE = `
  query GetTipificacionesMandante($idmandante: Int!) {
    tipificacionesMandante(idmandante: $idmandante) {
      idmt
      idcodaccion
      idcodresultado
      codaccion { idcodaccion codigo descripcion }
      codresult { idcodresultado codigo descripcion }
    }
  }
`;

export const ADD_TIPIFICACION_MANDANTE = `
  mutation AddTipificacionMandante($idmandante: Int!, $idcodaccion: Int, $idcodresultado: Int) {
    addTipificacionMandante(idmandante: $idmandante, idcodaccion: $idcodaccion, idcodresultado: $idcodresultado) {
      idmt
    }
  }
`;

export const REMOVE_TIPIFICACION_MANDANTE = `
  mutation RemoveTipificacionMandante($idmt: Int!) {
    removeTipificacionMandante(idmt: $idmt)
  }
`;

export const GET_CODIGOS_ACCION_MANDANTE = `
  query GetCodigosAccionMandante($idmandante: Int!) {
    codigosAccionPorMandante(idmandante: $idmandante) {
      ${CODIGO_ACCION_FIELDS}
    }
  }
`;

export const GET_CODIGOS_RESULTADO_MANDANTE = `
  query GetCodigosResultadoMandante($idmandante: Int!) {
    codigosResultadoPorMandante(idmandante: $idmandante) {
      ${CODIGO_RESULTADO_FIELDS}
    }
  }
`;

export const GET_AGENCIAS = `
  query GetAgencias($page: Int, $pageSize: Int) {
    agencias(page: $page, pageSize: $pageSize) {
      agencias {
        idagencia
        codigo
        nombre
        estado
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_RUTAS = `
  query GetRutas($idagencia: Int, $page: Int, $pageSize: Int) {
    rutas(idagencia: $idagencia, page: $page, pageSize: $pageSize) {
      rutas {
        idruta
        idagencia
        nombre
        estado
        agencia { codigo nombre }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_RESUMEN_DASHBOARD = `
  query GetResumenDashboardCobranza {
    resumenDashboardCobranza {
      totalPrestamos
      prestamosEnMora
      saldoCartera
      gestionesMes
      pagosMes
      pagosConciliadosMes
      reclamosAbiertos
      promesasVencidas
    }
  }
`;

export const GET_PROMESAS_VENCIDAS = `
  query GetPromesasVencidas($soloMisAsignados: Boolean, $limit: Int) {
    promesasVencidas(soloMisAsignados: $soloMisAsignados, limit: $limit) {
      idgestion
      idprestamo
      noPrestamo
      nombreCliente
      montoPromesa
      fechaPromesa
      diasVencidos
    }
  }
`;

export const GET_PRESTAMOS_POR_CLIENTE = `
  query GetPrestamosPorCliente($idcliente: Int!) {
    prestamosPorCliente(idcliente: $idcliente) {
      idprestamo
      noPrestamo
      diasMora
      saldoTotal
      mandante { nombre }
    }
  }
`;

export const GET_CARGAS_CARTERA = `
  query GetCargasCartera($idmandante: Int!, $page: Int, $pageSize: Int) {
    cargasCartera(idmandante: $idmandante, page: $page, pageSize: $pageSize) {
      cargas {
        idcarga
        nombreArchivo
        fechaCorte
        estado
        totalPrestamos
        saldoTotal
        tiempoMs
        createdAt
        usuario
      }
      total
    }
  }
`;

export const GET_RESUMEN_CARGA = `
  query GetResumenCarga($idcarga: Int!) {
    resumenCargaCartera(idcarga: $idcarga) {
      prestamosNuevos
      prestamosAusentes
      prestamosFechaCorteCambiada
      prestamosSaldoCambiado
      prestamosConErrores
    }
  }
`;

export const REVERTIR_CARGA_CARTERA = `
  mutation RevertirCargaCartera($idmandante: Int!, $motivo: String!) {
    revertirCargaCartera(idmandante: $idmandante, motivo: $motivo)
  }
`;

export const SIMULAR_ASIGNACION_CARTERA = `
  query SimularAsignacionCartera(
    $filtros: FiltrosAsignacionInput!
    $idgestores: [Int!]!
    $metodo: String!
  ) {
    simularAsignacionCartera(filtros: $filtros, idgestores: $idgestores, metodo: $metodo) {
      metodo
      totalPrestamos
      totalSaldo
      gestores {
        idgestor
        nombre
        cantidadPrestamos
        saldoTotal
        cantidadClientes
      }
    }
  }
`;

export const EJECUTAR_ASIGNACION_CARTERA = `
  mutation EjecutarAsignacionCartera(
    $filtros: FiltrosAsignacionInput!
    $idgestores: [Int!]!
    $metodo: String!
    $motivo: String
  ) {
    ejecutarAsignacionCartera(
      filtros: $filtros
      idgestores: $idgestores
      metodo: $metodo
      motivo: $motivo
    )
  }
`;

export const CANCELAR_PRESTAMO = `
  mutation CancelarPrestamo($idprestamo: Int!, $motivo: String) {
    cancelarPrestamo(idprestamo: $idprestamo, motivo: $motivo)
  }
`;

export const TOGGLE_BLOQUEO_ASIGNACION = `
  mutation ToggleBloqueoAsignacion($idprestamo: Int!, $bloqueado: Boolean!) {
    toggleBloqueoAsignacion(idprestamo: $idprestamo, bloqueado: $bloqueado)
  }
`;

export const GET_HISTORIAL_ASIGNACION = `
  query GetHistorialAsignacion($idprestamo: Int!) {
    historialAsignacionPrestamo(idprestamo: $idprestamo) {
      idhistorial
      gestorAnterior
      gestorNuevo
      usuario
      motivo
      createdAt
    }
  }
`;

export const GET_CENTRO_INTELIGENCIA = `
  query GetCentroInteligencia($idmandante: Int) {
    centroInteligencia(idmandante: $idmandante) {
      saludCartera
      recuperacionMes
      variacionRecuperacionPct
      prestamosEnMoraPct
      promesasVencidas
      acuerdosEnRiesgo
      reclamosFueraSla
      insights {
        id
        severidad
        titulo
        descripcion
        metrica
        accionSugerida
      }
    }
  }
`;

export const GET_TENDENCIA_RECUPERACION = `
  query GetTendenciaRecuperacion($idmandante: Int, $meses: Int) {
    tendenciaRecuperacion(idmandante: $idmandante, meses: $meses) {
      periodo
      monto
    }
  }
`;

export const GET_DASHBOARD_SUPERVISOR = `
  query GetDashboardSupervisor {
    dashboardSupervisor {
      totalCobradores
      gestionesHoy
      gestionesAyer
      montoRecuperadoMes
      promesasVencidasEquipo
      casosSinGestion7d
      tasaContactoEquipoPct
      ranking {
        idgestor
        nombre
        gestiones
        montoRecuperado
        efectividadPct
      }
    }
  }
`;

export const GET_RESUMEN_MI_DIA = `
  query GetResumenMiDia {
    resumenMiDia {
      casosPrioritarios
      promesasHoy
      promesasVencidas
      gestionesHoy
      pagosHoy
      montoRecuperadoHoy
      agendaHoy
    }
  }
`;

export const GET_RANKING_COBRADORES = `
  query GetRankingCobradores($periodoDias: Int) {
    rankingCobradores(periodoDias: $periodoDias) {
      ${RANKING_COBRADOR_FIELDS}
    }
  }
`;

export const GET_MI_GAMIFICACION = `
  query GetMiGamificacion {
    miGamificacion {
      ${RANKING_COBRADOR_FIELDS}
    }
  }
`;

export const GET_CONFIG_COBRANZA = `
  query GetConfigCobranzaOperativa {
    configCobranzaOperativa {
      pagoAutoAplicar
      maxContactosDia
      acuerdoDiasGracia
      diasSinGestionAlerta
      diasMoraCastigo
      acuerdoDescuentoMaxSinAprobacion
      metaGestionesSemana
      metaRecuperacionSemana
      metaRecuperacionMes
    }
  }
`;

export const ACTUALIZAR_CONFIG_COBRANZA = `
  mutation ActualizarConfigCobranza(
    $pagoAutoAplicar: Boolean
    $maxContactosDia: Int
    $acuerdoDiasGracia: Int
    $diasSinGestionAlerta: Int
    $diasMoraCastigo: Int
    $acuerdoDescuentoMaxSinAprobacion: Int
    $metaGestionesSemana: Int
    $metaRecuperacionSemana: Int
    $metaRecuperacionMes: Int
  ) {
    actualizarConfigCobranzaOperativa(
      pagoAutoAplicar: $pagoAutoAplicar
      maxContactosDia: $maxContactosDia
      acuerdoDiasGracia: $acuerdoDiasGracia
      diasSinGestionAlerta: $diasSinGestionAlerta
      diasMoraCastigo: $diasMoraCastigo
      acuerdoDescuentoMaxSinAprobacion: $acuerdoDescuentoMaxSinAprobacion
      metaGestionesSemana: $metaGestionesSemana
      metaRecuperacionSemana: $metaRecuperacionSemana
      metaRecuperacionMes: $metaRecuperacionMes
    ) {
      pagoAutoAplicar
      maxContactosDia
      acuerdoDiasGracia
      diasSinGestionAlerta
      diasMoraCastigo
      acuerdoDescuentoMaxSinAprobacion
      metaGestionesSemana
      metaRecuperacionSemana
      metaRecuperacionMes
    }
  }
`;

export const GET_METAS_GAMIFICACION = `
  query GetMetasGamificacion {
    metasGamificacion {
      metaGestionesSemana
      metaRecuperacionSemana
      gestionesSemana
      recuperacionSemana
      pctGestiones
      pctRecuperacion
      metaGestionesCumplida
      metaRecuperacionCumplida
    }
  }
`;

export const PROCESAR_ACUERDOS_VENCIDOS = `
  mutation ProcesarAcuerdosVencidos {
    procesarAcuerdosVencidos {
      evaluados
      rotos
    }
  }
`;

export const PROCESAR_PROMESAS_VENCIDAS = `
  mutation ProcesarPromesasVencidas {
    procesarPromesasVencidas {
      evaluados
      vencidas
      cumplidas
    }
  }
`;

export const GET_TIMELINE_PRESTAMO = `
  query GetTimelinePrestamo($idprestamo: Int!, $limite: Int) {
    timelinePrestamo(idprestamo: $idprestamo, limite: $limite) {
      id
      tipo
      titulo
      descripcion
      usuario
      metadata
      fecha
    }
  }
`;

export const GET_HISTORIAL_ESTADOS_PRESTAMO = `
  query GetHistorialEstadosPrestamo($idprestamo: Int!) {
    historialEstadosPrestamo(idprestamo: $idprestamo) {
      idhistorial
      estadoAnterior
      estadoNuevo
      motivo
      usuario
      createdAt
    }
  }
`;

export const GET_CASOS_PRIORITARIOS_MI_DIA = `
  query GetCasosPrioritariosMiDia($limite: Int) {
    casosPrioritariosMiDia(limite: $limite) {
      idprestamo
      noPrestamo
      nombreCliente
      saldoTotal
      diasMora
      scorePrioridad
      motivoPrioridad
    }
  }
`;

export const GET_LIQUIDACION_DETALLE = `
  query GetLiquidacionDetalle($idliquidacion: Int!) {
    liquidacionDetalle(idliquidacion: $idliquidacion) {
      idpago
      idprestamo
      noPrestamo
      monto
      diasMora
      nombreGestor
      montoComision
      ingresoEmpresa
    }
  }
`;

export const TRANSICIONAR_ESTADO_PRESTAMO = `
  mutation TransicionarEstadoPrestamo($input: TransicionEstadoInput!) {
    transicionarEstadoPrestamo(input: $input) {
      idprestamo
      estado
    }
  }
`;

export const GET_NOTIFICACIONES_OPERATIVAS = `
  query GetNotificacionesOperativas($limite: Int) {
    notificacionesOperativas(limite: $limite) {
      id
      tipo
      severidad
      titulo
      mensaje
      url
      createdAt
      leida
    }
  }
`;

export const GET_DASHBOARD_GERENTE = `
  query GetDashboardGerente {
    dashboardGerente {
      totalSupervisores
      totalCobradores
      gestionesHoy
      montoRecuperadoMes
      reclamosFueraSla
      carteraTotal
      carteraEnMoraPct
      equipos {
        idsupervisor
        nombreSupervisor
        cobradores
        gestionesHoy
        montoRecuperadoMes
      }
    }
  }
`;

export const GET_ROLL_RATE = `
  query GetRollRate($mesesAtras: Int, $idmandante: Int) {
    rollRateCartera(mesesAtras: $mesesAtras, idmandante: $idmandante) {
      periodoDesde
      periodoHasta
      totalTransiciones
      buckets {
        estadoOrigen
        estadoDestino
        cantidad
        pct
      }
    }
  }
`;

export const GET_FORECAST_RECUPERACION = `
  query GetForecastRecuperacion($idmandante: Int) {
    forecastRecuperacion(idmandante: $idmandante) {
      recuperadoMesActual
      diasTranscurridos
      diasRestantesMes
      runRateDiario
      forecastFinMes
      metaMes
      pctMeta
    }
  }
`;

export const GET_KPIS_COBRANZA_CORE = `
  query GetKpisCobranzaCore($idmandante: Int) {
    kpisCobranzaCore(idmandante: $idmandante) {
      carteraTotal
      carteraEnMora
      carteraEnMoraPct
      recuperacionMes
      gestionesMes
      tasaContactoPct
      promesasAbiertas
      acuerdosVigentes
    }
  }
`;

/** Bundle: KPIs + tendencia + roll-rate + forecast (1 round-trip) */
export const GET_CENTRO_INTELIGENCIA_CHARTS = `
  query GetCentroInteligenciaCharts(
    $idmandante: Int
    $meses: Int
    $mesesAtras: Int
  ) {
    kpisCobranzaCore(idmandante: $idmandante) {
      carteraTotal
      carteraEnMora
      carteraEnMoraPct
      recuperacionMes
      gestionesMes
      tasaContactoPct
      promesasAbiertas
      acuerdosVigentes
    }
    tendenciaRecuperacion(idmandante: $idmandante, meses: $meses) {
      periodo
      monto
    }
    rollRateCartera(mesesAtras: $mesesAtras, idmandante: $idmandante) {
      periodoDesde
      periodoHasta
      totalTransiciones
      buckets {
        estadoOrigen
        estadoDestino
        cantidad
        pct
      }
    }
    forecastRecuperacion(idmandante: $idmandante) {
      recuperadoMesActual
      diasTranscurridos
      diasRestantesMes
      runRateDiario
      forecastFinMes
      metaMes
      pctMeta
    }
  }
`;

/** Bundle: reportes operativos (1 round-trip por mandante) */
export const GET_REPORTES_DASHBOARD = `
  query GetReportesDashboard(
    $idmandante: Int!
    $periodo: String
    $meses: Int
  ) {
    reporteCobranza(idmandante: $idmandante, periodo: $periodo) {
      idmandante
      periodo
      totalPrestamos
      prestamosEnMora
      saldoCartera
      totalRecuperado
      totalGestiones
      totalAcuerdosVigentes
      tasaRecuperacion
      porGestor {
        idgestor
        nombre
        gestiones
        montoRecuperado
      }
    }
    reporteAgingCartera(idmandante: $idmandante) {
      idmandante
      saldoCarteraTotal
      totalPrestamos
      tramos {
        tramo
        tramoMoraMin
        tramoMoraMax
        cantidadPrestamos
        saldoTotal
        porcentajeSaldo
      }
    }
    forecastRecuperacion(idmandante: $idmandante) {
      recuperadoMesActual
      diasRestantesMes
      runRateDiario
      forecastFinMes
      metaMes
      pctMeta
    }
    tendenciaRecuperacion(idmandante: $idmandante, meses: $meses) {
      periodo
      monto
    }
    kpisCobranzaCore(idmandante: $idmandante) {
      carteraTotal
      carteraEnMora
      carteraEnMoraPct
      recuperacionMes
      gestionesMes
      tasaContactoPct
      promesasAbiertas
      acuerdosVigentes
    }
  }
`;

export const GET_INFORME_GERENCIAL = `
  query GetInformeGerencial($idmandante: Int!, $periodo: String!) {
    informeGerencial(idmandante: $idmandante, periodo: $periodo) {
      idmandante
      mandanteCodigo
      mandanteNombre
      periodo
      periodoLabel
      proximoPeriodoLabel
      indicadores {
        montoRecuperado
        acuerdosFormalizados
        acuerdosCumplidos
        acuerdosIncumplidos
        eficaciaAcuerdosPct
        totalGestiones
      }
      acuerdos {
        numero
        cliente
        saldoTotal
        tipoArreglo
        montoCuota
        plazo
        fechaPrimerPago
        estatus
      }
      pagos {
        cliente
        noPrestamo
        codigoUnico
        montoOriginal
        montoPagado
        fechaPago
        medioReferencia
        ejecutivo
        departamentoCiudad
        sucursal
        diasMora
      }
      segmentos {
        segmento
        descripcion
        porcentaje
      }
      canales {
        canal
        uso
      }
      accionesDesarrolladas
      perfilesGestion {
        perfil
        accion
        frecuencia
      }
      accionesRecomendadas {
        accion
        responsable
        fechaLimite
        kpiExito
      }
      planTrabajo {
        actividad
        frecuencia
        responsable
      }
      narrativa {
        resumenEjecutivo
        valoracionGeneral
        hallazgosPositivos
        brechasCriticas
        conclusion
        compromisosProximoPeriodo
      }
    }
  }
`;

export const GET_AUDITORIA_RESUMEN = `
  query GetAuditoriaResumen {
    auditoriaResumen {
      total24h
      total7d
      topEntidades {
        entidad
        cantidad
      }
    }
  }
`;

export const GET_AUDITORIA = `
  query GetAuditoria(
    $entidad: String
    $accion: String
    $entidadId: Int
    $fechaDesde: String
    $fechaHasta: String
    $page: Int
    $pageSize: Int
  ) {
    auditoria(
      entidad: $entidad
      accion: $accion
      entidadId: $entidadId
      fechaDesde: $fechaDesde
      fechaHasta: $fechaHasta
      page: $page
      pageSize: $pageSize
    ) {
      total
      page
      pageSize
      totalPages
      filas {
        idauditoria
        entidad
        entidadId
        accion
        detalle
        usuario
        createdAt
      }
    }
  }
`;

export const GET_CRON_MONITOR = `
  query GetCronMonitor {
    cronMonitor {
      estadisticas {
        totalJobs
        jobsActivos
        ejecucionesOk24h
        ejecucionesError24h
        ultimaEjecucionGlobal
      }
      jobs {
        idjob
        codigo
        nombre
        descripcion
        schedule
        activo
        timeoutMs
        maxReintentos
        orden
        ultimaEjecucion
        proximaEjecucion
        ultimoEstado
      }
      ejecucionesRecientes {
        idejecucion
        codigoJob
        nombreJob
        estado
        intento
        trigger
        iniciadoEn
        finalizadoEn
        duracionMs
        registrosProcesados
        error
      }
    }
  }
`;

export const GET_CRON_EJECUCIONES = `
  query GetCronEjecuciones($codigoJob: String, $estado: String, $page: Int, $pageSize: Int) {
    cronEjecuciones(codigoJob: $codigoJob, estado: $estado, page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      totalPages
      filas {
        idejecucion
        codigoJob
        nombreJob
        estado
        intento
        trigger
        iniciadoEn
        finalizadoEn
        duracionMs
        registrosProcesados
        error
        resultado
      }
    }
  }
`;

export const RECALCULAR_MORA_CARTERA = `
  mutation RecalcularMoraCartera($idmandante: Int) {
    recalcularMoraCartera(idmandante: $idmandante) {
      evaluados
      actualizados
    }
  }
`;

export const EJECUTAR_CRON_OPERACIONES = `
  mutation EjecutarCronOperaciones {
    ejecutarCronOperaciones {
      idejecucion
      estado
      iniciadoEn
      finalizadoEn
      duracionMs
      errores
      omitidos
    }
  }
`;

export const GET_CLIENTE_VISTA_360 = `
  query GetClienteVista360($idcliente: Int!) {
    clienteVista360(idcliente: $idcliente) {
      cliente {
        idcliente
        nombreCompleto
        numerodocumento
        celular
        telefono
        email
        direccion
      }
      totales {
        saldoTotal
        prestamosActivos
        gestionesTotal
        pagosMes
      }
      prestamos {
        idprestamo
        noPrestamo
        estado
        saldoTotal
        diasMora
        mandante
      }
      gestionesRecientes {
        idgestion
        fechaGestion
        tipo
        resultado
        gestor
      }
      pagosRecientes {
        idpago
        fechaPago
        monto
        medio
      }
      reclamos {
        idreclamo
        estado
        descripcion
        fechaLimite
      }
      contactos {
        idcontacto
        tipo
        valor
        autorizado
        noContactar
      }
    }
  }
`;


export const GET_INFORME_GESTIONES = `
  query GetInformeGestiones(
    $idmandante: Int!
    $periodo: String!
    $idgestor: Int
  ) {
    informeGestiones(
      idmandante: $idmandante
      periodo: $periodo
      idgestor: $idgestor
    ) {
      idmandante
      mandanteCodigo
      mandanteNombre
      periodo
      totalGestiones
      gestiones {
        noPrestamo
        codigoUnico
        nombreCliente
        cantCtas
        agencia
        gestor
        fechaGestion
        telefonoContacto
        codigoAccion
        codigoResultado
        nota
        razonMora
        montoPromesa
        fechaProximaGestion
        comentario
        tipificacion
        mes
        pagos
      }
    }
  }
`;

export const GET_REPORTE_GANANCIAS = `
  query GetReporteGanancias($idmandante: Int!, $periodo: String!) {
    reporteGanancias(idmandante: $idmandante, periodo: $periodo) {
      idmandante
      mandanteCodigo
      mandanteNombre
      periodo
      cantidadPagos
      totalRecuperado
      totalIngresoEmpresa
      totalComision
      gananciaNeta
      margenPct
      porGestor {
        idgestor
        nombre
        cantidadPagos
        totalRecuperado
        totalIngresoEmpresa
        totalComision
        gananciaNeta
        margenPct
      }
      porTramoMora {
        tramo
        tramoMoraMin
        tramoMoraMax
        cantidadPagos
        totalRecuperado
        totalIngresoEmpresa
        totalComision
        gananciaNeta
      }
      porGestorTramo {
        idgestor
        nombre
        tramo
        tramoMoraMin
        tramoMoraMax
        cantidadPagos
        totalRecuperado
        totalIngresoEmpresa
        totalComision
        gananciaNeta
      }
    }
  }
`;

export const GET_REPORTE_COMISIONES_COBRADORES = `
  query GetReporteComisionesCobradores(
    $idmandante: Int!
    $periodo: String
  ) {
    reporteComisionesCobradores(
      idmandante: $idmandante
      periodo: $periodo
    ) {
      idmandante
      mandanteCodigo
      mandanteNombre
      periodo
      totalComision
      totalComisionBorrador
      totalComisionEmitida
      totalComisionPagada
      cantidadLiquidaciones
      porCobrador {
        idliquidacion
        periodo
        estado
        idgestor
        nombreGestor
        cantidadPagos
        totalRecuperado
        totalIngresoEmpresa
        totalComision
      }
    }
  }
`;

export const GET_REPORTE_EFECTIVIDAD = `
  query GetReporteEfectividad($idmandante: Int!, $periodo: String!) {
    reporteEfectividad(idmandante: $idmandante, periodo: $periodo) {
      idmandante
      mandanteCodigo
      mandanteNombre
      periodo
      totalGestiones
      totalGestionesEfectivas
      efectividadPct
      tasaContactoPct
      totalRecuperado
      porGestor {
        idgestor
        nombre
        gestiones
        gestionesEfectivas
        efectividadPct
        tasaContactoPct
        montoRecuperado
        prestamosAsignados
        prestamosEnMora
        saldoAsignado
        recuperacionPct
      }
    }
  }
`;

export const GET_REPORTE_CUMPLIMIENTO_ACUERDOS = `
  query GetReporteCumplimientoAcuerdos(
    $idmandante: Int!
    $periodo: String!
  ) {
    reporteCumplimientoAcuerdos(
      idmandante: $idmandante
      periodo: $periodo
    ) {
      idmandante
      mandanteCodigo
      mandanteNombre
      periodo
      totalAcuerdos
      vigentes
      cumplidos
      rotos
      cumplimientoPct
      montoAcordadoTotal
      montoCumplido
      acuerdos {
        idacuerdo
        noPrestamo
        nombreCliente
        nombreGestor
        estado
        montoAcordado
        numeroCuotas
        cuotasPendientes
        cuotasPagadas
        cuotasVencidas
        fechaInicio
      }
    }
  }
`;

export const GET_REPORTE_CARTERA_SIN_GESTION = `
  query GetReporteCarteraSinGestion(
    $idmandante: Int!
    $diasSinGestion: Int
  ) {
    reporteCarteraSinGestion(
      idmandante: $idmandante
      diasSinGestion: $diasSinGestion
    ) {
      idmandante
      mandanteCodigo
      mandanteNombre
      diasSinGestion
      totalPrestamos
      saldoTotal
      resumenTramos {
        diasUmbral
        cantidadPrestamos
        saldoTotal
      }
      prestamos {
        idprestamo
        noPrestamo
        nombreCliente
        nombreGestor
        diasMora
        saldoTotal
        diasSinGestion
        ultimaGestion
      }
    }
  }
`;
export const GET_REPORTE_MARGEN_MANDANTES = `
  query GetReporteMargenMandantes($periodo: String!) {
    reporteMargenMandantes(periodo: $periodo) {
      periodo totalRecuperado totalIngresoEmpresa totalComision gananciaNeta margenPct
      porMandante { idmandante mandanteCodigo mandanteNombre cantidadPagos totalRecuperado totalIngresoEmpresa totalComision gananciaNeta margenPct }
    }
  }
`;

export const GET_REPORTE_COMISIONES_VS_PROYECCION = `
  query GetReporteComisionesVsProyeccion($idmandante: Int!, $periodo: String!) {
    reporteComisionesVsProyeccion(idmandante: $idmandante, periodo: $periodo) {
      idmandante mandanteCodigo mandanteNombre periodo
      proyectadoRecuperado proyectadoIngresoEmpresa proyectadoComision proyectadoPagos
      liquidadoRecuperado liquidadoComision liquidacionEstado idliquidacion
      diferencialComision diferencialRecuperado pctLiquidadoVsProyectado
    }
  }
`;

export const GET_REPORTE_INGRESO_TRAMO_MORA = `
  query GetReporteIngresoTramoMora($idmandante: Int!, $periodo: String!) {
    reporteIngresoTramoMora(idmandante: $idmandante, periodo: $periodo) {
      idmandante mandanteCodigo mandanteNombre periodo totalIngresoEmpresa totalComision gananciaNeta
      porTramo { tramo tramoMoraMin tramoMoraMax cantidadPagos totalRecuperado totalIngresoEmpresa totalComision gananciaNeta margenPct shareIngresoPct }
    }
  }
`;

export const GET_REPORTE_PROMESAS_PAGO = `
  query GetReportePromesasPago($idmandante: Int!, $periodo: String!) {
    reportePromesasPago(idmandante: $idmandante, periodo: $periodo) {
      idmandante mandanteCodigo mandanteNombre periodo totalPromesas cumplidas vencidas pendientes cumplimientoPct montoPrometido montoCumplido
      promesas { idgestion noPrestamo nombreCliente nombreGestor montoPromesa fechaPromesa estado diasVencidos }
    }
  }
`;

export const GET_REPORTE_PRODUCTIVIDAD_DIARIA = `
  query GetReporteProductividadDiaria($idmandante: Int!, $periodo: String!) {
    reporteProductividadDiaria(idmandante: $idmandante, periodo: $periodo) {
      idmandante mandanteCodigo mandanteNombre periodo totalGestiones promedioGestionesDia
      porDia { fecha idgestor nombreGestor gestiones gestionesEfectivas montoRecuperado }
      porGestor { idgestor nombreGestor diasActivos totalGestiones promedioGestionesDia totalRecuperado }
    }
  }
`;

export const GET_REPORTE_RECONTACTOS = `
  query GetReporteRecontactos($idmandante: Int!, $periodo: String!, $minGestiones: Int) {
    reporteRecontactos(idmandante: $idmandante, periodo: $periodo, minGestiones: $minGestiones) {
      idmandante mandanteCodigo mandanteNombre periodo minGestiones totalPrestamos saldoTotal
      prestamos { idprestamo noPrestamo nombreCliente nombreGestor gestionesPeriodo diasMora saldoTotal ultimaGestion }
    }
  }
`;

export const GET_REPORTE_RECLAMOS_SLA = `
  query GetReporteReclamosSla($idmandante: Int!) {
    reporteReclamosSla(idmandante: $idmandante) {
      idmandante mandanteCodigo mandanteNombre totalReclamos abiertos enProceso resueltos fueraSla pctFueraSla
      reclamos { idreclamo estado descripcion fechaLimite createdAt fueraSla diasFueraSla noPrestamo nombreCliente }
    }
  }
`;

export const GET_REPORTE_MIGRACION_MORA = `
  query GetReporteMigracionMora($idmandante: Int!, $periodo: String!) {
    reporteMigracionMora(idmandante: $idmandante, periodo: $periodo) {
      idmandante mandanteCodigo mandanteNombre periodo fechaOrigen fechaDestino totalPrestamos
      migraciones { tramoOrigen tramoDestino cantidad saldoDestino pct }
    }
  }
`;

export const GET_REPORTE_CONCENTRACION_RIESGO = `
  query GetReporteConcentracionRiesgo($idmandante: Int!, $topN: Int) {
    reporteConcentracionRiesgo(idmandante: $idmandante, topN: $topN) {
      idmandante mandanteCodigo mandanteNombre saldoMoraTotal
      topDeudores { tipo id nombre cantidadPrestamos saldoMora shareSaldoPct }
      topGestores { tipo id nombre cantidadPrestamos saldoMora shareSaldoPct }
    }
  }
`;

export const GET_REPORTE_CUOTAS_VENCIDAS = `
  query GetReporteCuotasVencidas($idmandante: Int!) {
    reporteCuotasVencidas(idmandante: $idmandante) {
      idmandante mandanteCodigo mandanteNombre totalCuotas montoTotal
      cuotas { idcuota idacuerdo noPrestamo nombreCliente nombreGestor numeroCuota montoCuota fechaVencimiento diasVencidos estadoAcuerdo }
    }
  }
`;

export const GET_REPORTE_CUMPLIMIENTO_METAS = `
  query GetReporteCumplimientoMetas($idmandante: Int!, $periodo: String!) {
    reporteCumplimientoMetas(idmandante: $idmandante, periodo: $periodo) {
      idmandante mandanteCodigo mandanteNombre periodo metaRecuperacionMandante recuperadoMandante pctMetaMandante
      cobradores { idgestor nombre metaRecuperacionMes recuperadoMes pctMetaRecuperacion metaGestionesSemana gestionesSemana pctMetaGestiones metaRecuperacionCumplida metaGestionesCumplida }
    }
  }
`;

export const GET_REPORTE_SUPERVISOR_EQUIPO = `
  query GetReporteSupervisorEquipo($idmandante: Int!, $periodo: String!) {
    reporteSupervisorEquipo(idmandante: $idmandante, periodo: $periodo) {
      idmandante mandanteCodigo mandanteNombre periodo totalCobradores promedioRecuperado promedioEfectividad totalRecuperado
      ranking { idgestor nombre gestiones gestionesEfectivas efectividadPct montoRecuperado brechaVsPromedioRecuperado brechaVsPromedioEfectividad }
    }
  }
`;
