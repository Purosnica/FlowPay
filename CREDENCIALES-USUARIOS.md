# 🔐 Credenciales de Usuarios de Prueba

## Usuarios Configurados

### 👤 Administrador
- **Email:** `admin@flowpay.com`
- **Contraseña:** `admin123`
- **Rol:** Administrador del sistema
- **Permisos:** Acceso completo al sistema

### 👤 Cobrador
- **Email:** `cobrador@flowpay.com`
- **Contraseña:** `cobrador123`
- **Rol:** Cobrador de cartera
- **Permisos:** Acceso a funciones de cobranza

## 📝 Notas Importantes

1. **Seguridad:** Estas credenciales son solo para desarrollo y pruebas. **NO** uses estas contraseñas en producción.

2. **Reiniciar Contraseñas:** Si necesitas resetear las contraseñas, ejecuta:
   ```bash
   npm run db:seed
   ```

3. **Crear Nuevos Usuarios:** Puedes modificar el archivo `prisma/seed-auth.ts` para agregar más usuarios de prueba.

## 🚀 Cómo Acceder

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre tu navegador en: `http://localhost:3000/login`

3. Ingresa las credenciales de cualquiera de los usuarios arriba mencionados.

## ⚠️ Recordatorio

- Asegúrate de que la base de datos esté configurada correctamente antes de intentar iniciar sesión.
- Si tienes problemas de conexión, verifica el archivo `.env` y ejecuta `node test-connection.js`.

