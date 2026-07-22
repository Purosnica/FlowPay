import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { decimalToNumber } from '@/lib/cobranza/decimal-utils';
import { type DetallePrestamoCarga ,
  finalizarCargaCartera,
  iniciarCargaCartera,
} from '@/lib/cobranza/cartera-carga-service';

import {
  crearCacheImportacionCartera,
  resolverAgenciaConCache,
  resolverGestorPorNombreCache,
  resolverModeloPagoConCache,
  resolverRutaConCache,
  resolverTipoCreditoConCache,
  type CacheImportacionCartera,
} from './import-helpers';
import { obtenerCatalogosImportacion ,type  CatalogosImportacion } from './catalogos-importacion';

import { parseNombreCliente ,type  NombreClienteParseado } from './parse-nombre-cliente';

import { parseTelefonos } from './parse-value';
import { extraerDatosFinancierosCartera } from './cartera-financiero-helpers';
import {
  detectarDuplicadosArchivo,
  limpiarDocumento,
  parsearArchivoCartera,
  valorFecha,
  valorNumero,
  valorNumeroNullable,
  valorTexto,
} from './cartera-parse-helpers';
import type {
  FilaCarteraParseada,
  ImportarCarteraParams,
  ResultadoImportacionCartera,
} from './types';
import {
  registrarEstadoInicial,
  transicionarEstadoPrestamo,
} from '@/lib/cobranza/estado-prestamo-service';
import {
  resolverDiasMoraPrestamo,
  sincronizarMoraPrestamo,
} from '@/lib/cobranza/dias-mora-service';
import {
  debePreservarSaldoVivo,
  normalizarEstadoImportacion,
} from '@/lib/logic/import-saldo-policy-logic';

const TAMANO_LOTE_PRECARGA = 200;

interface ClienteCacheEntry {
  idcliente: number;
  celular: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
}

interface PrestamoCacheEntry {
  idprestamo: number;
  saldoTotal: number;
}

interface ProcesarFilaCarteraParams {
  fila: FilaCarteraParseada;
  params: ImportarCarteraParams;
  catalogos: CatalogosImportacion;
  cacheImportacion: CacheImportacionCartera;
  cacheClientes: Map<string, ClienteCacheEntry>;
  cachePrestamos: Map<string, PrestamoCacheEntry>;
  resultado: ResultadoImportacionCartera;
  detallePrestamos: DetallePrestamoCarga[];
  numerodocumento: string;
  nombre: NombreClienteParseado;
  noPrestamo: string;
  idcarga: number;
}

