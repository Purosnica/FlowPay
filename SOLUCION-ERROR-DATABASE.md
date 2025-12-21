# Solución: Error de Autenticación de Base de Datos

## Problema
```
Authentication failed against database server, the provided database credentials for `gcvqhfxd_bssilva` are not valid.
```

## Soluciones

### 1. Verificar Credenciales en el Panel de Control

Accede al panel de control de tu hosting (Banahosting) y verifica:
- ✅ Usuario de la base de datos: `gcvqhfxd_bssilva`
- ✅ Contraseña de la base de datos
- ✅ Nombre de la base de datos: `gcvqhfxd_flowpay`
- ✅ Host: `bh8932.banahosting.com`
- ✅ Puerto: `3306`

### 2. Verificar el Formato de la URL

La URL debe tener este formato:
```
mysql://usuario:contraseña@host:puerto/nombre_base_datos
```

**Importante sobre la contraseña:**
- Si la contraseña contiene caracteres especiales (`@`, `#`, `%`, etc.), deben estar URL-encoded
- `@` se codifica como `%40`
- `#` se codifica como `%23`
- `%` se codifica como `%25`

### 3. Ejemplos de URLs Correctas

**Si tu contraseña es `B@ttlefield505`:**
```env
DATABASE_URL="mysql://gcvqhfxd_bssilva:B%40ttlefield505@bh8932.banahosting.com:3306/gcvqhfxd_flowpay"
```

**Si tu contraseña es `miPassword123`:**
```env
DATABASE_URL="mysql://gcvqhfxd_bssilva:miPassword123@bh8932.banahosting.com:3306/gcvqhfxd_flowpay"
```

**Si tu contraseña contiene espacios o caracteres especiales:**
```env
# Ejemplo: contraseña = "Mi Pass#123"
DATABASE_URL="mysql://gcvqhfxd_bssilva:Mi%20Pass%23123@bh8932.banahosting.com:3306/gcvqhfxd_flowpay"
```

### 4. Verificar Conexiones Remotas

Algunos hostings requieren habilitar conexiones remotas:
1. Accede al panel de control de Banahosting
2. Busca la opción "Acceso Remoto" o "Remote Access"
3. Asegúrate de que esté habilitado
4. Si hay restricciones por IP, agrega tu IP actual

### 5. Probar la Conexión

Ejecuta el script de prueba:
```bash
node test-connection.js
```

### 6. Verificar SSL (si es necesario)

Si tu hosting requiere SSL, agrega parámetros a la URL:
```env
DATABASE_URL="mysql://usuario:contraseña@host:puerto/database?sslmode=REQUIRED"
```

### 7. Resetear Contraseña (si es necesario)

Si no estás seguro de la contraseña:
1. Accede al panel de control de Banahosting
2. Ve a "Bases de Datos" > "MySQL"
3. Selecciona tu base de datos
4. Cambia la contraseña
5. Actualiza el archivo `.env` con la nueva contraseña (URL-encoded si es necesario)

### 8. Verificar que la Base de Datos Exista

Asegúrate de que la base de datos `gcvqhfxd_flowpay` exista:
1. En el panel de control, verifica que la base de datos esté creada
2. Verifica que el usuario tenga permisos sobre esa base de datos

## Pasos Siguientes

1. ✅ Verifica las credenciales en el panel de control
2. ✅ Actualiza el archivo `.env` con las credenciales correctas
3. ✅ Ejecuta `node test-connection.js` para probar
4. ✅ Si funciona, ejecuta `npm run db:push` para crear las tablas
5. ✅ Ejecuta `npm run db:seed` para poblar datos iniciales

## Herramienta de Codificación de URL

Si necesitas codificar tu contraseña, puedes usar:
- JavaScript: `encodeURIComponent('tu-contraseña')`
- Online: https://www.urlencoder.org/

Ejemplo:
```javascript
encodeURIComponent('B@ttlefield505') // Resultado: B%40ttlefield505
```

