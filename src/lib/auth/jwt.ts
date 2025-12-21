/**
 * UTILIDADES JWT PARA AUTENTICACIÓN
 * 
 * Maneja la creación y verificación de tokens JWT
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

// Validar que JWT_SECRET esté configurado en producción
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET debe estar configurado en producción. " +
      "Configura la variable de entorno JWT_SECRET con un valor seguro (mínimo 32 caracteres aleatorios)."
    );
  }
  // Solo en desarrollo, usar un valor por defecto (NO usar en producción)
  console.warn(
    "⚠️ ADVERTENCIA: JWT_SECRET no está configurado. " +
    "Usando valor por defecto inseguro. Configura JWT_SECRET en producción."
  );
}

const JWT_SECRET_FINAL = JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface JWTPayload {
  idusuario: number;
  email: string;
  nombre: string;
  idrol: number;
}

/**
 * Genera un token JWT para un usuario
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET_FINAL as string, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_FINAL as string) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error("Token inválido o expirado");
  }
}

/**
 * Decodifica un token sin verificar (útil para debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}



