export interface Mandante {
  idmandante: number;
  codigo: string;
  nombre: string;
  ruc: string | null;
  regulador: string | null;
  descuentoMaximo: number;
  estado: boolean;
}

export interface Campana {
  idcampana: number;
  idmandante: number;
  nombre: string;
  fechaCorte: string;
  fechaCarga: string;
  estado: string;
}

export interface PrestamoCliente {
  idcliente: number;
  primer_nombres: string;
  segundo_nombres: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  numerodocumento: string;
  celular: string | null;
  telefono: string | null;
  email?: string | null;
  direccion?: string | null;
}

export interface Prestamo {
  idprestamo: number;
  idmandante: number;
  idcampana: number | null;
  idcliente: number;
  noPrestamo: string;
  codigoUnico: string;
  noCuenta: string | null;
  estado: string;
  moneda: string;
  diasMora: number;
  saldoTotal: number;
  montoPrestamo: number;
  interes: number;
  interesMoratorio: number;
  gestionCobranza?: number;
  reportableCentralRiesgo: boolean;
  fechaPrestamo: string | null;
  fechaVencimiento: string | null;
  ultimaFechaPago: string | null;
  cliente?: PrestamoCliente;
  mandante?: Mandante;
  gestor?: { idusuario: number; nombre: string } | null;
}

export interface DesgloseSaldoPrestamo {
  montoPrestamo: number;
  interes: number;
  gestionCobranza: number;
  comisionCav: number;
  comisionInsitu: number;
  mantenimientoValor: number;
  seguroSvsd: number;
  cargosAdmin: number;
  devolucionSaldoFavor: number;
  descuentosArchivo: number;
  interesMoratorio: number;
  subtotalComponentes: number;
  totalPagosAplicados: number;
  saldoCalculado: number;
  saldoRegistrado: number;
  baseAcuerdo: number;
  descuentoAcuerdoVigente: number;
  diferencia: number;
  cuadra: boolean;
}

export interface FilaDesglosePreview {
  fila: number;
  noPrestamo: string;
  subtotalComponentes: number;
  interesMoratorio: number;
  baseAcuerdo: number;
  totalPagosAplicados: number;
  saldoCalculado: number;
  saldoArchivo: number;
  diferencia: number;
  cuadra: boolean;
}

export interface ResumenDesglosePreview {
  filasAnalizadas: number;
  filasCuadran: number;
  filasConDiferencia: number;
  totalSubtotalComponentes: number;
  totalInteresMoratorio: number;
  totalPagos: number;
  totalSaldoCalculado: number;
  totalSaldoArchivo: number;
}

export interface PrestamoFilters {
  idmandante?: number;
  idcampana?: number;
  idcliente?: number;
  idgestorAsignado?: number;
  estado?: string;
  search?: string;
  sinAsignar?: boolean;
}

export type BandejaOrdenarPor = 'prioridad' | 'saldo_desc' | 'saldo_asc';

export interface BandejaFilters {
  idmandante?: number;
  search?: string;
  tramoMoraMin?: number;
  tramoMoraMax?: number | null;
  ordenarPor?: BandejaOrdenarPor;
  soloPromesaVencida?: boolean;
  soloAgendaHoy?: boolean;
  soloSinGestion?: boolean;
  prioridadMin?: number;
}

export interface CodigoAccion {
  idcodaccion: number;
  codigo: string;
  descripcion: string;
  esTercero: boolean;
}

export interface CodigoResultado {
  idcodresultado: number;
  codigo: string;
  descripcion: string;
  grupo: string;
  tipoGestion: string;
}

export interface Gestion {
  idgestion: number;
  idprestamo: number;
  fechaGestion: string;
  nota: string;
  telefonoContacto: string | null;
  contactoTercero: boolean;
  montoPromesa: number | null;
  fechaPromesa: string | null;
  fechaProximaGestion?: string | null;
  gestor: { nombre: string };
  codaccion: { codigo: string; descripcion: string } | null;
  codresult: { codigo: string; descripcion: string } | null;
  prestamo?: {
    idprestamo: number;
    noPrestamo: string;
    diasMora: number;
    saldoTotal: number;
    cliente: {
      primer_nombres: string;
      primer_apellido: string;
      numerodocumento: string;
    };
  };
}

