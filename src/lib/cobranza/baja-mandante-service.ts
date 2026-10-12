import { createHash, randomUUID } from 'node:crypto';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { registrarAuditoria } from './auditoria-service';
import { bufferToPrismaBytes } from './import-file-store';
import { invalidarCacheKpi } from '@/lib/cache/kpi-cache';

export const PRESTAMO_NO_GESTIONABLE_MESSAGE =
  'Este préstamo fue retirado de la cartera de gestión por disposición del mandante. No es posible registrar nuevas gestiones.';

const ESTADOS_FINANCIEROS_NO_GESTIONABLES = ['Cancelado', 'Finalizado'];
const MAX_FILAS = 10_000;

type FilaPtmo = { fila: number; numeroPtmo: string; error?: string };

export interface ValidarBajaMandanteInput {
  idmandante: number;
  idcampana?: number | null;
  idusuario: number;
  motivo: string;
  fechaEfectiva: Date;
  observaciones?: string | null;
  referenciaMandante?: string | null;
  nombreArchivo: string;
  buffer: Buffer;
  idempotencyKey?: string | null;
}

function normalizarEncabezado(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function parsearPtmOs(buffer: Buffer, nombreArchivo: string): FilaPtmo[] {
  const extension = nombreArchivo.split('.').pop()?.toLowerCase();
  if (!['xlsx', 'csv'].includes(extension ?? '')) {
    throw new Error('Formato no soportado. Use un archivo .xlsx o .csv.');
  }

  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    raw: true,
    cellDates: false,
    cellText: true,
    sheetRows: MAX_FILAS + 2,
  });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new Error('El archivo no contiene una hoja legible.');

  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
  const headers: string[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
    headers.push(normalizarEncabezado(cell?.v));
  }
  const aliases = new Set(['numero_ptmo', 'no_prestamo', 'ptmo', 'numero_prestamo']);
  const relativeIndex = headers.findIndex((header) => aliases.has(header));
  if (relativeIndex < 0) {
    throw new Error('El archivo debe contener la columna numero_ptmo.');
  }
  const col = range.s.c + relativeIndex;
  const filas: FilaPtmo[] = [];
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    if (!cell || cell.v == null || String(cell.v).trim() === '') continue;
    if (cell.t === 'n') {
      filas.push({
        fila: row + 1,
        numeroPtmo: String(cell.w ?? cell.v).trim(),
        error:
          'El PTMO está almacenado como número; no es posible garantizar sus ceros iniciales. Formatee la celda como texto.',
      });
      continue;
    }
    const numeroPtmo = String(cell.v).trim();
    filas.push({
      fila: row + 1,
      numeroPtmo,
      error: /e[+-]?\d+$/i.test(numeroPtmo)
        ? 'El PTMO está en notación científica y no puede identificarse con certeza.'
        : undefined,
    });
  }
  if (filas.length === 0) throw new Error('El archivo no contiene números PTMO.');
  if (filas.length > MAX_FILAS) {
    throw new Error(`El archivo excede el máximo de ${MAX_FILAS} registros.`);
  }
  return filas;
}

export async function requerirPrestamoGestionable(
  db: Prisma.TransactionClient | typeof prisma,
  idprestamo: number,
): Promise<void> {
  const prestamo = await db.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: { gestionActiva: true, deletedAt: true },
  });
  if (!prestamo || prestamo.deletedAt) throw new Error('Préstamo no encontrado.');
  if (!prestamo.gestionActiva) throw new Error(PRESTAMO_NO_GESTIONABLE_MESSAGE);
}

