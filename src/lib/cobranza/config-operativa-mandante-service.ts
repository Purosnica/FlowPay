import { prisma } from '@/lib/prisma';
import {
  CLAVE_ACUERDO_DIAS_GRACIA,
  CLAVE_DIAS_MORA_CASTIGO,
  CLAVE_MORA_DIAS_GRACIA,
  CLAVE_PAGO_AUTO_APLICAR,
  claveMetaMandante,
  guardarConfigCobranza,
  obtenerConfigBooleanaMandante,
  obtenerConfigNumericaMandante,
} from './configuracion-cobranza-service';
import { requerirAccesoMandante } from './mandante-scope';

export interface ConfigOperativaMandante {
  idmandante: number;
  pagoAutoAplicar: boolean;
  acuerdoDiasGracia: number;
  diasMoraCastigo: number;
  moraDiasGracia: number;
  usaGlobalPagoAutoAplicar: boolean;
  usaGlobalAcuerdoDiasGracia: boolean;
  usaGlobalDiasMoraCastigo: boolean;
  usaGlobalMoraDiasGracia: boolean;
}

export interface ActualizarConfigOperativaMandanteInput {
  pagoAutoAplicar?: boolean | null;
  acuerdoDiasGracia?: number | null;
  diasMoraCastigo?: number | null;
  moraDiasGracia?: number | null;
}

async function tieneOverrideClave(clave: string): Promise<boolean> {
  const row = await prisma.tbl_configuracion_sistema.findFirst({
    where: { clave, deletedAt: null },
    select: { valor: true },
  });
  return row?.valor != null && row.valor !== '';
}

export async function obtenerConfigOperativaMandante(
  idusuario: number,
  idmandante: number,
): Promise<ConfigOperativaMandante> {
  await requerirAccesoMandante(idusuario, idmandante);

  const claveAuto = claveMetaMandante(CLAVE_PAGO_AUTO_APLICAR, idmandante);
  const claveAcuerdo = claveMetaMandante(CLAVE_ACUERDO_DIAS_GRACIA, idmandante);
  const claveCastigo = claveMetaMandante(CLAVE_DIAS_MORA_CASTIGO, idmandante);
  const claveMoraGracia = claveMetaMandante(CLAVE_MORA_DIAS_GRACIA, idmandante);

  const [
    usaGlobalPagoAutoAplicar,
    usaGlobalAcuerdoDiasGracia,
    usaGlobalDiasMoraCastigo,
    usaGlobalMoraDiasGracia,
    pagoAutoAplicar,
    acuerdoDiasGracia,
    diasMoraCastigo,
    moraDiasGracia,
  ] = await Promise.all([
    tieneOverrideClave(claveAuto).then((v) => !v),
    tieneOverrideClave(claveAcuerdo).then((v) => !v),
    tieneOverrideClave(claveCastigo).then((v) => !v),
    tieneOverrideClave(claveMoraGracia).then((v) => !v),
    obtenerConfigBooleanaMandante(CLAVE_PAGO_AUTO_APLICAR, idmandante),
    obtenerConfigNumericaMandante(CLAVE_ACUERDO_DIAS_GRACIA, idmandante),
    obtenerConfigNumericaMandante(CLAVE_DIAS_MORA_CASTIGO, idmandante),
    obtenerConfigNumericaMandante(CLAVE_MORA_DIAS_GRACIA, idmandante),
  ]);

  return {
    idmandante,
    pagoAutoAplicar,
    acuerdoDiasGracia,
    diasMoraCastigo,
    moraDiasGracia,
    usaGlobalPagoAutoAplicar,
    usaGlobalAcuerdoDiasGracia,
    usaGlobalDiasMoraCastigo,
    usaGlobalMoraDiasGracia,
  };
}

export async function actualizarConfigOperativaMandante(
  idusuario: number,
  idmandante: number,
  input: ActualizarConfigOperativaMandanteInput,
): Promise<ConfigOperativaMandante> {
  await requerirAccesoMandante(idusuario, idmandante);

  if (input.pagoAutoAplicar !== undefined && input.pagoAutoAplicar !== null) {
    await guardarConfigCobranza(
      claveMetaMandante(CLAVE_PAGO_AUTO_APLICAR, idmandante),
      input.pagoAutoAplicar ? 'true' : 'false',
      idusuario,
    );
  }
  if (input.acuerdoDiasGracia != null) {
    await guardarConfigCobranza(
      claveMetaMandante(CLAVE_ACUERDO_DIAS_GRACIA, idmandante),
      String(input.acuerdoDiasGracia),
      idusuario,
    );
  }
  if (input.diasMoraCastigo != null) {
    await guardarConfigCobranza(
      claveMetaMandante(CLAVE_DIAS_MORA_CASTIGO, idmandante),
      String(input.diasMoraCastigo),
      idusuario,
    );
  }
  if (input.moraDiasGracia != null) {
    await guardarConfigCobranza(
      claveMetaMandante(CLAVE_MORA_DIAS_GRACIA, idmandante),
      String(input.moraDiasGracia),
      idusuario,
    );
  }

  return obtenerConfigOperativaMandante(idusuario, idmandante);
}

export async function restablecerConfigOperativaMandanteGlobal(
  idusuario: number,
  idmandante: number,
): Promise<ConfigOperativaMandante> {
  await requerirAccesoMandante(idusuario, idmandante);

  const claves = [
    claveMetaMandante(CLAVE_PAGO_AUTO_APLICAR, idmandante),
    claveMetaMandante(CLAVE_ACUERDO_DIAS_GRACIA, idmandante),
    claveMetaMandante(CLAVE_DIAS_MORA_CASTIGO, idmandante),
    claveMetaMandante(CLAVE_MORA_DIAS_GRACIA, idmandante),
  ];

  await prisma.tbl_configuracion_sistema.updateMany({
    where: { clave: { in: claves }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return obtenerConfigOperativaMandante(idusuario, idmandante);
}
