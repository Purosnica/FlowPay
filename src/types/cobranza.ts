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
  monto: number;
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
