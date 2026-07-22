/**
 * Helper inmutable de versionado de plantillas de import (I014).
 */

import { createHash, randomUUID } from 'node:crypto';

export function hashMapeoPlantilla(mapeo: string): string {
  return createHash('sha256').update(mapeo).digest('hex');
}

export function nuevoContratoIdPlantilla(): string {
  return randomUUID();
}

export function debeVersionarMapeo(
  mapeoAnterior: string,
  mapeoNuevo: string | undefined,
): boolean {
  if (mapeoNuevo === undefined) {
    return false;
  }
  return hashMapeoPlantilla(mapeoAnterior) !== hashMapeoPlantilla(mapeoNuevo);
}

export type PlantillaVersionMeta = {
  contratoId: string;
  version: number;
  mapeoHash: string;
};

export function metaNuevaPlantilla(mapeo: string): PlantillaVersionMeta {
  return {
    contratoId: nuevoContratoIdPlantilla(),
    version: 1,
    mapeoHash: hashMapeoPlantilla(mapeo),
  };
}

export function metaNuevaVersion(params: {
  contratoId: string;
  versionAnterior: number;
  mapeoNuevo: string;
}): PlantillaVersionMeta {
  return {
    contratoId: params.contratoId,
    version: params.versionAnterior + 1,
    mapeoHash: hashMapeoPlantilla(params.mapeoNuevo),
  };
}
