# Configuración de SQL Server para FlowPay

Esta guía te ayudará a configurar SQL Server como base de datos para el proyecto FlowPay.

## Requisitos Previos

- SQL Server instalado (Express, Developer, o LocalDB)
- Node.js y npm instalados
- Prisma CLI (incluido en las dependencias)

## Opciones de SQL Server

### 1. SQL Server Express (Recomendado para desarrollo)

**Descarga:** https://www.microsoft.com/sql-server/sql-server-downloads

**Instalación:**
1. Descarga SQL Server Express
2. Durante la instalación, selecciona "Mixed Mode Authentication"
3. Configura una contraseña para el usuario `sa`
4. Anota el nombre de la instancia (por defecto: `SQLEXPRESS`)

### 2. SQL Server LocalDB (Más ligero)

**Incluido con:**
- Visual Studio
- SQL Server Express

**Uso:**
- Se inicia automáticamente cuando se necesita
- Ideal para desarrollo local

### 3. Azure SQL Database (Producción)

**Ventajas:**
- Escalable
- Administrado por Microsoft
- Alta disponibilidad

**Configuración:**
1. Crea una base de datos en Azure Portal
2. Obtén la connection string desde Azure Portal
3. Usa la connection string en tu `.env`

## Connection String

### Formato General

```
sqlserver://server:port;database=dbname;user=username;password=password;encrypt=true
```

### Ejemplos

#### SQL Server Express (Local)
```env
DATABASE_URL="sqlserver://localhost\\SQLEXPRESS:1433;database=flowpay;user=sa;password=YourPassword123;encrypt=true;trustServerCertificate=true"
```

#### SQL Server LocalDB
```env
DATABASE_URL="sqlserver://(localdb)\\MSSQLLocalDB:1433;database=flowpay;user=sa;password=YourPassword123;encrypt=true;trustServerCertificate=true"
```

#### Azure SQL Database
```env
DATABASE_URL="sqlserver://your-server.database.windows.net:1433;database=flowpay;user=your-username;password=your-password;encrypt=true"
```

#### SQL Server con Windows Authentication
```env
DATABASE_URL="sqlserver://localhost:1433;database=flowpay;integratedSecurity=true;trustServerCertificate=true"
```

## Parámetros Importantes

- **encrypt**: `true` - Encripta la conexión (requerido para Azure)
- **trustServerCertificate**: `true` - Confía en el certificado del servidor (solo desarrollo)
- **connectionTimeout**: `30` - Timeout de conexión en segundos
- **pooling**: `true` - Habilita connection pooling

## Configuración del Proyecto

### 1. Crear la Base de Datos

Conecta a SQL Server y ejecuta:

```sql
CREATE DATABASE flowpay;
GO
```

### 2. Configurar Variables de Entorno

Crea o actualiza tu archivo `.env`:

```env
DATABASE_URL="sqlserver://localhost:1433;database=flowpay;user=sa;password=YourPassword123;encrypt=true;trustServerCertificate=true"
```

### 3. Generar el Cliente de Prisma

```bash
npm run db:generate
```

### 4. Crear las Tablas

```bash
npm run db:push
```

O con migraciones:

```bash
npm run db:migrate
```

### 5. (Opcional) Poblar con Datos de Ejemplo

```bash
npm run db:seed
```

## Diferencias con PostgreSQL

### Cambios en el Schema

1. **IDs**: Cambiado de `@default(cuid())` a `@default(uuid())`
   - SQL Server no soporta `cuid()` nativamente
   - `uuid()` genera GUIDs compatibles con SQL Server

2. **Tipos de Datos**:
   - `String` → `@db.NVarChar(255)` para campos de texto
   - `Float` → `@db.Decimal(18, 2)` para valores monetarios
   - `Float` → `@db.Decimal(5, 2)` para porcentajes

3. **Campos de Texto Largo**:
   - `@db.NVarChar(Max)` para campos de texto sin límite

### Características Específicas de SQL Server

- **Case Sensitivity**: SQL Server es case-insensitive por defecto
- **Schema**: No usa schemas como PostgreSQL, pero puedes usar `@@schema` si es necesario
- **Enums**: Se crean como tablas separadas en SQL Server

## Solución de Problemas

### Error: "Login failed for user"

**Solución:**
- Verifica que el usuario y contraseña sean correctos
- Asegúrate de que SQL Server acepta autenticación SQL
- Verifica que el usuario tenga permisos en la base de datos

### Error: "Cannot connect to server"

**Solución:**
- Verifica que SQL Server esté corriendo
- Verifica el puerto (por defecto 1433)
- Verifica el firewall
- Para LocalDB, verifica que la instancia esté iniciada

### Error: "Certificate validation failed"

**Solución:**
- Para desarrollo, agrega `trustServerCertificate=true` a la connection string
- Para producción, configura un certificado SSL válido

### Error: "Database does not exist"

**Solución:**
- Crea la base de datos manualmente antes de ejecutar `db:push`
- O usa `db:migrate` que puede crear la base de datos automáticamente

## Verificación

Para verificar que todo funciona:

```bash
# Generar cliente
npm run db:generate

# Verificar conexión
npm run db:studio
```

Si Prisma Studio se abre correctamente, la conexión está funcionando.

## Recursos Adicionales

- [Documentación de Prisma con SQL Server](https://www.prisma.io/docs/concepts/database-connectors/sql-server)
- [Connection String Reference](https://www.connectionstrings.com/sql-server/)
- [SQL Server Downloads](https://www.microsoft.com/sql-server/sql-server-downloads)
