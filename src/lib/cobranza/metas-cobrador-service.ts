import { prisma } from '@/lib/prisma';
import {
  CLAVE_META_GESTIONES_SEMANA,
  CLAVE_META_RECUPERACION_SEMANA,
  claveMetaUsuario,
  guardarConfigCobranza,
  obtenerConfigCobranza,
  obtenerMetaGestionesSemanaUsuario,
  obtenerMetaRecuperacionSemanaUsuario,
} from './configuracion-cobranza-service';
import { obtenerIdsEquipo } from './equipo-scope';

export interface MetasCobrador {
  idgestor: number;
  nombre: string;
  metaGestionesSemana: number;
  metaRecuperacionSemana: number;
  usaGlobalGestionesSemana: boolean;
  usaGlobalRecuperacionSemana: boolean;
}

export interface ActualizarMetasCobradorInput {
  metaGestionesSemana?: number | null;
  metaRecuperacionSemana?: number | null;
}

async function requerirCobradorEnEquipo(
  idsupervisor: number,
  idgestor: number,
): Promise<void> {
  const equipoIds = await obtenerIdsEquipo(idsupervisor);
  if (!equipoIds.includes(idgestor)) {
    throw new Error('El cobrador no pertenece a su equipo.');
  }
}

async function tieneOverride(clave: string): Promise<boolean> {
  const valor = await obtenerConfigCobranza(clave);
  if (!valor) {
    return false;
  }
  const n = Number(valor);
  return Number.isFinite(n) && n > 0;
}

export async function obtenerMetasCobrador(
  idsupervisor: number,
  idgestor: number,
): Promise<MetasCobrador> {
  await requerirCobradorEnEquipo(idsupervisor, idgestor);

  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario: idgestor, deletedAt: null, activo: true },
    select: { nombre: true },
  });
  if (!usuario) {
    throw new Error('Cobrador no encontrado.');
  }

  const claveGestiones = claveMetaUsuario(
    CLAVE_META_GESTIONES_SEMANA,
    idgestor,
  );
  const claveRecuperacion = claveMetaUsuario(
    CLAVE_META_RECUPERACION_SEMANA,
    idgestor,
  );

  const [
    usaGlobalGestionesSemana,
    usaGlobalRecuperacionSemana,
    metaGestionesSemana,
    metaRecuperacionSemana,
  ] = await Promise.all([
    tieneOverride(claveGestiones).then((v) => !v),
    tieneOverride(claveRecuperacion).then((v) => !v),
    obtenerMetaGestionesSemanaUsuario(idgestor),
    obtenerMetaRecuperacionSemanaUsuario(idgestor),
  ]);

  return {
    idgestor,
    nombre: usuario.nombre,
    metaGestionesSemana,
    metaRecuperacionSemana,
    usaGlobalGestionesSemana,
    usaGlobalRecuperacionSemana,
  };
}

export async function actualizarMetasCobrador(
  idsupervisor: number,
  idgestor: number,
  input: ActualizarMetasCobradorInput,
): Promise<MetasCobrador> {
  await requerirCobradorEnEquipo(idsupervisor, idgestor);

  if (input.metaGestionesSemana != null) {
    await guardarConfigCobranza(
      claveMetaUsuario(CLAVE_META_GESTIONES_SEMANA, idgestor),
      String(input.metaGestionesSemana),
      idsupervisor,
    );
  }
  if (input.metaRecuperacionSemana != null) {
    await guardarConfigCobranza(
      claveMetaUsuario(CLAVE_META_RECUPERACION_SEMANA, idgestor),
      String(input.metaRecuperacionSemana),
      idsupervisor,
    );
  }

  return obtenerMetasCobrador(idsupervisor, idgestor);
}