export async function validarBajaMasivaMandante(input: ValidarBajaMandanteInput) {
  await requerirAccesoMandante(input.idusuario, input.idmandante);
  if (!input.motivo.trim()) throw new Error('El motivo de baja es obligatorio.');
  const finHoy = new Date();
  finHoy.setHours(23, 59, 59, 999);
  if (input.fechaEfectiva > finHoy) {
    throw new Error('La fecha efectiva no puede ser futura; el sistema no anticipa bajas aún no vigentes.');
  }
  if (input.motivo === 'OTRO' && !input.observaciones?.trim()) {
    throw new Error('Debe explicar el motivo cuando selecciona “Otro”.');
  }
  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante: input.idmandante, estado: true, deletedAt: null },
    select: { idmandante: true, nombre: true },
  });
  if (!mandante) throw new Error('Mandante no encontrado o inactivo.');
  if (input.idcampana) {
    const campana = await prisma.tbl_campana.findFirst({
      where: { idcampana: input.idcampana, idmandante: input.idmandante, deletedAt: null },
      select: { idcampana: true },
    });
    if (!campana) throw new Error('La cartera/campaña no pertenece al mandante.');
  }

  const hash = createHash('sha256').update(input.buffer).digest('hex');
  const yaEjecutado = await prisma.tbl_baja_mandante_lote.findFirst({
    where: { idmandante: input.idmandante, archivoHash: hash, estado: 'COMPLETADO' },
    select: { codigo: true },
  });
  if (yaEjecutado) {
    throw new Error(`Este archivo ya fue ejecutado en el lote ${yaEjecutado.codigo}.`);
  }

  const filas = parsearPtmOs(input.buffer, input.nombreArchivo);
  const frecuencia = new Map<string, number>();
  for (const fila of filas) frecuencia.set(fila.numeroPtmo, (frecuencia.get(fila.numeroPtmo) ?? 0) + 1);
  const referencias = [...new Set(filas.map((f) => f.numeroPtmo))];
  const prestamos = await prisma.tbl_prestamo.findMany({
    where: {
      idmandante: input.idmandante,
      noPrestamo: { in: referencias },
      ...(input.idcampana ? { idcampana: input.idcampana } : {}),
      deletedAt: null,
    },
    select: {
      idprestamo: true,
      noPrestamo: true,
      estado: true,
      gestionActiva: true,
      idgestorAsignado: true,
      idcampana: true,
      saldoTotal: true,
    },
  });
  const porPtmo = new Map<string, typeof prestamos>();
  for (const prestamo of prestamos) {
    const list = porPtmo.get(prestamo.noPrestamo) ?? [];
    list.push(prestamo);
    porPtmo.set(prestamo.noPrestamo, list);
  }
  const existenOtroMandante = new Set(
    (await prisma.tbl_prestamo.findMany({
      where: { idmandante: { not: input.idmandante }, noPrestamo: { in: referencias }, deletedAt: null },
      select: { noPrestamo: true },
      distinct: ['noPrestamo'],
    })).map((p) => p.noPrestamo),
  );
  const existenOtraCartera = input.idcampana
    ? new Set(
        (await prisma.tbl_prestamo.findMany({
          where: {
            idmandante: input.idmandante,
            OR: [
              { idcampana: null },
              { idcampana: { not: input.idcampana } },
            ],
            noPrestamo: { in: referencias },
            deletedAt: null,
          },
          select: { noPrestamo: true },
          distinct: ['noPrestamo'],
        })).map((p) => p.noPrestamo),
      )
    : new Set<string>();

  const detalles = filas.map((fila) => {
    const coincidencias = porPtmo.get(fila.numeroPtmo) ?? [];
    const prestamo = coincidencias[0];
    let resultado = 'ELEGIBLE';
    let mensaje: string | null = null;
    if (fila.error) [resultado, mensaje] = ['ERROR_FORMATO', fila.error];
    else if ((frecuencia.get(fila.numeroPtmo) ?? 0) > 1) [resultado, mensaje] = ['DUPLICADO', 'PTMO duplicado dentro del archivo.'];
    else if (coincidencias.length > 1) [resultado, mensaje] = ['AMBIGUO', 'Existen varias coincidencias dentro del alcance seleccionado.'];
    else if (!prestamo) {
      if (existenOtraCartera.has(fila.numeroPtmo)) {
        [resultado, mensaje] = ['FUERA_CARTERA', 'El PTMO pertenece al mandante, pero no a la cartera seleccionada.'];
      } else {
        [resultado, mensaje] = existenOtroMandante.has(fila.numeroPtmo)
          ? ['OTRO_MANDANTE', 'El PTMO existe, pero no pertenece al mandante seleccionado.']
          : ['NO_ENCONTRADO', 'PTMO no encontrado.'];
      }
    } else if (!prestamo.gestionActiva) [resultado, mensaje] = ['YA_INACTIVO', 'El préstamo ya fue retirado de gestión.'];
    else if (ESTADOS_FINANCIEROS_NO_GESTIONABLES.includes(prestamo.estado)) [resultado, mensaje] = ['NO_GESTIONABLE', `Estado financiero ${prestamo.estado}.`];
    return {
      fila: fila.fila,
      numeroPtmo: fila.numeroPtmo,
      idprestamo: prestamo?.idprestamo ?? null,
      idgestorAnterior: prestamo?.idgestorAsignado ?? null,
      estadoAnterior: prestamo?.estado ?? null,
      resultado,
      mensaje,
      saldoSnapshot: prestamo?.saldoTotal ?? null,
    };
  });
  const elegibles = detalles.filter((d) => d.resultado === 'ELEGIBLE');
  const codigo = `BM-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const lote = await prisma.$transaction(async (tx) => {
    const created = await tx.tbl_baja_mandante_lote.create({
      data: {
        codigo,
        idmandante: input.idmandante,
        idcampana: input.idcampana ?? null,
        idusuario: input.idusuario,
        motivo: input.motivo.trim(),
        observaciones: input.observaciones?.trim() || null,
        referenciaMandante: input.referenciaMandante?.trim() || null,
        fechaEfectiva: input.fechaEfectiva,
        nombreArchivo: input.nombreArchivo,
        archivoHash: hash,
        archivoContenido: bufferToPrismaBytes(input.buffer),
        idempotencyKey: input.idempotencyKey ?? null,
        totalRecibidos: detalles.length,
        totalElegibles: elegibles.length,
        totalRechazados: detalles.length - elegibles.length,
      },
    });
    await tx.tbl_baja_mandante_detalle.createMany({
      data: detalles.map((d) => ({ ...d, idlote: created.idlote })),
    });
    await registrarAuditoria(tx, {
      idusuario: input.idusuario,
      entidad: 'baja_mandante_lote',
      entidadId: created.idlote,
      accion: 'VALIDAR_BAJA_MASIVA',
      detalle: JSON.stringify({ codigo, idmandante: input.idmandante, archivoHash: hash, total: detalles.length, elegibles: elegibles.length }),
    });
    return created;
  });
  return obtenerLoteBaja(lote.idlote, input.idusuario);
}

export async function ejecutarBajaMasivaMandante(idlote: number, idusuario: number) {
  const cabecera = await prisma.tbl_baja_mandante_lote.findUnique({ where: { idlote } });
  if (!cabecera) throw new Error('Lote no encontrado.');
  await requerirAccesoMandante(idusuario, cabecera.idmandante);
  if (cabecera.estado === 'COMPLETADO') return obtenerLoteBaja(idlote, idusuario);
  if (cabecera.estado !== 'VALIDADO') throw new Error(`El lote no puede ejecutarse en estado ${cabecera.estado}.`);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.tbl_baja_mandante_lote.updateMany({
      where: { idlote, estado: 'VALIDADO' },
      data: { estado: 'EJECUTANDO' },
    });
    if (claimed.count !== 1) throw new Error('El lote ya está siendo procesado.');
    const detalles = await tx.tbl_baja_mandante_detalle.findMany({
      where: { idlote, resultado: 'ELEGIBLE', idprestamo: { not: null } },
      orderBy: { idprestamo: 'asc' },
    });
    let exitosos = 0;
    let saldoRetirado = new Prisma.Decimal(0);
    for (const detalle of detalles) {
      const updated = await tx.tbl_prestamo.updateMany({
        where: {
          idprestamo: detalle.idprestamo!,
          idmandante: cabecera.idmandante,
          gestionActiva: true,
          deletedAt: null,
          ...(cabecera.idcampana ? { idcampana: cabecera.idcampana } : {}),
        },
        data: {
          gestionActiva: false,
          bajaMandanteAt: new Date(),
          bajaMandanteEfectiva: cabecera.fechaEfectiva,
          bajaMandanteMotivo: cabecera.motivo,
          bajaMandanteLoteId: idlote,
          bloqueadoAsignacion: true,
          version: { increment: 1 },
        },
      });
      const resultado = updated.count === 1 ? 'BAJA_APLICADA' : 'RECHAZADO_REVALIDACION';
      await tx.tbl_baja_mandante_detalle.update({
        where: { iddetalle: detalle.iddetalle },
        data: { resultado, mensaje: updated.count === 1 ? null : 'El préstamo dejó de ser elegible antes de la confirmación.' },
      });
      if (updated.count === 1) {
        exitosos++;
        saldoRetirado = saldoRetirado.add(detalle.saldoSnapshot ?? 0);
        await registrarAuditoria(tx, {
          idusuario,
          entidad: 'prestamo',
          entidadId: detalle.idprestamo,
          accion: 'BAJA_POR_MANDANTE',
          detalle: JSON.stringify({ lote: cabecera.codigo, ptmo: detalle.numeroPtmo, motivo: cabecera.motivo, fechaEfectiva: cabecera.fechaEfectiva, cobradorAnterior: detalle.idgestorAnterior }),
        });
      }
    }
    await tx.tbl_baja_mandante_lote.update({
      where: { idlote },
      data: {
        estado: exitosos === detalles.length ? 'COMPLETADO' : 'COMPLETADO_PARCIAL',
        totalExitosos: exitosos,
        totalRechazados: cabecera.totalRecibidos - exitosos,
        saldoRetirado,
        ejecutadoAt: new Date(),
      },
    });
    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'baja_mandante_lote',
      entidadId: idlote,
      accion: 'EJECUTAR_BAJA_MASIVA',
      detalle: JSON.stringify({ codigo: cabecera.codigo, totalExitosos: exitosos, totalRechazados: cabecera.totalRecibidos - exitosos }),
    });
  }, { maxWait: 15_000, timeout: 120_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  invalidarCacheKpi();
  return obtenerLoteBaja(idlote, idusuario);
}

export async function revertirBajaMasivaMandante(idlote: number, idusuario: number, motivo: string) {
  if (!motivo.trim()) throw new Error('El motivo de reactivación es obligatorio.');
  const lote = await prisma.tbl_baja_mandante_lote.findUnique({ where: { idlote } });
  if (!lote) throw new Error('Lote no encontrado.');
  await requerirAccesoMandante(idusuario, lote.idmandante);
  if (!['COMPLETADO', 'COMPLETADO_PARCIAL'].includes(lote.estado)) throw new Error('Solo puede revertirse un lote ejecutado.');
  await prisma.$transaction(async (tx) => {
    const result = await tx.tbl_prestamo.updateMany({
      where: { bajaMandanteLoteId: idlote, gestionActiva: false, deletedAt: null },
      data: {
        gestionActiva: true,
        bajaMandanteAt: null,
        bajaMandanteEfectiva: null,
        bajaMandanteMotivo: null,
        bajaMandanteLoteId: null,
        bloqueadoAsignacion: false,
        // La reactivación vuelve al flujo administrativo de asignación;
        // el cobrador anterior permanece en el detalle del lote y auditoría.
        idgestorAsignado: null,
        version: { increment: 1 },
      },
    });
    await tx.tbl_baja_mandante_lote.update({ where: { idlote }, data: { estado: 'REVERTIDO', revertidoAt: new Date(), motivoReversion: motivo.trim() } });
    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'baja_mandante_lote',
      entidadId: idlote,
      accion: 'REVERTIR_BAJA_MASIVA',
      detalle: JSON.stringify({ codigo: lote.codigo, motivo: motivo.trim(), reactivados: result.count }),
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  invalidarCacheKpi();
  return obtenerLoteBaja(idlote, idusuario);
}

export async function obtenerLoteBaja(idlote: number, idusuario: number) {
  const lote = await prisma.tbl_baja_mandante_lote.findUnique({
    where: { idlote },
    include: {
      mandante: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
      detalles: { orderBy: { fila: 'asc' }, include: { prestamo: { select: { idcampana: true, gestor: { select: { nombre: true } } } } } },
    },
  });
  if (!lote) throw new Error('Lote no encontrado.');
  await requerirAccesoMandante(idusuario, lote.idmandante);
  const cobradores = new Map<string, number>();
  const carteras = new Map<string, number>();
  for (const d of lote.detalles.filter((x) => x.resultado === 'ELEGIBLE' || x.resultado === 'BAJA_APLICADA')) {
    const gestor = d.prestamo?.gestor?.nombre ?? 'Sin asignar';
    cobradores.set(gestor, (cobradores.get(gestor) ?? 0) + 1);
    const cartera = d.prestamo?.idcampana ? String(d.prestamo.idcampana) : 'Sin campaña';
    carteras.set(cartera, (carteras.get(cartera) ?? 0) + 1);
  }
  return {
    ...lote,
    archivoContenido: undefined,
    saldoRetirado: Number(lote.saldoRetirado),
    detalles: lote.detalles.map((d) => ({ ...d, saldoSnapshot: d.saldoSnapshot == null ? null : Number(d.saldoSnapshot), prestamo: undefined, cobradorAnterior: d.prestamo?.gestor?.nombre ?? null })),
    resumenCobradores: [...cobradores].map(([nombre, cantidad]) => ({ nombre, cantidad })),
    resumenCarteras: [...carteras].map(([cartera, cantidad]) => ({ cartera, cantidad })),
  };
}

export async function listarLotesBaja(idusuario: number, idmandante: number) {
  await requerirAccesoMandante(idusuario, idmandante);
  return prisma.tbl_baja_mandante_lote.findMany({
    where: { idmandante },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { idlote: true, codigo: true, estado: true, motivo: true, fechaEfectiva: true, nombreArchivo: true, totalRecibidos: true, totalElegibles: true, totalExitosos: true, totalRechazados: true, saldoRetirado: true, ejecutadoAt: true, createdAt: true },
  });
}
