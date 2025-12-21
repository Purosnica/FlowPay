# 🚀 Instrucciones de Instalación y Configuración

## 📋 Pasos para Configurar el Sistema Completo

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Base de datos MySQL
DATABASE_URL="mysql://usuario:password@localhost:3306/flowpay"

# JWT Secret (IMPORTANTE: Cambiar en producción)
JWT_SECRET="tu-secreto-super-seguro-minimo-32-caracteres-cambiar-en-produccion"
JWT_EXPIRES_IN="7d"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

**⚠️ IMPORTANTE:** 
- Cambiar `JWT_SECRET` por un string largo y aleatorio en producción
- Usar una contraseña segura para la base de datos

### 3. Configurar Base de Datos

```bash
# Generar cliente Prisma
npm run db:generate

# Crear/actualizar tablas en la base de datos
npm run db:push

# O usar migraciones (recomendado para producción)
npm run db:migrate
```

### 4. Crear Usuarios de Prueba

```bash
# Ejecutar script de seed para crear usuarios
tsx prisma/seed-auth.ts
```

Esto creará:
- **Administrador:**
  - Email: `admin@flowpay.com`
  - Contraseña: `admin123`

- **Cobrador:**
  - Email: `cobrador@flowpay.com`
  - Contraseña: `cobrador123`

### 5. Iniciar Servidor

```bash
npm run dev
```

### 6. Acceder al Sistema

1. Abrir navegador en: `http://localhost:3000/login`
2. Ingresar credenciales:
   - Email: `admin@flowpay.com`
   - Contraseña: `admin123`
3. Serás redirigido al dashboard

## ✅ Verificación de Instalación

### Verificar que todo funciona:

1. **Login funciona:**
   - ✅ Puedes iniciar sesión con `admin@flowpay.com` / `admin123`
   - ✅ Eres redirigido al dashboard

2. **Rutas protegidas:**
   - ✅ Intentar acceder a `/cobros` sin login te redirige a `/login`
   - ✅ Después de login, puedes acceder a todas las rutas

3. **API Routes protegidas:**
   - ✅ Intentar acceder a `/api/pagos` sin token retorna 401
   - ✅ Con token válido, retorna datos

4. **Logout funciona:**
   - ✅ El botón de cerrar sesión te redirige a login
   - ✅ No puedes acceder a rutas protegidas después de logout

## 🔧 Solución de Problemas

### Error: "Cannot find module 'jsonwebtoken'"
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

### Error: "Prisma Client not generated"
```bash
npm run db:generate
```

### Error: "Table 'tbl_usuario' doesn't exist"
```bash
npm run db:push
```

### Error: "JWT_SECRET is not defined"
- Verificar que el archivo `.env` existe
- Verificar que `JWT_SECRET` está configurado
- Reiniciar el servidor después de cambiar `.env`

### Error: "Usuario sin contraseña configurada"
- Ejecutar `tsx prisma/seed-auth.ts` para crear usuarios
- Verificar que los usuarios tienen `passwordHash` y `salt`

### Las rutas no se protegen
- Verificar que `src/middleware.ts` existe
- Reiniciar el servidor de desarrollo
- Verificar que no hay errores en la consola

## 📝 Notas Importantes

1. **Base de Datos:** El sistema usa MySQL. Asegúrate de tener MySQL instalado y corriendo.

2. **Puerto:** El servidor corre en el puerto 3000 por defecto. Si está ocupado, Next.js usará otro puerto.

3. **Cookies:** El sistema usa cookies HTTP-only para almacenar el token. Asegúrate de que las cookies estén habilitadas en tu navegador.

4. **Producción:** 
   - Cambiar `JWT_SECRET` por un valor seguro
   - Usar HTTPS
   - Configurar variables de entorno en el servidor
   - Usar migraciones en lugar de `db:push`

## 🎉 ¡Listo!

Una vez completados estos pasos, el sistema estará completamente funcional con:

- ✅ Autenticación completa
- ✅ Protección de rutas
- ✅ API Routes protegidas
- ✅ Sistema de permisos
- ✅ Todos los módulos operativos

¡Disfruta del sistema! 🚀