export type GestionHoy = Gestion;

export interface SimulacionAcuerdo {
  baseNegociable: number;
  montoDescuento: number;
  montoAcordado: number;
  montoCuota: number;
  pagoMinimo: number;
  interesMoratorioExcluido: number;
  gestionCobranzaExcluida: number;
  montoPagableLedger: number;
}

export interface AcuerdoCuota {
  idcuota: number;
  numeroCuota: number;
  montoCuota: number;
  fechaVencimiento: string;
  estado: string;
}

export interface Acuerdo {
  idacuerdo: number;
  idprestamo: number;
  porcentajeDesc: number;
  baseNegociable: number;
  montoDescuento: number;
  montoAcordado: number;
  numeroCuotas: number;
  montoCuota: number;
  pagoMinimo: number | null;
  dispensarInteresMoratorio: boolean;
  dispensarGestionCobranza: boolean;
  fechaInicio: string;
  estado: string;
  cuotas?: AcuerdoCuota[];
}

export interface Pago {
  idpago: number;
  idprestamo: number;
  fechaPago: string;
  monto: number;
  moneda: string;
  medio: string | null;
  aplicado: boolean;
  reciboUrl?: string | null;
}

export interface ComprobantePago {
  idpago: number;
  idprestamo: number;
  folio: string;
  fechaPago: string;
  fechaRegistro: string;
  monto: number;
  moneda: string;
  saldoAnterior: number;
  saldoNuevo: number;
  reciboUrl: string;
  noPrestamo: string;
  codigoUnico: string;
  nombreCliente: string;
  numerodocumento: string;
  mandanteNombre: string;
  mandanteCodigo: string;
  mandanteRuc: string | null;
  gestorNombre: string | null;
}

export interface UsuarioBasico {
  idusuario: number;
  nombre: string;
  email: string;
  idrol?: number;
}

export interface UsuarioMandanteAsignado extends UsuarioBasico {
  idrol: number;
  porcentajeComisionMandante: number | null;
  porcentajeComisionUsuario: number;
  porcentajeComision: number;
}

export interface PlantillaImportacion {
  idplantillaImp: number;
  idmandante: number;
  nombre: string;
  mapeo: string;
  formatoFecha: string | null;
  estado: boolean;
}

import type { ResultadoImportacionCartera } from '@/lib/cobranza/import/types';

export type { ResultadoImportacionCartera };

export interface ResultadoImportacionGestiones {
  totalFilas: number;
  gestionesCreadas: number;
  omitidos: number;
  errores: { fila: number; mensaje: string }[];
}

export interface ResultadoImportacionPagos {
  totalFilas: number;
  pagosCreados: number;
  omitidos: number;
  errores: { fila: number; mensaje: string }[];
}

export interface ResultadoImportacionCompleta {
  tipo: string;
  cartera?: ResultadoImportacionCartera;
  gestiones?: ResultadoImportacionGestiones;
  pagos?: ResultadoImportacionPagos;
  advertencias?: string[];
}

export interface Liquidacion {
  idliquidacion: number;
  idmandante: number;
  periodo: string;
  totalRecuperado: number;
  totalComision: number;
  estado: string;
  createdAt: string;
  mandante?: { nombre: string; codigo: string };
}

export interface DetallePagoLiquidacion {
  idpago: number;
  idprestamo: number;
  noPrestamo: string;
  /** Monto en moneda base de liquidación. */
  monto: number;
  monedaOriginal: string;
  montoOriginal: number;
  tipoCambioAplicado: number;
  diasMora: number;
  idgestor: number | null;
  nombreGestor: string | null;
  porcentajeRecuperacion: number;
  ingresoEmpresa: number;
  porcentajeComisionCobrador: number;
  montoComision: number;
}

