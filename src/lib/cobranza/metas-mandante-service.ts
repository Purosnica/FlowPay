import { prisma } from '@/lib/prisma';
import {
  CLAVE_META_GESTIONES_SEMANA,
  CLAVE_META_RECUPERACION_MES,
  CLAVE_META_RECUPERACION_SEMANA,
  claveMetaMandante,
  guardarConfigCobranza,
  obtenerConfigCobranza,
  obtenerConfigNumericaConFallback,
  obtenerMetaRecuperacionMes,
} from './configuracion-cobranza-service';
import { requerirAccesoMandante } from './mandante-scope';

export interface MetasMandante {
  idmandante: number;
  metaGestionesSemana: number;
  metaRecuperacionSemana: number;
  metaRecuperacionMes: number;
  usaGlobalGestionesSemana: boolean;
  usaGlobalRecuperacionSemana: boolean;
  usaGlobalRecuperacionMes: boolean;
}

export interface ActualizarMetasMandanteInput {
  metaGestionesSemana?: number | null;
  metaRecuperacionSemana?: number | null;
  metaRecuperacionMes?: number | null;
}

async function tieneOverride(clave: string): Promise<boolean> {
  const valor = await obtenerConfigCobranza(clave);
  if (!valor) {
    return false;
  }
  const n = Number(valor);
  return Number.isFinite(n) && n > 0;
}

export async function obtenerMetasMandante(
  idusuario: number,
  idmandante: number,
): Promise<MetasMandante> {
  await requerirAccesoMandante(idusuario, idmandante);

  const claveGestiones = claveMetaMandante(
    CLAVE_META_GESTIONES_SEMANA,
    idmandante,
  );
  const claveRecuperacionSem = claveMetaMandante(
    CLAVE_META_RECUPERACION_SEMANA,
    idmandante,
  );
  const claveRecuperacionMes = claveMetaMandante(
    CLAVE_META_RECUPERACION_MES,
    idmandante,
  );

  const [
    usaGlobalGestionesSemana,
    usaGlobalRecuperacionSemana,
    usaGlobalRecuperacionMes,
    metaGestionesSemana,
    metaRecuperacionSemana,
    metaRecuperacionMes,
  ] = await Promise.all([
    tieneOverride(claveGestiones).then((v) => !v),
    tieneOverride(claveRecuperacionSem).then((v) => !v),
    tieneOverride(claveRecuperacionMes).then((v) => !v),
    obtenerConfigNumericaConFallback(claveGestiones, CLAVE_META_GESTIONES_SEMANA),
    obtenerConfigNumericaConFallback(
      claveRecuperacionSem,
      CLAVE_META_RECUPERACION_SEMANA,
    ),
    obtenerMetaRecuperacionMes(idmandante),
  ]);

  return {
    idmandante,
    metaGestionesSemana,
    metaRecuperacionSemana,
    metaRecuperacionMes,
    usaGlobalGestionesSemana,
    usaGlobalRecuperacionSemana,
    usaGlobalRecuperacionMes,
  };
}

export async function actualizarMetasMandante(
  idusuario: number,
  idmandante: number,
  input: ActualizarMetasMandanteInput,
): Promise<MetasMandante> {
  await requerirAccesoMandante(idusuario, idmandante);

  if (input.metaGestionesSemana != null) {
    await guardarConfigCobranza(
      claveMetaMandante(CLAVE_META_GESTIONES_SEMANA, idmandante),
      String(input.metaGestionesSemana),
      idusuario,
    );
  }
  if (input.metaRecuperacionSemana != null) {
    await guardarConfigCobranza(
      claveMetaMandante(CLAVE_META_RECUPERACION_SEMANA, idmandante),
      String(input.metaRecuperacionSemana),
      idusuario,
    );
  }
  if (input.metaRecuperacionMes != null) {
    await guardarConfigCobranza(
      claveMetaMandante(CLAVE_META_RECUPERACION_MES, idmandante),
      String(input.metaRecuperacionMes),
      idusuario,
    );
  }

  return obtenerMetasMandante(idusuario, idmandante);
}

export async function restablecerMetasMandanteGlobal(
  idusuario: number,
  idmandante: number,
): Promise<MetasMandante> {
  await requerirAccesoMandante(idusuario, idmandante);

  const claves = [
    claveMetaMandante(CLAVE_META_GESTIONES_SEMANA, idmandante),
    claveMetaMandante(CLAVE_META_RECUPERACION_SEMANA, idmandante),
    claveMetaMandante(CLAVE_META_RECUPERACION_MES, idmandante),
  ];

  await prisma.tbl_configuracion_sistema.updateMany({
    where: { clave: { in: claves }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return obtenerMetasMandante(idusuario, idmandante);
}
