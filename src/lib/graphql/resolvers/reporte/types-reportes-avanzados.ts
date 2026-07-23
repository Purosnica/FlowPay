import { builder } from '../../builder';
import type {
  ReporteClienteObligaciones,
  ReporteComisionesVsProyeccion,
  ReporteConcentracionRiesgo,
  ReporteCumplimientoMetas,
  ReporteCuotasVencidas,
  ReporteIngresoTramoMora,
  ReporteMargenMandantes,
  ReporteMigracionMora,
  ReporteProductividadDiaria,
  ReportePromesasPago,
  ReporteReclamosSla,
  ReporteRecontactos,
  ReporteSupervisorEquipo,
} from '@/types/cobranza';

const ReporteMargenMandanteItemType = builder
  .objectRef<ReporteMargenMandantes['porMandante'][number]>(
    'ReporteMargenMandanteItem',
  )
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      cantidadPagos: t.exposeInt('cantidadPagos'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
      totalIngresoEmpresa: t.exposeFloat('totalIngresoEmpresa'),
      totalComision: t.exposeFloat('totalComision'),
      gananciaNeta: t.exposeFloat('gananciaNeta'),
      margenPct: t.exposeFloat('margenPct'),
    }),
  });

export const ReporteMargenMandantesType = builder
  .objectRef<ReporteMargenMandantes>('ReporteMargenMandantes')
  .implement({
    fields: (t) => ({
      periodo: t.exposeString('periodo'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
      totalIngresoEmpresa: t.exposeFloat('totalIngresoEmpresa'),
      totalComision: t.exposeFloat('totalComision'),
      gananciaNeta: t.exposeFloat('gananciaNeta'),
      margenPct: t.exposeFloat('margenPct'),
      porMandante: t.field({
        type: [ReporteMargenMandanteItemType],
        resolve: (p) => p.porMandante,
      }),
    }),
  });

export const ReporteComisionesVsProyeccionType = builder
  .objectRef<ReporteComisionesVsProyeccion>('ReporteComisionesVsProyeccion')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      proyectadoRecuperado: t.exposeFloat('proyectadoRecuperado'),
      proyectadoIngresoEmpresa: t.exposeFloat('proyectadoIngresoEmpresa'),
      proyectadoComision: t.exposeFloat('proyectadoComision'),
      proyectadoPagos: t.exposeInt('proyectadoPagos'),
      liquidadoRecuperado: t.exposeFloat('liquidadoRecuperado'),
      liquidadoComision: t.exposeFloat('liquidadoComision'),
      liquidacionEstado: t.exposeString('liquidacionEstado', {
        nullable: true,
      }),
      idliquidacion: t.exposeInt('idliquidacion', { nullable: true }),
      diferencialComision: t.exposeFloat('diferencialComision'),
      diferencialRecuperado: t.exposeFloat('diferencialRecuperado'),
      pctLiquidadoVsProyectado: t.exposeFloat('pctLiquidadoVsProyectado'),
    }),
  });

const ReporteIngresoTramoItemType = builder
  .objectRef<ReporteIngresoTramoMora['porTramo'][number]>(
    'ReporteIngresoTramoItem',
  )
  .implement({
    fields: (t) => ({
      tramo: t.exposeString('tramo'),
      tramoMoraMin: t.exposeInt('tramoMoraMin'),
      tramoMoraMax: t.exposeInt('tramoMoraMax', { nullable: true }),
      cantidadPagos: t.exposeInt('cantidadPagos'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
      totalIngresoEmpresa: t.exposeFloat('totalIngresoEmpresa'),
      totalComision: t.exposeFloat('totalComision'),
      gananciaNeta: t.exposeFloat('gananciaNeta'),
      margenPct: t.exposeFloat('margenPct'),
      shareIngresoPct: t.exposeFloat('shareIngresoPct'),
    }),
  });

export const ReporteIngresoTramoMoraType = builder
  .objectRef<ReporteIngresoTramoMora>('ReporteIngresoTramoMora')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      totalIngresoEmpresa: t.exposeFloat('totalIngresoEmpresa'),
      totalComision: t.exposeFloat('totalComision'),
      gananciaNeta: t.exposeFloat('gananciaNeta'),
      porTramo: t.field({
        type: [ReporteIngresoTramoItemType],
        resolve: (p) => p.porTramo,
      }),
    }),
  });

const ReportePromesaPagoItemType = builder
  .objectRef<ReportePromesasPago['promesas'][number]>('ReportePromesaPagoItem')
  .implement({
    fields: (t) => ({
      idgestion: t.exposeInt('idgestion'),
      noPrestamo: t.exposeString('noPrestamo'),
      nombreCliente: t.exposeString('nombreCliente'),
      nombreGestor: t.exposeString('nombreGestor', { nullable: true }),
      montoPromesa: t.exposeFloat('montoPromesa'),
      fechaPromesa: t.exposeString('fechaPromesa'),
      estado: t.exposeString('estado'),
      diasVencidos: t.exposeInt('diasVencidos', { nullable: true }),
    }),
  });