export async function importarCartera(
  params: ImportarCarteraParams,
): Promise<ResultadoImportacionCartera> {
  const inicio = Date.now();
  await requerirAccesoMandante(params.idusuario, params.idmandante);

  const campana = await prisma.tbl_campana.findFirst({
    where: {
      idcampana: params.idcampana,
      idmandante: params.idmandante,
      deletedAt: null,
    },
  });

  if (!campana) {
    throw new Error('Campaña no encontrada para el mandante indicado.');
  }

  const { filas } = await parsearArchivoCartera(params, prisma);
  const duplicadosArchivo = detectarDuplicadosArchivo(filas);

  if (duplicadosArchivo.length > 0) {
    const detalle = duplicadosArchivo
      .map((d) => `${d.noPrestamo} (filas ${d.filas.join(', ')})`)
      .join('; ');
    throw new Error(
      `El archivo contiene préstamos duplicados. Corrija antes de importar: ${detalle}`,
    );
  }

  const catalogos = await obtenerCatalogosImportacion(prisma);
  const cacheImportacion = await crearCacheImportacionCartera(
    prisma,
    params.idmandante,
  );

  const documentosUnicos = [
    ...new Set(
      filas
        .map((f) => valorTexto(f.valores.numerodocumento))
        .filter((d): d is string => !!d)
        .map(limpiarDocumento),
    ),
  ];
  const prestamosUnicos = [
    ...new Set(
      filas
        .map((f) => valorTexto(f.valores.noPrestamo))
        .filter((n): n is string => !!n),
    ),
  ];

  const cacheClientes = await precargarClientesPorDocumento(
    prisma,
    documentosUnicos,
  );
  const cachePrestamos = await precargarPrestamosPorNumero(
    prisma,
    params.idmandante,
    prestamosUnicos,
  );

  const resultado: ResultadoImportacionCartera = {
    totalFilas: filas.length,
    clientesCreados: 0,
    clientesActualizados: 0,
    prestamosCreados: 0,
    prestamosActualizados: 0,
    prestamosSaldoActualizado: 0,
    cortesRegistrados: 0,
    contactosCreados: 0,
    gestoresAsignados: 0,
    omitidos: 0,
    saldoTotalCartera: 0,
    errores: [],
  };

  const detallePrestamos: DetallePrestamoCarga[] = [];
  const prestamosEnArchivo = new Set<string>();

  const idcarga = await iniciarCargaCartera(
    params.idmandante,
    params.idcampana,
    params.idusuario,
    params.nombreArchivo,
    params.fechaCorte,
  );

  try {
    for (const fila of filas) {
    try {
      const noPrestamo = valorTexto(fila.valores.noPrestamo);
      const numerodocumentoRaw = valorTexto(fila.valores.numerodocumento);
      const nombreCliente = valorTexto(fila.valores.nombreCliente);

      if (!noPrestamo || !numerodocumentoRaw || !nombreCliente) {
        resultado.omitidos++;
        continue;
      }

      const numerodocumento = limpiarDocumento(numerodocumentoRaw);
      const nombre = parseNombreCliente(nombreCliente);
      prestamosEnArchivo.add(noPrestamo);

      await procesarFilaCartera(prisma, {
        fila,
        params,
        catalogos,
        cacheImportacion,
        cacheClientes,
        cachePrestamos,
        resultado,
        detallePrestamos,
        numerodocumento,
        nombre,
        noPrestamo,
        idcarga,
      });
    } catch (error) {
      resultado.errores.push({
        fila: fila.fila,
        mensaje:
          error instanceof Error ? error.message : 'Error desconocido en fila',
      });
    }
    }
  } catch (importError) {
    await prisma.tbl_carga_cartera.update({
      where: { idcarga },
      data: { estado: 'REVERTIDA', motivoReversion: 'Error durante importación' },
    });
    throw importError;
  }

  const prestamosAusentes = await prisma.tbl_prestamo.count({
    where: {
      idmandante: params.idmandante,
      deletedAt: null,
      estado: { notIn: ['Cancelado', 'Finalizado'] },
      noPrestamo: { notIn: [...prestamosEnArchivo] },
    },
  });

  const { resumenDiff } = await finalizarCargaCartera({
    idcarga,
    idmandante: params.idmandante,
    idcampana: params.idcampana,
    idusuario: params.idusuario,
    nombreArchivo: params.nombreArchivo,
    fechaCorte: params.fechaCorte,
    tiempoMs: Date.now() - inicio,
    totalProcesados: resultado.totalFilas,
    prestamosNuevos: resultado.prestamosCreados,
    prestamosActualizados: resultado.prestamosActualizados,
    prestamosSaldoCambiado: resultado.prestamosSaldoActualizado,
    prestamosErrores: resultado.errores.length,
    saldoTotal: resultado.saldoTotalCartera,
    prestamosAusentes,
    detallePrestamos,
    errores: resultado.errores,
    prestamosEnArchivo,
  });

  resultado.idcarga = idcarga;
  resultado.resumenComparacion = resumenDiff;
  resultado.prestamosAusentes = prestamosAusentes;

  return resultado;
}

async function precargarClientesPorDocumento(
  db: PrismaClient,
  documentos: string[],
): Promise<Map<string, ClienteCacheEntry>> {
  const map = new Map<string, ClienteCacheEntry>();

  for (let i = 0; i < documentos.length; i += TAMANO_LOTE_PRECARGA) {
    const lote = documentos.slice(i, i + TAMANO_LOTE_PRECARGA);
    const filas = await db.tbl_cliente.findMany({
      where: { numerodocumento: { in: lote } },
      select: {
        idcliente: true,
        numerodocumento: true,
        celular: true,
        telefono: true,
        email: true,
        direccion: true,
      },
    });
    for (const fila of filas) {
      map.set(fila.numerodocumento, fila);
    }
  }

  return map;
}

