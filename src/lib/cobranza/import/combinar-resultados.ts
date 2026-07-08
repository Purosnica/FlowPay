import type { ResultadoImportacionGestiones } from './gestiones-import-service';

export function combinarResultadosGestiones(
  partes: ResultadoImportacionGestiones[],
): ResultadoImportacionGestiones {
  return partes.reduce(
    (acc, r) => ({
      totalFilas: acc.totalFilas + r.totalFilas,
      gestionesCreadas: acc.gestionesCreadas + r.gestionesCreadas,
      omitidos: acc.omitidos + r.omitidos,
      errores: [...acc.errores, ...r.errores],
    }),
    {
      totalFilas: 0,
      gestionesCreadas: 0,
      omitidos: 0,
      errores: [],
    },
  );
}