export interface SimulacionLiquidacion {
  idmandante: number;
  periodo: string;
  moneda: string;
  totalRecuperado: number;
  totalIngresoEmpresa: number;
  totalComision: number;
  cantidadPagos: number;
  detalle: DetallePagoLiquidacion[];
}

export interface ReporteGestorItem {
  idgestor: number;
  nombre: string;
  gestiones: number;
  montoRecuperado: number;
}

export interface ReporteCobranza {
  idmandante: number;
  periodo: string | null;
  totalPrestamos: number;
  prestamosEnMora: number;
  saldoCartera: number;
  totalRecuperado: number;
  totalGestiones: number;
  totalAcuerdosVigentes: number;
  tasaRecuperacion: number;
  porGestor: ReporteGestorItem[];
}

export interface AgingTramoReporte {
  tramo: string;
  tramoMoraMin: number;
  tramoMoraMax: number | null;
  cantidadPrestamos: number;
  saldoTotal: number;
  porcentajeSaldo: number;
}

export interface ReporteAgingCartera {
  idmandante: number;
  saldoCarteraTotal: number;
  totalPrestamos: number;
  tramos: AgingTramoReporte[];
}

export interface ComisionCobro {
  idcomision: number;
  idmandante: number;
  tramoMoraMin: number;
  tramoMoraMax: number | null;
  porcentaje: number;
  estado: boolean;
}

export interface PoliticaDescuento {
  idpolitica: number;
  tramoMoraMin: number;
  tramoMoraMax: number | null;
  porcentaje: number;
  estado: boolean;
}

export interface PlantillaMensaje {
  idplantilla: number;
  idmandante: number;
  nombre: string;
  canal: string;
  etapa: string | null;
  contenido: string;
  estado: boolean;
}

export interface Fiador {
  idfiador: number;
  nombre: string;
  telefono: string | null;
  tipo: string;
}

export interface DocumentoPrestamo {
  iddocumento: number;
  tipo: string;
  url: string;
  createdAt: string;
}

export interface HorarioCobranza {
  idhorario: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  permitido: boolean;
}

export interface ReclamoCliente {
  primer_nombres: string;
  primer_apellido: string;
  numerodocumento: string;
}

export interface Reclamo {
  idreclamo: number;
  descripcion: string;
  estado: string;
  fechaLimite: string;
  createdAt: string;
  cliente?: ReclamoCliente;
  prestamo?: { noPrestamo: string };
}

export interface DeudorContacto {
  idcontacto: number;
  idcliente: number;
  tipo: string;
  valor: string;
  fuente: string;
  autorizado: boolean;
  esTercero: boolean;
  noContactar: boolean;
  estado: boolean;
}

export interface PrestamoCorte {
  idcorte: number;
  idprestamo: number;
  fechaCorte: string;
  saldoTotal: number | string;
  diasMora: number;
  estado: string;
}

export interface ContratoMandante {
  idcontrato: number;
  idmandante: number;
  fechaInicio: string;
  fechaFin: string | null;
  permitePagoAnticipado: boolean;
  estado: boolean;
}

export interface MandanteTipificacion {
  idmt: number;
  idmandante: number;
  idcodaccion: number | null;
  idcodresultado: number | null;
  codaccion?: CodigoAccion | null;
  codresult?: CodigoResultado | null;
}

export interface Agencia {
  idagencia: number;
  idmandante: number;
  codigo: string;
  nombre: string;
  estado: boolean;
}

export interface Ruta {
  idruta: number;
  idagencia: number;
  nombre: string;
  estado: boolean;
  agencia?: { codigo: string; nombre: string };
}

export interface DashboardResumenCobranza {
  totalPrestamos: number;
  prestamosEnMora: number;
  saldoCartera: number;
  gestionesMes: number;
  pagosMes: number;
  pagosConciliadosMes: number;
  reclamosAbiertos: number;
  promesasVencidas: number;
}

export interface PromesaVencida {
  idgestion: number;
  idprestamo: number;
  noPrestamo: string;
  nombreCliente: string;
  montoPromesa: number;
  fechaPromesa: string;
  diasVencidos: number;
}

