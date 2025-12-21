# 🔐 Configuración de Autenticación

## ✅ Sistema de Autenticación Implementado

Se ha implementado un sistema completo de autenticación con:

- ✅ **JWT (JSON Web Tokens)** para sesiones
- ✅ **Cookies HTTP-only** para seguridad
- ✅ **Hash de contraseñas** con salt
- ✅ **Middleware de protección** de rutas
- ✅ **Contexto de autenticación** para React
- ✅ **Página de login** completa

## 📋 Pasos para Configurar

### 1. Actualizar Schema de Prisma

El schema ya incluye los campos necesarios:
- `passwordHash` - Hash de contraseña con salt
- `salt` - Salt para hash
- `password` - Hash simple (para migración)
- `ultimoAcceso` - Último acceso al sistema

**Ejecutar migración:**
```bash
npm run db:push
# o
npm run db:migrate
```

### 2. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL="mysql://usuario:password@localhost:3306/flowpay"

# JWT Secret (IMPORTANTE: Cambiar en producción)
JWT_SECRET="tu-secreto-super-seguro-cambiar-en-produccion"
JWT_EXPIRES_IN="7d"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Crear Usuarios de Prueba

Ejecutar el script de seed:

```bash
tsx prisma/seed-auth.ts
```

Esto creará:
- **Usuario Administrador:**
  - Email: `admin@flowpay.com`
  - Contraseña: `admin123`

- **Usuario Cobrador:**
  - Email: `cobrador@flowpay.com`
  - Contraseña: `cobrador123`

### 4. Verificar Instalación

```bash
# Instalar dependencias (si no lo has hecho)
npm install

# Generar cliente Prisma
npm run db:generate

# Iniciar servidor
npm run dev
```

## 🚀 Uso del Sistema

### Login

1. Acceder a `http://localhost:3000/login`
2. Ingresar credenciales:
   - Email: `admin@flowpay.com`
   - Contraseña: `admin123`
3. Serás redirigido al dashboard

### Protección de Rutas

Todas las rutas excepto `/login` están protegidas automáticamente por el middleware.

### API Routes Protegidas

Todas las API routes (excepto `/api/auth/login` y `/api/auth/logout`) requieren autenticación.

**Ejemplo de uso:**
```typescript
// En el frontend
const response = await fetch("/api/pagos", {
  headers: {
    "Authorization": `Bearer ${token}`,
  },
});

// O simplemente usar fetch con credentials
const response = await fetch("/api/pagos", {
  credentials: "include", // Envía cookies automáticamente
});
```

### Usar Autenticación en Componentes

```typescript
"use client";

import { useAuth } from "@/contexts/auth-context";

export function MiComponente() {
  const { usuario, loading, logout } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!usuario) {
    return <div>No autenticado</div>;
  }

  return (
    <div>
      <p>Bienvenido, {usuario.nombre}</p>
      <button onClick={logout}>Cerrar Sesión</button>
    </div>
  );
}
```

## 🔒 Seguridad

### Características de Seguridad Implementadas

1. **JWT con expiración** - Tokens expiran después de 7 días
2. **Cookies HTTP-only** - No accesibles desde JavaScript
3. **Hash con salt** - Contraseñas nunca almacenadas en texto plano
4. **Middleware de protección** - Rutas protegidas automáticamente
5. **Validación de tokens** - Verificación en cada request

### Mejoras Recomendadas para Producción

1. **Cambiar JWT_SECRET** - Usar un secreto largo y aleatorio
2. **HTTPS obligatorio** - En producción, usar siempre HTTPS
3. **Rate limiting** - Limitar intentos de login
4. **2FA** - Implementar autenticación de dos factores
5. **Refresh tokens** - Implementar renovación de tokens
6. **Logging de seguridad** - Registrar intentos de acceso fallidos

## 📁 Archivos Creados

### Backend
- `src/lib/auth/jwt.ts` - Utilidades JWT
- `src/lib/auth/password.ts` - Hash de contraseñas
- `src/lib/auth/auth-service.ts` - Servicio de autenticación
- `src/lib/middleware/auth.ts` - Middleware de autenticación (actualizado)
- `src/middleware.ts` - Middleware de Next.js para protección de rutas

### API Routes
- `src/app/api/auth/login/route.ts` - Endpoint de login
- `src/app/api/auth/logout/route.ts` - Endpoint de logout
- `src/app/api/auth/me/route.ts` - Obtener usuario actual

### Frontend
- `src/contexts/auth-context.tsx` - Contexto de autenticación
- `src/app/login/page.tsx` - Página de login
- `src/app/login/layout.tsx` - Layout sin sidebar para login
- `src/app/(dashboard)/layout.tsx` - Layout con sidebar para dashboard
- `src/components/Layouts/header-auth.tsx` - Componente de header con usuario

### Scripts
- `prisma/seed-auth.ts` - Script para crear usuarios de prueba

## 🐛 Solución de Problemas

### Error: "Token inválido o expirado"
- Verificar que JWT_SECRET esté configurado
- Verificar que el token no haya expirado
- Limpiar cookies y volver a iniciar sesión

### Error: "Usuario no encontrado"
- Ejecutar `tsx prisma/seed-auth.ts` para crear usuarios
- Verificar que el email sea correcto

### Error: "Credenciales inválidas"
- Verificar que la contraseña sea correcta
- Verificar que el usuario esté activo en la base de datos

### Las rutas no se protegen
- Verificar que `src/middleware.ts` exista
- Verificar que Next.js esté usando el middleware
- Reiniciar el servidor de desarrollo

## ✅ Verificación Final

1. ✅ Schema actualizado con campos de password
2. ✅ Variables de entorno configuradas
3. ✅ Usuarios de prueba creados
4. ✅ Middleware de protección activo
5. ✅ Página de login funcional
6. ✅ API routes protegidas
7. ✅ Contexto de autenticación funcionando

## 🎉 Sistema Listo

El sistema de autenticación está completamente funcional. Solo necesitas:

1. Configurar `.env` con tus credenciales
2. Ejecutar `npm run db:push`
3. Ejecutar `tsx prisma/seed-auth.ts`
4. Iniciar el servidor con `npm run dev`
5. Acceder a `http://localhost:3000/login`

¡Listo para usar! 🚀