export const ReportePromesasPagoType = builder
  .objectRef<ReportePromesasPago>('ReportePromesasPago')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      totalPromesas: t.exposeInt('totalPromesas'),
      cumplidas: t.exposeInt('cumplidas'),
      vencidas: t.exposeInt('vencidas'),
      pendientes: t.exposeInt('pendientes'),
      cumplimientoPct: t.exposeFloat('cumplimientoPct'),
      montoPrometido: t.exposeFloat('montoPrometido'),
      montoCumplido: t.exposeFloat('montoCumplido'),
      promesas: t.field({
        type: [ReportePromesaPagoItemType],
        resolve: (p) => p.promesas,
      }),
    }),
  });

const ReporteProductividadDiaItemType = builder
  .objectRef<ReporteProductividadDiaria['porDia'][number]>(
    'ReporteProductividadDiaItem',
  )
  .implement({
    fields: (t) => ({
      fecha: t.exposeString('fecha'),
      idgestor: t.exposeInt('idgestor'),
      nombreGestor: t.exposeString('nombreGestor'),
      gestiones: t.exposeInt('gestiones'),
      gestionesEfectivas: t.exposeInt('gestionesEfectivas'),
      montoRecuperado: t.exposeFloat('montoRecuperado'),
    }),
  });

const ReporteProductividadGestorResumenType = builder
  .objectRef<ReporteProductividadDiaria['porGestor'][number]>(
    'ReporteProductividadGestorResumen',
  )
  .implement({
    fields: (t) => ({
      idgestor: t.exposeInt('idgestor'),
      nombreGestor: t.exposeString('nombreGestor'),
      diasActivos: t.exposeInt('diasActivos'),
      totalGestiones: t.exposeInt('totalGestiones'),
      promedioGestionesDia: t.exposeFloat('promedioGestionesDia'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
    }),
  });

export const ReporteProductividadDiariaType = builder
  .objectRef<ReporteProductividadDiaria>('ReporteProductividadDiaria')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      totalGestiones: t.exposeInt('totalGestiones'),
      promedioGestionesDia: t.exposeFloat('promedioGestionesDia'),
      porDia: t.field({
        type: [ReporteProductividadDiaItemType],
        resolve: (p) => p.porDia,
      }),
      porGestor: t.field({
        type: [ReporteProductividadGestorResumenType],
        resolve: (p) => p.porGestor,
      }),
    }),
  });

const ReporteRecontactoItemType = builder
  .objectRef<ReporteRecontactos['prestamos'][number]>('ReporteRecontactoItem')
  .implement({
    fields: (t) => ({
      idprestamo: t.exposeInt('idprestamo'),
      noPrestamo: t.exposeString('noPrestamo'),
      nombreCliente: t.exposeString('nombreCliente'),
      nombreGestor: t.exposeString('nombreGestor', { nullable: true }),
      gestionesPeriodo: t.exposeInt('gestionesPeriodo'),
      diasMora: t.exposeInt('diasMora'),
      saldoTotal: t.exposeFloat('saldoTotal'),
      ultimaGestion: t.exposeString('ultimaGestion', { nullable: true }),
    }),
  });

export const ReporteRecontactosType = builder
  .objectRef<ReporteRecontactos>('ReporteRecontactos')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      minGestiones: t.exposeInt('minGestiones'),
      totalPrestamos: t.exposeInt('totalPrestamos'),
      saldoTotal: t.exposeFloat('saldoTotal'),
      prestamos: t.field({
        type: [ReporteRecontactoItemType],
        resolve: (p) => p.prestamos,
      }),
    }),
  });

const ReporteReclamoSlaItemType = builder
  .objectRef<ReporteReclamosSla['reclamos'][number]>('ReporteReclamoSlaItem')
  .implement({
    fields: (t) => ({
      idreclamo: t.exposeInt('idreclamo'),
      estado: t.exposeString('estado'),
      descripcion: t.exposeString('descripcion'),
      fechaLimite: t.exposeString('fechaLimite'),
      createdAt: t.exposeString('createdAt'),
      fueraSla: t.exposeBoolean('fueraSla'),
      diasFueraSla: t.exposeInt('diasFueraSla', { nullable: true }),
      noPrestamo: t.exposeString('noPrestamo', { nullable: true }),
      nombreCliente: t.exposeString('nombreCliente'),
    }),
  });