export interface ValidacionHorario {
  permitido: boolean;
  motivo?: string;
}

export interface InsightAutomatico {
  id: string;
  severidad: string;
  titulo: string;
  descripcion: string;
  metrica?: string | null;
  accionSugerida?: string | null;
}

export interface CentroInteligenciaResumen {
  saludCartera: number;
  recuperacionMes: number;
  variacionRecuperacionPct: number;
  prestamosEnMoraPct: number;
  promesasVencidas: number;
  acuerdosEnRiesgo: number;
  reclamosFueraSla: number;
  insights: InsightAutomatico[];
}

export interface MiDiaResumen {
  casosPrioritarios: number;
  promesasHoy: number;
  promesasVencidas: number;
  gestionesHoy: number;
  pagosHoy: number;
  montoRecuperadoHoy: number;
  agendaHoy: number;
}

export interface MiDiaCaso {
  idprestamo: number;
  noPrestamo: string;
  nombreCliente: string;
  saldoTotal: number;
  diasMora: number;
  scorePrioridad: number;
  motivoPrioridad: string;
}

export interface RankingCobrador {
  idgestor: number;
  nombre: string;
  gestiones: number;
  montoRecuperado: number;
  promesasCumplidas: number;
  posicion: number;
  nivel: string;
  xp: number;
  insignias: string[];
}

export interface DashboardSupervisorResumen {
  totalCobradores: number;
  gestionesHoy: number;
  gestionesAyer: number;
  montoRecuperadoMes: number;
  promesasVencidasEquipo: number;
  casosSinGestion7d: number;
  tasaContactoEquipoPct: number;
  ranking: Array<{
    idgestor: number;
    nombre: string;
    gestiones: number;
    montoRecuperado: number;
    efectividadPct: number;
  }>;
}

export interface DashboardGerenteEquipo {
  idsupervisor: number;
  nombreSupervisor: string;
  cobradores: number;
  gestionesHoy: number;
  montoRecuperadoMes: number;
}

export interface DashboardGerenteResumen {
  totalSupervisores: number;
  totalCobradores: number;
  gestionesHoy: number;
  montoRecuperadoMes: number;
  reclamosFueraSla: number;
  carteraTotal: number;
  carteraEnMoraPct: number;
  equipos: DashboardGerenteEquipo[];
  resumenSupervisor: DashboardSupervisorResumen;
}

export interface ConfigCobranzaOperativa {
  pagoAutoAplicar: boolean;
  maxContactosDia: number;
  acuerdoDiasGracia: number;
  diasSinGestionAlerta: number;
  diasMoraCastigo: number;
  acuerdoDescuentoMaxSinAprobacion: number;
  metaGestionesSemana: number;
  metaRecuperacionSemana: number;
  metaRecuperacionMes: number;
  /** I112: límite candidatos bandeja (default 500). */
  bandejaCandidateLimit: number;
  /** I112: límite candidatos Mi día (default 200). */
  miDiaCandidateLimit: number;
}

export interface KpiCobranzaCore {
  carteraTotal: number;
  carteraEnMora: number;
  carteraEnMoraPct: number;
  recuperacionMes: number;
  gestionesMes: number;
  tasaContactoPct: number;
  promesasAbiertas: number;
  acuerdosVigentes: number;
}

export interface MetasGamificacion {
  metaGestionesSemana: number;
  metaRecuperacionSemana: number;
  gestionesSemana: number;
  recuperacionSemana: number;
  pctGestiones: number;
  pctRecuperacion: number;
  metaGestionesCumplida: boolean;
  metaRecuperacionCumplida: boolean;
}

export interface BandejaGraphQLItem {
  idprestamo: number;
  idmandante: number;
  noPrestamo: string;
  diasMora: number;
  saldoTotal: number;
  moneda: string;
  estado: string;
  scorePrioridad?: number | null;
  motivoPrioridad?: string | null;
  cliente?: PrestamoCliente | null;
  mandante?: { nombre: string } | null;
}