async function precargarPrestamosPorNumero(
  db: PrismaClient,
  idmandante: number,
  numerosPrestamo: string[],
): Promise<Map<string, PrestamoCacheEntry>> {
  const map = new Map<string, PrestamoCacheEntry>();

  for (let i = 0; i < numerosPrestamo.length; i += TAMANO_LOTE_PRECARGA) {
    const lote = numerosPrestamo.slice(i, i + TAMANO_LOTE_PRECARGA);
    const filas = await db.tbl_prestamo.findMany({
      where: {
        idmandante,
        noPrestamo: { in: lote },
      },
      select: { idprestamo: true, noPrestamo: true, saldoTotal: true },
    });
    for (const fila of filas) {
      map.set(fila.noPrestamo, {
        idprestamo: fila.idprestamo,
        saldoTotal: decimalToNumber(fila.saldoTotal),
      });
    }
  }

  return map;
}

async function procesarFilaCartera(
  db: PrismaClient,
  ctx: ProcesarFilaCarteraParams,
): Promise<void> {
  const {
    fila,
    params,
    catalogos,
    cacheImportacion,
    cacheClientes,
    cachePrestamos,
    resultado,
    detallePrestamos,
    numerodocumento,
    nombre,
    noPrestamo,
    idcarga,
  } = ctx;

  let cliente = cacheClientes.get(numerodocumento) ?? null;

  const datosContacto = {
    celular: valorTexto(fila.valores.celular),
    telefono: valorTexto(fila.valores.telefono),
    email: valorTexto(fila.valores.email),
    direccion: valorTexto(fila.valores.direccion),
  };

  if (!cliente) {
    const creado = await db.tbl_cliente.create({
      data: {
        primer_nombres: nombre.primer_nombres,
        segundo_nombres: nombre.segundo_nombres,
        primer_apellido: nombre.primer_apellido,
        segundo_apellido: nombre.segundo_apellido,
        idtipodocumento: catalogos.idtipodocumento,
        numerodocumento,
        idtipopersona: catalogos.idtipopersona,
        idpais: catalogos.idpais,
        celular: datosContacto.celular,
        telefono: datosContacto.telefono,
        email: datosContacto.email,
        direccion: datosContacto.direccion,
      },
      select: {
        idcliente: true,
        celular: true,
        telefono: true,
        email: true,
        direccion: true,
      },
    });
    cliente = { ...creado };
    cacheClientes.set(numerodocumento, cliente);
    resultado.clientesCreados++;
  } else {
    await db.tbl_cliente.update({
      where: { idcliente: cliente.idcliente },
      data: {
        celular: datosContacto.celular ?? cliente.celular,
        telefono: datosContacto.telefono ?? cliente.telefono,
        email: datosContacto.email ?? cliente.email,
        direccion: datosContacto.direccion ?? cliente.direccion,
      },
    });
    cacheClientes.set(numerodocumento, {
      ...cliente,
      celular: datosContacto.celular ?? cliente.celular,
      telefono: datosContacto.telefono ?? cliente.telefono,
      email: datosContacto.email ?? cliente.email,
      direccion: datosContacto.direccion ?? cliente.direccion,
    });
    resultado.clientesActualizados++;
  }

  const datosFinancieros = extraerDatosFinancierosCartera(fila);
  const saldoNuevo = datosFinancieros.saldoTotal;
  const diasMoraImportada = Math.max(
    0,
    Math.trunc(valorNumeroNullable(fila.valores.diasMora) ?? 0),
  );
  resultado.saldoTotalCartera += saldoNuevo;

  const prestamoExistente = cachePrestamos.get(noPrestamo);
  let prestamoId: number;

  if (prestamoExistente) {
    const saldoAnterior = prestamoExistente.saldoTotal;
    const pagosAplicados = await db.tbl_pago.count({
      where: {
        idprestamo: prestamoExistente.idprestamo,
        aplicado: true,
        deletedAt: null,
      },
    });
    const preservarSaldo = debePreservarSaldoVivo({
      cantidadPagosAplicados: pagosAplicados,
    });

    if (!preservarSaldo && Math.abs(saldoAnterior - saldoNuevo) > 0.009) {
      resultado.prestamosSaldoActualizado++;
    }

    const estadoFila =
      normalizarEstadoImportacion(valorTexto(fila.valores.estado)) ??
      undefined;

    const dataUpdate: Prisma.tbl_prestamoUncheckedUpdateInput = {
      diasMora: diasMoraImportada,
      idcampana: params.idcampana,
      deletedAt: null,
      fechaVencimiento:
        valorFecha(fila.valores.fechaVencimiento) ?? undefined,
      ultimaFechaPago:
        valorFecha(fila.valores.ultimaFechaPago) ?? undefined,
    };

    if (!preservarSaldo) {
      dataUpdate.saldoTotal = saldoNuevo;
      dataUpdate.montoPrestamo = datosFinancieros.montoPrestamo;
      dataUpdate.interes = datosFinancieros.interes;
      dataUpdate.interesMoratorio = datosFinancieros.interesMoratorio;
      dataUpdate.comisionCav = datosFinancieros.comisionCav;
      dataUpdate.comisionInsitu = datosFinancieros.comisionInsitu;
      dataUpdate.mantenimientoValor = datosFinancieros.mantenimientoValor;
      dataUpdate.gestionCobranza = datosFinancieros.gestionCobranza;
      dataUpdate.seguroSvsd = datosFinancieros.seguroSvsd;
      dataUpdate.cargosAdmin = datosFinancieros.cargosAdmin;
      dataUpdate.devolucionSaldoFavor = datosFinancieros.devolucionSaldoFavor;
      dataUpdate.descuentosArchivo = datosFinancieros.descuentosArchivo;
    }

    const prestamo = await db.tbl_prestamo.update({
      where: { idprestamo: prestamoExistente.idprestamo },
      data: dataUpdate,
    });

    prestamoId = prestamo.idprestamo;
    resultado.prestamosActualizados++;

    if (estadoFila) {
      try {
        await transicionarEstadoPrestamo(db, {
          idprestamo: prestamoId,
          estadoNuevo: estadoFila,
          idusuario: params.idusuario,
          motivo: 'Importación de cartera (corte)',
        });
      } catch {
        // Transición no permitida: se conserva estado vivo; el corte guarda el del archivo.
      }
    }

    if (valorNumeroNullable(fila.valores.diasMora) === null) {
      await sincronizarMoraPrestamo(
        db,
        prestamoId,
        params.idusuario,
        params.fechaCorte,
      );
    }

    detallePrestamos.push({
      idprestamo: prestamoId,
      noPrestamo,
      esNuevo: false,
      saldoAnterior,
      saldoNuevo: preservarSaldo ? saldoAnterior : saldoNuevo,
    });
  } else {
    const codigoUnico = valorTexto(fila.valores.codigoUnico) ?? noPrestamo;
    const monedaRaw = valorTexto(fila.valores.moneda);
    const moneda = monedaRaw === 'USD' || monedaRaw === 'NIO' ? monedaRaw : 'NIO';

    const idagencia = await resolverAgenciaConCache(
      db,
      cacheImportacion,
      params.idmandante,
      valorTexto(fila.valores.agencia),
    );
    const idruta = await resolverRutaConCache(
      db,
      cacheImportacion,
      idagencia,
      valorTexto(fila.valores.ruta),
    );
    const idtipocredito = await resolverTipoCreditoConCache(
      db,
      cacheImportacion,
      valorTexto(fila.valores.tipoCredito),
    );
    const idmodelopago = await resolverModeloPagoConCache(
      db,
      cacheImportacion,
      valorTexto(fila.valores.modeloPago),
    );
    const idgestorAsignado = resolverGestorPorNombreCache(
      cacheImportacion.gestores,
      valorTexto(fila.valores.nombreGestor),
    );

    const prestamoData: Prisma.tbl_prestamoUncheckedCreateInput = {
      idmandante: params.idmandante,
      idcampana: params.idcampana,
      idcliente: cliente.idcliente,
      idagencia: idagencia ?? undefined,
      idruta: idruta ?? undefined,
      idtipocredito: idtipocredito ?? undefined,
      idmodelopago: idmodelopago ?? undefined,
      idgestorAsignado: idgestorAsignado ?? undefined,
      noPrestamo,
      codigoUnico,
      noCuenta: valorTexto(fila.valores.noCuenta),
      plazoMeses: valorNumero(fila.valores.plazoMeses) || undefined,
      fechaPrestamo: valorFecha(fila.valores.fechaPrestamo) ?? undefined,
      fechaVencimiento: valorFecha(fila.valores.fechaVencimiento) ?? undefined,
      ultimaFechaPago: valorFecha(fila.valores.ultimaFechaPago) ?? undefined,
      estado:
        normalizarEstadoImportacion(valorTexto(fila.valores.estado)) ??
        'Vencido',
      moneda,
      tipoCambio: valorNumero(fila.valores.tipoCambio) || undefined,
      saldoTotal: saldoNuevo,
      diasMora: diasMoraImportada,
      montoPrestamo: datosFinancieros.montoPrestamo,
      interes: datosFinancieros.interes,
      interesMoratorio: datosFinancieros.interesMoratorio,
      comisionCav: datosFinancieros.comisionCav,
      comisionInsitu: datosFinancieros.comisionInsitu,
      mantenimientoValor: datosFinancieros.mantenimientoValor,
      gestionCobranza: datosFinancieros.gestionCobranza,
      seguroSvsd: datosFinancieros.seguroSvsd,
      cargosAdmin: datosFinancieros.cargosAdmin,
      devolucionSaldoFavor: datosFinancieros.devolucionSaldoFavor,
      descuentosArchivo: datosFinancieros.descuentosArchivo,
    };

    const prestamo = await db.tbl_prestamo.create({ data: prestamoData });
    prestamoId = prestamo.idprestamo;
    cachePrestamos.set(noPrestamo, {
      idprestamo: prestamoId,
      saldoTotal: saldoNuevo,
    });
    resultado.prestamosCreados++;

    await registrarEstadoInicial(db, {
      idprestamo: prestamoId,
      estado: prestamoData.estado ?? 'Vencido',
      idusuario: params.idusuario,
      motivo: 'Importación de cartera',
    });
    if (valorNumeroNullable(fila.valores.diasMora) === null) {
      await sincronizarMoraPrestamo(
        db,
        prestamoId,
        params.idusuario,
        params.fechaCorte,
      );
    }

    if (idgestorAsignado) {
      resultado.gestoresAsignados++;
    }

    detallePrestamos.push({
      idprestamo: prestamoId,
      noPrestamo,
      esNuevo: true,
      saldoAnterior: null,
      saldoNuevo,
    });
  }

  const diasMoraCorte =
    valorNumeroNullable(fila.valores.diasMora) === null
      ? await resolverDiasMoraPrestamo(db, prestamoId, params.fechaCorte)
      : diasMoraImportada;

  await db.tbl_prestamo_corte.create({
    data: {
      idprestamo: prestamoId,
      idcarga,
      fechaCorte: params.fechaCorte,
      saldoTotal: saldoNuevo,
      diasMora: diasMoraCorte,
      estado: valorTexto(fila.valores.estado) ?? 'Vencido',
    },
  });
  resultado.cortesRegistrados++;

  const telefonos = [
    ...new Set([
      ...parseTelefonos(fila.valores.celular),
      ...parseTelefonos(fila.valores.telefono),
    ]),
  ];

  if (telefonos.length > 0) {
    const contactosExistentes = await db.tbl_deudor_contacto.findMany({
      where: {
        idcliente: cliente.idcliente,
        deletedAt: null,
        valor: { in: telefonos },
      },
      select: { valor: true },
    });
    const valoresExistentes = new Set(contactosExistentes.map((c) => c.valor));
    const contactosNuevos = telefonos.filter((tel) => !valoresExistentes.has(tel));

    if (contactosNuevos.length > 0) {
      await db.tbl_deudor_contacto.createMany({
        data: contactosNuevos.map((tel) => ({
          idcliente: cliente.idcliente,
          tipo: tel.length === 8 ? 'CELULAR' : 'TELEFONO',
          valor: tel,
          fuente: 'MANDANTE',
          autorizado: false,
        })),
      });
      resultado.contactosCreados += contactosNuevos.length;
    }
  }
}
