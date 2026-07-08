import { importarCartera } from './cartera-import-service';
import { importarGestiones } from './gestiones-import-service';
import { importarPagosHistoricos } from './pagos-import-service';
import { combinarResultadosGestiones } from './combinar-resultados';
import {
  type ResultadoImportacionGestiones,
  type ResultadoImportacionCompleta,
} from '@/types/cobranza';


export type { ResultadoImportacionCompleta };

export type TipoImportacionCobranza =
  | 'CARTERA'
  | 'GESTIONES'
  | 'PAGOS'
  | 'PROMESAS'
  | 'CONTACTOS'
  | 'COMPLETO';

const HOJAS_GESTIONES_COMPLETO = ['REGISTROS', 'PROMESAS', 'CONTACTOS'] as const;

export interface ImportarCobranzaParams {
  tipo: TipoImportacionCobranza;
  idmandante: number;
  idusuario: number;
  buffer: Buffer;
  nombreArchivo: string;
  idcampana?: number;
  fechaCorte?: Date;
  nombreHoja?: string;
  idplantillaImp?: number;
}

export async function importarCobranza(
  params: ImportarCobranzaParams,
): Promise<ResultadoImportacionCompleta> {
  const resultado: ResultadoImportacionCompleta = {
    tipo: params.tipo,
    advertencias: [],
  };

  if (params.tipo === 'CARTERA' || params.tipo === 'COMPLETO') {
    if (!params.idcampana || !params.fechaCorte) {
      throw new Error('Cartera requiere idcampana y fechaCorte.');
    }
    resultado.cartera = await importarCartera({
      idmandante: params.idmandante,
      idcampana: params.idcampana,
      fechaCorte: params.fechaCorte,
      idusuario: params.idusuario,
      buffer: params.buffer,
      nombreArchivo: params.nombreArchivo,
      nombreHoja: params.nombreHoja ?? 'data',
      idplantillaImp: params.idplantillaImp,
    });
  }

  if (
    params.tipo === 'GESTIONES' ||
    params.tipo === 'PROMESAS' ||
    params.tipo === 'CONTACTOS' ||
    params.tipo === 'COMPLETO'
  ) {
    const hojas =
      params.tipo === 'COMPLETO'
        ? [...HOJAS_GESTIONES_COMPLETO]
        : [
            params.nombreHoja ??
              (params.tipo === 'PROMESAS'
                ? 'PROMESAS'
                : params.tipo === 'CONTACTOS'
                  ? 'CONTACTOS'
                  : 'REGISTROS'),
          ];

    const partes: ResultadoImportacionGestiones[] = [];
    for (const hoja of hojas) {
      try {
        const parte = await importarGestiones({
          idmandante: params.idmandante,
          idusuario: params.idusuario,
          buffer: params.buffer,
          nombreArchivo: params.nombreArchivo,
          nombreHoja: hoja,
        });
        partes.push(parte);
      } catch (error) {
        if (params.tipo !== 'COMPLETO') {
          throw error;
        }
        const mensaje =
          error instanceof Error ? error.message : 'Error desconocido';
        resultado.advertencias?.push(`Hoja ${hoja}: ${mensaje}`);
      }
    }
    if (partes.length > 0) {
      resultado.gestiones = combinarResultadosGestiones(partes);
    }
  }

  if (params.tipo === 'PAGOS' || params.tipo === 'COMPLETO') {
    resultado.pagos = await importarPagosHistoricos({
      idmandante: params.idmandante,
      idusuario: params.idusuario,
      buffer: params.buffer,
      nombreArchivo: params.nombreArchivo,
      nombreHoja: params.tipo === 'PAGOS' ? params.nombreHoja : 'PAGOS',
    });
  }

  return resultado;
}