export function nombreCompletoCliente(cliente: PrestamoCliente): string {
  return [
    cliente.primer_nombres,
    cliente.segundo_nombres,
    cliente.primer_apellido,
    cliente.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ');
}

export function formatearMoneda(monto: number, moneda = 'NIO'): string {
  return new Intl.NumberFormat('es-NI', {
    style: 'currency',
    currency: moneda === 'USD' ? 'USD' : 'NIO',
    minimumFractionDigits: 2,
  }).format(monto);
}

export interface SecuenciaContactoPaso {
  idpaso?: number;
  orden: number;
  diasDesdeInicio: number;
  canal: string;
  accion?: string | null;
  idplantilla?: number | null;
  plantillaNombre?: string | null;
}

export interface SecuenciaContacto {
  idsecuencia: number;
  idcampana: number;
  nombre: string;
  estado: string;
  pasos?: SecuenciaContactoPaso[];
}

export interface AgendaSecuenciaItem {
  idprestamo: number;
  noPrestamo: string;
  canal: string;
  accion: string | null;
  diasDesdeInicio: number;
  nombreCliente: string;
  idpaso: number;
  idsecuencia: number;
  idplantilla: number | null;
  idmandante: number;
  plantillaNombre: string | null;
  plantillaContenido: string | null;
  telefono: string | null;
  email: string | null;
  saldoTotal: number;
  diasMora: number;
  interesMoratorio: number;
  gestionCobranza: number;
  moneda: string;
  mandanteNombre: string | null;
}

export interface ImportacionJob {
  idjob: number;
  idmandante: number;
  idcampana?: number | null;
  tipo: string;
  estado: string;
  nombreArchivo: string;
  progresoPct: number;
  filasProcesadas: number;
  filasTotales: number;
  error?: string | null;
  createdAt?: string;
  finalizadoEn?: string | null;
}

/** Informe gerencial de cierre de mes (entregable al mandante). */
export interface InformeGerencialIndicadores {
  montoRecuperado: number;
  acuerdosFormalizados: number;
  /** Solo estado CUMPLIDO (VIGENTE no cuenta como cumplido). */
  acuerdosCumplidos: number;
  /** Solo acuerdos con estado ROTO. */
  acuerdosIncumplidos: number;
  /** cumplidos / (cumplidos + rotos); VIGENTE no entra al denominador. */
  eficaciaAcuerdosPct: number;
  totalGestiones: number;
}

export interface InformeGerencialAcuerdoItem {
  numero: number;
  cliente: string;
  saldoTotal: number;
  tipoArreglo: string;
  montoCuota: number;
  plazo: string;
  fechaPrimerPago: string;
  estatus: string;
}

export interface InformeGerencialPagoItem {
  cliente: string;
  noPrestamo: string;
  codigoUnico: string;
  montoOriginal: number;
  montoPagado: number;
  fechaPago: string;
  medioReferencia: string;
  ejecutivo: string;
  departamentoCiudad: string;
  sucursal: string;
  diasMora: number;
}

export interface InformeGerencialSegmentoItem {
  segmento: string;
  descripcion: string;
  porcentaje: number;
}

export interface InformeGerencialCanalItem {
  canal: string;
  uso: string;
}

export interface InformeGerencialAccionItem {
  accion: string;
  responsable: string;
  fechaLimite: string;
  kpiExito: string;
}

export interface InformeGerencialPlanItem {
  actividad: string;
  frecuencia: string;
  responsable: string;
}

export interface InformeGerencialPerfilItem {
  perfil: string;
  accion: string;
  frecuencia: string;
}

export interface InformeGerencialNarrativaData {
  resumenEjecutivo: string;
  valoracionGeneral: string;
  hallazgosPositivos: string[];
  brechasCriticas: string[];
  conclusion: string;
  compromisosProximoPeriodo: string[];
}

export interface InformeGerencial {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  periodoLabel: string;
  proximoPeriodoLabel: string;
  indicadores: InformeGerencialIndicadores;
  acuerdos: InformeGerencialAcuerdoItem[];
  pagos: InformeGerencialPagoItem[];
  segmentos: InformeGerencialSegmentoItem[];
  canales: InformeGerencialCanalItem[];
  accionesDesarrolladas: string[];
  perfilesGestion: InformeGerencialPerfilItem[];
  accionesRecomendadas: InformeGerencialAccionItem[];
  planTrabajo: InformeGerencialPlanItem[];
  narrativa: InformeGerencialNarrativaData;
}

/** Fila del Informe de gestiones (plantilla REGISTROS / Hoja1). */
export interface InformeGestionItem {
  noPrestamo: string;
  codigoUnico: string;
  nombreCliente: string;
  cantCtas: number;
  agencia: string;
  gestor: string;
  fechaGestion: string;
  telefonoContacto: string;
  codigoAccion: string;
  codigoResultado: string;
  nota: string;
  razonMora: string;
  montoPromesa: number | null;
  fechaProximaGestion: string;
  comentario: string;
  tipificacion: string;
  mes: string;
  pagos: number;
}

export interface InformeGestiones {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  totalGestiones: number;
  gestiones: InformeGestionItem[];
}

/** Ganancias del periodo (ingreso empresa − comisión cobrador). */
export interface ReporteGananciasGestorItem {
  idgestor: number | null;
  nombre: string;
  cantidadPagos: number;
  totalRecuperado: number;
  totalIngresoEmpresa: number;
  totalComision: number;
  gananciaNeta: number;
  margenPct: number;
}

export interface ReporteGananciasTramoItem {
  tramo: string;
  tramoMoraMin: number;
  tramoMoraMax: number | null;
  cantidadPagos: number;
  totalRecuperado: number;
  totalIngresoEmpresa: number;
  totalComision: number;
  gananciaNeta: number;
}

/** Recuperado e ingreso por gestor cruzado con tramo de mora. */
export interface ReporteGananciasGestorTramoItem {
  idgestor: number | null;
  nombre: string;
  tramo: string;
  tramoMoraMin: number;
  tramoMoraMax: number | null;
  cantidadPagos: number;
  totalRecuperado: number;
  totalIngresoEmpresa: number;
  totalComision: number;
  gananciaNeta: number;
}

export interface ReporteGanancias {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  cantidadPagos: number;
  totalRecuperado: number;
  totalIngresoEmpresa: number;
  totalComision: number;
  gananciaNeta: number;
  margenPct: number;
  porGestor: ReporteGananciasGestorItem[];
  porTramoMora: ReporteGananciasTramoItem[];
  porGestorTramo: ReporteGananciasGestorTramoItem[];
}

/** Comisiones a cobradores desde liquidaciones. */
export interface ReporteComisionCobradorItem {
  idliquidacion: number;
  periodo: string;
  estado: string;
  idgestor: number | null;
  nombreGestor: string;
  cantidadPagos: number;
  totalRecuperado: number;
  totalIngresoEmpresa: number;
  totalComision: number;
}

export interface ReporteComisionesCobradores {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string | null;
  totalComision: number;
  totalComisionBorrador: number;
  totalComisionEmitida: number;
  totalComisionPagada: number;
  cantidadLiquidaciones: number;
  porCobrador: ReporteComisionCobradorItem[];
}

/** Efectividad operativa por cobrador. */
export interface ReporteEfectividadGestorItem {
  idgestor: number;
  nombre: string;
  gestiones: number;
  gestionesEfectivas: number;
  efectividadPct: number;
  tasaContactoPct: number;
  montoRecuperado: number;
  prestamosAsignados: number;
  prestamosEnMora: number;
  saldoAsignado: number;
  recuperacionPct: number;
}

export interface ReporteEfectividad {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  totalGestiones: number;
  totalGestionesEfectivas: number;
  efectividadPct: number;
  tasaContactoPct: number;
  totalRecuperado: number;
  porGestor: ReporteEfectividadGestorItem[];
}

/** Cumplimiento de acuerdos / promesas. */
export interface ReporteCumplimientoAcuerdoItem {
  idacuerdo: number;
  noPrestamo: string;
  nombreCliente: string;
  nombreGestor: string | null;
  estado: string;
  montoAcordado: number;
  numeroCuotas: number;
  cuotasPendientes: number;
  cuotasPagadas: number;
  cuotasVencidas: number;
  fechaInicio: string;
}

export interface ReporteCumplimientoAcuerdos {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  totalAcuerdos: number;
  vigentes: number;
  cumplidos: number;
  rotos: number;
  cumplimientoPct: number;
  montoAcordadoTotal: number;
  montoCumplido: number;
  acuerdos: ReporteCumplimientoAcuerdoItem[];
}

/** Cartera sin gestión reciente. */
export interface ReporteCarteraSinGestionItem {
  idprestamo: number;
  noPrestamo: string;
  nombreCliente: string;
  nombreGestor: string | null;
  diasMora: number;
  saldoTotal: number;
  diasSinGestion: number | null;
  ultimaGestion: string | null;
}

export interface ReporteCarteraSinGestionResumenTramo {
  diasUmbral: number;
  cantidadPrestamos: number;
  saldoTotal: number;
}

export interface ReporteCarteraSinGestion {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  diasSinGestion: number;
  totalPrestamos: number;
  saldoTotal: number;
  resumenTramos: ReporteCarteraSinGestionResumenTramo[];
  prestamos: ReporteCarteraSinGestionItem[];
}

/** Margen comparativo por mandante. */
export interface ReporteMargenMandanteItem {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  cantidadPagos: number;
  totalRecuperado: number;
  totalIngresoEmpresa: number;
  totalComision: number;
  gananciaNeta: number;
  margenPct: number;
}

export interface ReporteMargenMandantes {
  periodo: string;
  totalRecuperado: number;
  totalIngresoEmpresa: number;
  totalComision: number;
  gananciaNeta: number;
  margenPct: number;
  porMandante: ReporteMargenMandanteItem[];
}

/** Comisiones proyectadas vs liquidación. */
export interface ReporteComisionesVsProyeccion {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  proyectadoRecuperado: number;
  proyectadoIngresoEmpresa: number;
  proyectadoComision: number;
  proyectadoPagos: number;
  liquidadoRecuperado: number;
  liquidadoComision: number;
  liquidacionEstado: string | null;
  idliquidacion: number | null;
  diferencialComision: number;
  diferencialRecuperado: number;
  pctLiquidadoVsProyectado: number;
}

/** Rentabilidad por tramo de mora (ingreso). */
export interface ReporteIngresoTramoItem {
  tramo: string;
  tramoMoraMin: number;
  tramoMoraMax: number | null;
  cantidadPagos: number;
  totalRecuperado: number;
  totalIngresoEmpresa: number;
  totalComision: number;
  gananciaNeta: number;
  margenPct: number;
  shareIngresoPct: number;
}

export interface ReporteIngresoTramoMora {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  totalIngresoEmpresa: number;
  totalComision: number;
  gananciaNeta: number;
  porTramo: ReporteIngresoTramoItem[];
}

/** Cumplimiento de promesas de pago. */
export interface ReportePromesaPagoItem {
  idgestion: number;
  noPrestamo: string;
  nombreCliente: string;
  nombreGestor: string | null;
  montoPromesa: number;
  fechaPromesa: string;
  estado: string;
  diasVencidos: number | null;
}

export interface ReportePromesasPago {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  totalPromesas: number;
  cumplidas: number;
  vencidas: number;
  pendientes: number;
  cumplimientoPct: number;
  montoPrometido: number;
  montoCumplido: number;
  promesas: ReportePromesaPagoItem[];
}

/** Productividad diaria por cobrador. */
export interface ReporteProductividadDiaItem {
  fecha: string;
  idgestor: number;
  nombreGestor: string;
  gestiones: number;
  gestionesEfectivas: number;
  montoRecuperado: number;
}

export interface ReporteProductividadGestorResumen {
  idgestor: number;
  nombreGestor: string;
  diasActivos: number;
  totalGestiones: number;
  promedioGestionesDia: number;
  totalRecuperado: number;
}

export interface ReporteProductividadDiaria {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  totalGestiones: number;
  promedioGestionesDia: number;
  porDia: ReporteProductividadDiaItem[];
  porGestor: ReporteProductividadGestorResumen[];
}

/** Recontactos / reciclaje sin pago. */
export interface ReporteRecontactoItem {
  idprestamo: number;
  noPrestamo: string;
  nombreCliente: string;
  nombreGestor: string | null;
  gestionesPeriodo: number;
  diasMora: number;
  saldoTotal: number;
  ultimaGestion: string | null;
}

export interface ReporteRecontactos {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  minGestiones: number;
  totalPrestamos: number;
  saldoTotal: number;
  prestamos: ReporteRecontactoItem[];
}

/** SLA de reclamos. */
export interface ReporteReclamoSlaItem {
  idreclamo: number;
  estado: string;
  descripcion: string;
  fechaLimite: string;
  createdAt: string;
  fueraSla: boolean;
  diasFueraSla: number | null;
  noPrestamo: string | null;
  nombreCliente: string;
}

export interface ReporteReclamosSla {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  totalReclamos: number;
  abiertos: number;
  enProceso: number;
  resueltos: number;
  fueraSla: number;
  pctFueraSla: number;
  reclamos: ReporteReclamoSlaItem[];
}

/** Migración de mora entre tramos. */
export interface ReporteMigracionMoraItem {
  tramoOrigen: string;
  tramoDestino: string;
  cantidad: number;
  saldoDestino: number;
  pct: number;
}

export interface ReporteMigracionMora {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  fechaOrigen: string;
  fechaDestino: string;
  totalPrestamos: number;
  migraciones: ReporteMigracionMoraItem[];
}

/** Concentración de riesgo. */
export interface ReporteConcentracionItem {
  tipo: string;
  id: number;
  nombre: string;
  cantidadPrestamos: number;
  saldoMora: number;
  shareSaldoPct: number;
}

export interface ReporteConcentracionRiesgo {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  saldoMoraTotal: number;
  topDeudores: ReporteConcentracionItem[];
  topGestores: ReporteConcentracionItem[];
}

/** Cuotas de acuerdo vencidas. */
export interface ReporteCuotaVencidaItem {
  idcuota: number;
  idacuerdo: number;
  noPrestamo: string;
  nombreCliente: string;
  nombreGestor: string | null;
  numeroCuota: number;
  montoCuota: number;
  fechaVencimiento: string;
  diasVencidos: number;
  estadoAcuerdo: string;
}

export interface ReporteCuotasVencidas {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  totalCuotas: number;
  montoTotal: number;
  cuotas: ReporteCuotaVencidaItem[];
}

/** Cumplimiento de metas. */
export interface ReporteCumplimientoMetaItem {
  idgestor: number;
  nombre: string;
  metaRecuperacionMes: number;
  recuperadoMes: number;
  pctMetaRecuperacion: number;
  metaGestionesSemana: number;
  gestionesSemana: number;
  pctMetaGestiones: number;
  metaRecuperacionCumplida: boolean;
  metaGestionesCumplida: boolean;
}

export interface ReporteCumplimientoMetas {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  metaRecuperacionMandante: number;
  recuperadoMandante: number;
  pctMetaMandante: number;
  cobradores: ReporteCumplimientoMetaItem[];
}

/** Supervisor vs equipo. */
export interface ReporteSupervisorEquipoItem {
  idgestor: number;
  nombre: string;
  gestiones: number;
  gestionesEfectivas: number;
  efectividadPct: number;
  montoRecuperado: number;
  brechaVsPromedioRecuperado: number;
  brechaVsPromedioEfectividad: number;
}

export interface ReporteSupervisorEquipo {
  idmandante: number;
  mandanteCodigo: string;
  mandanteNombre: string;
  periodo: string;
  totalCobradores: number;
  promedioRecuperado: number;
  promedioEfectividad: number;
  totalRecuperado: number;
  ranking: ReporteSupervisorEquipoItem[];
}