export const ReporteReclamosSlaType = builder
  .objectRef<ReporteReclamosSla>('ReporteReclamosSla')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      totalReclamos: t.exposeInt('totalReclamos'),
      abiertos: t.exposeInt('abiertos'),
      enProceso: t.exposeInt('enProceso'),
      resueltos: t.exposeInt('resueltos'),
      fueraSla: t.exposeInt('fueraSla'),
      pctFueraSla: t.exposeFloat('pctFueraSla'),
      reclamos: t.field({
        type: [ReporteReclamoSlaItemType],
        resolve: (p) => p.reclamos,
      }),
    }),
  });

const ReporteMigracionMoraItemType = builder
  .objectRef<ReporteMigracionMora['migraciones'][number]>(
    'ReporteMigracionMoraItem',
  )
  .implement({
    fields: (t) => ({
      tramoOrigen: t.exposeString('tramoOrigen'),
      tramoDestino: t.exposeString('tramoDestino'),
      cantidad: t.exposeInt('cantidad'),
      saldoDestino: t.exposeFloat('saldoDestino'),
      pct: t.exposeFloat('pct'),
    }),
  });

export const ReporteMigracionMoraType = builder
  .objectRef<ReporteMigracionMora>('ReporteMigracionMora')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      fechaOrigen: t.exposeString('fechaOrigen'),
      fechaDestino: t.exposeString('fechaDestino'),
      totalPrestamos: t.exposeInt('totalPrestamos'),
      migraciones: t.field({
        type: [ReporteMigracionMoraItemType],
        resolve: (p) => p.migraciones,
      }),
    }),
  });

const ReporteConcentracionItemType = builder
  .objectRef<ReporteConcentracionRiesgo['topDeudores'][number]>(
    'ReporteConcentracionItem',
  )
  .implement({
    fields: (t) => ({
      tipo: t.exposeString('tipo'),
      id: t.exposeInt('id'),
      nombre: t.exposeString('nombre'),
      cantidadPrestamos: t.exposeInt('cantidadPrestamos'),
      saldoMora: t.exposeFloat('saldoMora'),
      shareSaldoPct: t.exposeFloat('shareSaldoPct'),
    }),
  });

export const ReporteConcentracionRiesgoType = builder
  .objectRef<ReporteConcentracionRiesgo>('ReporteConcentracionRiesgo')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      saldoMoraTotal: t.exposeFloat('saldoMoraTotal'),
      topDeudores: t.field({
        type: [ReporteConcentracionItemType],
        resolve: (p) => p.topDeudores,
      }),
      topGestores: t.field({
        type: [ReporteConcentracionItemType],
        resolve: (p) => p.topGestores,
      }),
    }),
  });

const ReporteCuotaVencidaItemType = builder
  .objectRef<ReporteCuotasVencidas['cuotas'][number]>(
    'ReporteCuotaVencidaItem',
  )
  .implement({
    fields: (t) => ({
      idcuota: t.exposeInt('idcuota'),
      idacuerdo: t.exposeInt('idacuerdo'),
      noPrestamo: t.exposeString('noPrestamo'),
      nombreCliente: t.exposeString('nombreCliente'),
      nombreGestor: t.exposeString('nombreGestor', { nullable: true }),
      numeroCuota: t.exposeInt('numeroCuota'),
      montoCuota: t.exposeFloat('montoCuota'),
      fechaVencimiento: t.exposeString('fechaVencimiento'),
      diasVencidos: t.exposeInt('diasVencidos'),
      estadoAcuerdo: t.exposeString('estadoAcuerdo'),
    }),
  });

export const ReporteCuotasVencidasType = builder
  .objectRef<ReporteCuotasVencidas>('ReporteCuotasVencidas')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      totalCuotas: t.exposeInt('totalCuotas'),
      montoTotal: t.exposeFloat('montoTotal'),
      cuotas: t.field({
        type: [ReporteCuotaVencidaItemType],
        resolve: (p) => p.cuotas,
      }),
    }),
  });

const ReporteCumplimientoMetaItemType = builder
  .objectRef<ReporteCumplimientoMetas['cobradores'][number]>(
    'ReporteCumplimientoMetaItem',
  )
  .implement({
    fields: (t) => ({
      idgestor: t.exposeInt('idgestor'),
      nombre: t.exposeString('nombre'),
      metaRecuperacionMes: t.exposeFloat('metaRecuperacionMes'),
      recuperadoMes: t.exposeFloat('recuperadoMes'),
      pctMetaRecuperacion: t.exposeFloat('pctMetaRecuperacion'),
      metaGestionesSemana: t.exposeFloat('metaGestionesSemana'),
      gestionesSemana: t.exposeInt('gestionesSemana'),
      pctMetaGestiones: t.exposeFloat('pctMetaGestiones'),
      metaRecuperacionCumplida: t.exposeBoolean('metaRecuperacionCumplida'),
      metaGestionesCumplida: t.exposeBoolean('metaGestionesCumplida'),
    }),
  });

