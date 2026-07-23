import type { Prisma, PrismaClient } from '@prisma/client';

type Tx = PrismaClient | Prisma.TransactionClient;

export interface CacheGestoresMandante {
  usuarios: { idusuario: number; nombre: string }[];
}

export async function cargarCacheGestoresMandante(
  tx: Tx,
  idmandante: number,
): Promise<CacheGestoresMandante> {
  const usuarios = await tx.tbl_usuario_mandante.findMany({
    where: { idmandante },
    include: { usuario: true },
  });
  return {
    usuarios: usuarios.map((um) => ({
      idusuario: um.idusuario,
      nombre: um.usuario.nombre,
    })),
  };
}

export function resolverGestorPorNombreCache(
  cache: CacheGestoresMandante,
  nombreGestor: string | null | undefined,
): number | null {
  const nombre = nombreGestor?.trim();
  if (!nombre) {
    return null;
  }
  const normalizado = nombre.toLowerCase();

  const exacto = cache.usuarios.find(
    (u) => u.nombre.toLowerCase() === normalizado,
  );
  if (exacto) {
    return exacto.idusuario;
  }

  const parciales = cache.usuarios.filter((u) => {
    const n = u.nombre.toLowerCase();
    return n.includes(normalizado) || normalizado.includes(n);
  });
  if (parciales.length === 1) {
    return parciales[0]?.idusuario ?? null;
  }
  return null;
}

function slugCodigo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .slice(0, 40);
}

export async function resolverGestorPorNombre(
  tx: Tx,
  idmandante: number,
  nombreGestor: string | null | undefined,
): Promise<number | null> {
  const cache = await cargarCacheGestoresMandante(tx, idmandante);
  return resolverGestorPorNombreCache(cache, nombreGestor);
}

export interface CacheImportacionCartera {
  gestores: CacheGestoresMandante;
  agencias: Map<string, number>;
  rutas: Map<string, number>;
  tiposCredito: Map<string, number>;
  modelosPago: Map<string, number>;
}

export async function crearCacheImportacionCartera(
  tx: Tx,
  idmandante: number,
): Promise<CacheImportacionCartera> {
  return {
    gestores: await cargarCacheGestoresMandante(tx, idmandante),
    agencias: new Map(),
    rutas: new Map(),
    tiposCredito: new Map(),
    modelosPago: new Map(),
  };
}

export async function resolverAgenciaConCache(
  tx: Tx,
  cache: CacheImportacionCartera,
  idmandante: number,
  nombreAgencia: string | null | undefined,
): Promise<number | null> {
  const nombre = nombreAgencia?.trim();
  if (!nombre) {
    return null;
  }
  const codigo = slugCodigo(nombre);
  const enCache = cache.agencias.get(codigo);
  if (enCache !== undefined) {
    return enCache;
  }
  const agencia = await tx.tbl_agencia.upsert({
    where: {
      idmandante_codigo: { idmandante, codigo },
    },
    create: { idmandante, codigo, nombre },
    update: { nombre, estado: true, deletedAt: null },
  });
  cache.agencias.set(codigo, agencia.idagencia);
  return agencia.idagencia;
}

export async function resolverRutaConCache(
  tx: Tx,
  cache: CacheImportacionCartera,
  idagencia: number | null,
  nombreRuta: string | null | undefined,
): Promise<number | null> {
  const nombre = nombreRuta?.trim();
  if (!nombre || !idagencia) {
    return null;
  }
  const clave = `${idagencia}|${nombre}`;
  const enCache = cache.rutas.get(clave);
  if (enCache !== undefined) {
    return enCache;
  }
  const existente = await tx.tbl_ruta.findFirst({
    where: { idagencia, nombre, deletedAt: null },
  });
  if (existente) {
    cache.rutas.set(clave, existente.idruta);
    return existente.idruta;
  }
  const creada = await tx.tbl_ruta.create({
    data: { idagencia, nombre },
  });
  cache.rutas.set(clave, creada.idruta);
  return creada.idruta;
}

export async function resolverTipoCreditoConCache(
  tx: Tx,
  cache: CacheImportacionCartera,
  descripcion: string | null | undefined,
): Promise<number | null> {
  const desc = descripcion?.trim();
  if (!desc) {
    return null;
  }
  const enCache = cache.tiposCredito.get(desc);
  if (enCache !== undefined) {
    return enCache;
  }
  const existente = await tx.tbl_tipocredito.findFirst({
    where: { descripcion: desc, deletedAt: null },
  });
  if (existente) {
    cache.tiposCredito.set(desc, existente.idtipocredito);
    return existente.idtipocredito;
  }
  const creado = await tx.tbl_tipocredito.create({ data: { descripcion: desc } });
  cache.tiposCredito.set(desc, creado.idtipocredito);
  return creado.idtipocredito;
}

export async function resolverModeloPagoConCache(
  tx: Tx,
  cache: CacheImportacionCartera,
  descripcion: string | null | undefined,
): Promise<number | null> {
  const desc = descripcion?.trim();
  if (!desc) {
    return null;
  }
  const enCache = cache.modelosPago.get(desc);
  if (enCache !== undefined) {
    return enCache;
  }
  const existente = await tx.tbl_modelopago.findFirst({
    where: { descripcion: desc, deletedAt: null },
  });
  if (existente) {
    cache.modelosPago.set(desc, existente.idmodelopago);
    return existente.idmodelopago;
  }
  const creado = await tx.tbl_modelopago.create({ data: { descripcion: desc } });
  cache.modelosPago.set(desc, creado.idmodelopago);
  return creado.idmodelopago;
}

export async function resolverCodigoAccion(
  tx: Tx,
  codigo: string | null | undefined,
): Promise<number | null> {
  const c = codigo?.trim().toUpperCase();
  if (!c) {
    return null;
  }
  const row = await tx.tbl_codigo_accion.findFirst({
    where: { codigo: c, deletedAt: null },
  });
  return row?.idcodaccion ?? null;
}

export async function resolverCodigoResultado(
  tx: Tx,
  codigo: string | null | undefined,
): Promise<number | null> {
  const c = codigo?.trim().toUpperCase();
  if (!c) {
    return null;
  }
  const row = await tx.tbl_codigo_resultado.findFirst({
    where: { codigo: c, deletedAt: null },
  });
  return row?.idcodresultado ?? null;
}
