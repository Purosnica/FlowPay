/**

 * Verificación JWT compatible con Edge (middleware Next.js).

 */



import { jwtVerify } from 'jose';

import type { JWTPayload } from '@/lib/auth/jwt';

import { getJwtSecretKey } from '@/lib/middleware/jwt-secret';



export async function verifyTokenEdge(

  token: string,

): Promise<JWTPayload | null> {

  try {

    const { payload } = await jwtVerify(token, getJwtSecretKey());

    return {

      idusuario: Number(payload.idusuario),

      email: String(payload.email),

      nombre: String(payload.nombre),

      idrol: Number(payload.idrol),

      permisos: Array.isArray(payload.permisos)

        ? payload.permisos.map(String)

        : [],

    };

  } catch {

    return null;

  }

}