export const ReporteCumplimientoMetasType = builder
  .objectRef<ReporteCumplimientoMetas>('ReporteCumplimientoMetas')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      metaRecuperacionMandante: t.exposeFloat('metaRecuperacionMandante'),
      recuperadoMandante: t.exposeFloat('recuperadoMandante'),
      pctMetaMandante: t.exposeFloat('pctMetaMandante'),
      cobradores: t.field({
        type: [ReporteCumplimientoMetaItemType],
        resolve: (p) => p.cobradores,
      }),
    }),
  });

const ReporteSupervisorEquipoItemType = builder
  .objectRef<ReporteSupervisorEquipo['ranking'][number]>(
    'ReporteSupervisorEquipoItem',
  )
  .implement({
    fields: (t) => ({
      idgestor: t.exposeInt('idgestor'),
      nombre: t.exposeString('nombre'),
      gestiones: t.exposeInt('gestiones'),
      gestionesEfectivas: t.exposeInt('gestionesEfectivas'),
      efectividadPct: t.exposeFloat('efectividadPct'),
      montoRecuperado: t.exposeFloat('montoRecuperado'),
      brechaVsPromedioRecuperado: t.exposeFloat('brechaVsPromedioRecuperado'),
      brechaVsPromedioEfectividad: t.exposeFloat(
        'brechaVsPromedioEfectividad',
      ),
    }),
  });

export const ReporteSupervisorEquipoType = builder
  .objectRef<ReporteSupervisorEquipo>('ReporteSupervisorEquipo')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      totalCobradores: t.exposeInt('totalCobradores'),
      promedioRecuperado: t.exposeFloat('promedioRecuperado'),
      promedioEfectividad: t.exposeFloat('promedioEfectividad'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
      ranking: t.field({
        type: [ReporteSupervisorEquipoItemType],
        resolve: (p) => p.ranking,
      }),
    }),
  });

const ReporteClienteObligacionItemType = builder
  .objectRef<ReporteClienteObligaciones['clientes'][number]['obligaciones'][number]>(
    'ReporteClienteObligacionItem',
  )
  .implement({
    fields: (t) => ({
      idprestamo: t.exposeInt('idprestamo'),
      noPrestamo: t.exposeString('noPrestamo'),
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      estado: t.exposeString('estado'),
      saldoTotal: t.exposeFloat('saldoTotal'),
      diasMora: t.exposeInt('diasMora'),
      moneda: t.exposeString('moneda'),
    }),
  });

const ReporteClienteMandanteResumenType = builder
  .objectRef<ReporteClienteObligaciones['clientes'][number]['mandantes'][number]>(
    'ReporteClienteMandanteResumen',
  )
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      cantidadPrestamos: t.exposeInt('cantidadPrestamos'),
      saldoTotal: t.exposeFloat('saldoTotal'),
      maxDiasMora: t.exposeInt('maxDiasMora'),
    }),
  });

const ReporteClienteObligacionesClienteType = builder
  .objectRef<ReporteClienteObligaciones['clientes'][number]>(
    'ReporteClienteObligacionesCliente',
  )
  .implement({
    fields: (t) => ({
      idcliente: t.exposeInt('idcliente'),
      nombreCliente: t.exposeString('nombreCliente'),
      numerodocumento: t.exposeString('numerodocumento'),
      cantidadMandantesConDeuda: t.exposeInt('cantidadMandantesConDeuda'),
      cantidadPrestamos: t.exposeInt('cantidadPrestamos'),
      saldoTotal: t.exposeFloat('saldoTotal'),
      maxDiasMora: t.exposeInt('maxDiasMora'),
      mandantes: t.field({
        type: [ReporteClienteMandanteResumenType],
        resolve: (p) => p.mandantes,
      }),
      obligaciones: t.field({
        type: [ReporteClienteObligacionItemType],
        resolve: (p) => p.obligaciones,
      }),
    }),
  });

export const ReporteClienteObligacionesType = builder
  .objectRef<ReporteClienteObligaciones>('ReporteClienteObligaciones')
  .implement({
    fields: (t) => ({
      minMandantes: t.exposeInt('minMandantes'),
      totalClientes: t.exposeInt('totalClientes'),
      totalSaldo: t.exposeFloat('totalSaldo'),
      totalPrestamos: t.exposeInt('totalPrestamos'),
      clientesMultiMandante: t.exposeInt('clientesMultiMandante'),
      clientes: t.field({
        type: [ReporteClienteObligacionesClienteType],
        resolve: (p) => p.clientes,
      }),
    }),
  });
