# MÓDULO DE CONFIGURACIÓN DEL SISTEMA

Este documento describe el módulo de configuración del sistema de FlowPay, que permite gestionar parámetros globales de forma centralizada y accesible desde cualquier módulo.

## 📋 Índice

1. [Arquitectura](#arquitectura)
2. [Parámetros Disponibles](#parámetros-disponibles)
3. [Servicio de Configuración](#servicio-de-configuración)
4. [GraphQL API](#graphql-api)
5. [Uso en Módulos](#uso-en-módulos)
6. [Seguridad y Permisos](#seguridad-y-permisos)

---

## Arquitectura

### Modelo de Datos

El módulo utiliza la tabla `tbl_configuracion_sistema`:

```prisma
model tbl_configuracion_sistema {
  idconfiguracion Int      @id @default(autoincrement())
  clave           String    @unique
  valor           String    @db.Text
  tipo            String    // "numero", "decimal", "texto", "json", "booleano"
  descripcion     String?   @db.Text
  categoria       String?   // "mora", "cobranza", "reestructuracion", "prestamos", "pagos"
  idusuarioMod    Int?
  deletedAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### Componentes

1. **Servicio de Configuración** (`src/lib/config/config-service.ts`)
   - Funciones helper para leer configuraciones
   - Caché en memoria para mejor rendimiento
   - Funciones tipadas por parámetro

2. **GraphQL Resolvers** (`src/lib/graphql/resolvers/finanzas/configuracion.ts`)
   - Queries para leer configuraciones
   - Mutations para actualizar (solo ADMIN)

3. **Script de Seed** (`prisma/seed-configuracion.ts`)
   - Inicializa configuraciones por defecto

---

## Parámetros Disponibles

### Configuraciones de Mora

| Clave | Tipo | Valor por Defecto | Descripción |
|-------|------|------------------|-------------|
| `TASA_MORA` | decimal | `0.36` | Tasa de mora anual (ej: 0.36 = 36%) |
| `DIAS_GRACIA` | numero | `0` | Días de gracia antes de aplicar mora |
| `DIAS_MORA_CASTIGADO` | numero | `90` | Días de mora para considerar préstamo como castigado |

### Configuraciones de Cobranza

| Clave | Tipo | Valor por Defecto | Descripción |
|-------|------|------------------|-------------|
| `HORARIO_COBRANZA_INICIO` | texto | `08:00` | Hora de inicio permitida (HH:mm) |
| `HORARIO_COBRANZA_FIN` | texto | `18:00` | Hora de fin permitida (HH:mm) |
| `DIAS_COBRANZA_PERMITIDOS` | texto | `1,2,3,4,5` | Días de la semana permitidos (1=Lunes, 7=Domingo) |

### Configuraciones de Reestructuración

| Clave | Tipo | Valor por Defecto | Descripción |
|-------|------|------------------|-------------|
| `MAXIMO_REESTRUCTURACIONES` | numero | `2` | Número máximo de reestructuraciones por préstamo |
| `LIMITE_REESTRUCTURACION_DIAS_MORA` | numero | `90` | Días máximos de mora para permitir reestructuración |
| `LIMITE_REESTRUCTURACION_MONTO` | numero | `100000` | Monto máximo para permitir reestructuración |

### Configuraciones de Préstamos

| Clave | Tipo | Valor por Defecto | Descripción |
|-------|------|------------------|-------------|
| `LIMITE_MONTO_PRESTAMO` | decimal | `1000000` | Límite máximo de monto para préstamos |

### Configuraciones de Pagos

| Clave | Tipo | Valor por Defecto | Descripción |
|-------|------|------------------|-------------|
| `METODOS_PAGO_HABILITADOS` | texto | `EFECTIVO,TRANSFERENCIA,TARJETA,CHEQUE` | Métodos de pago habilitados (separados por comas) |

---

## Servicio de Configuración

### Funciones Generales

#### `obtenerConfiguracion(clave, valorPorDefecto?, usarCache?)`
Obtiene el valor de una configuración como string.

```typescript
import { obtenerConfiguracion } from "@/lib/config/config-service";

const valor = await obtenerConfiguracion("TASA_MORA", "0.36");
```

#### `obtenerConfiguracionNumero(clave, valorPorDefecto?)`
Obtiene el valor como número.

```typescript
import { obtenerConfiguracionNumero } from "@/lib/config/config-service";

const dias = await obtenerConfiguracionNumero("DIAS_GRACIA", 0);
```

#### `obtenerConfiguracionDecimal(clave, valorPorDefecto?)`
Obtiene el valor como decimal.

```typescript
import { obtenerConfiguracionDecimal } from "@/lib/config/config-service";

const tasa = await obtenerConfiguracionDecimal("TASA_MORA", 0.36);
```

#### `obtenerConfiguracionBooleano(clave, valorPorDefecto?)`
Obtiene el valor como booleano.

```typescript
import { obtenerConfiguracionBooleano } from "@/lib/config/config-service";

const habilitado = await obtenerConfiguracionBooleano("FEATURE_ENABLED", false);
```

#### `obtenerConfiguracionArray(clave, valorPorDefecto?)`
Obtiene el valor como array (separado por comas).

```typescript
import { obtenerConfiguracionArray } from "@/lib/config/config-service";

const metodos = await obtenerConfiguracionArray("METODOS_PAGO_HABILITADOS", []);
```

#### `obtenerConfiguracionJSON(clave, valorPorDefecto?)`
Obtiene el valor como objeto JSON.

```typescript
import { obtenerConfiguracionJSON } from "@/lib/config/config-service";

const config = await obtenerConfiguracionJSON("COMPLEX_CONFIG", {});
```

### Funciones Helper Específicas

#### `obtenerTasaMora()`
Obtiene la tasa de mora anual.

```typescript
import { obtenerTasaMora } from "@/lib/config/config-service";

const tasaMora = await obtenerTasaMora(); // 0.36
```

#### `obtenerDiasGracia()`
Obtiene los días de gracia.

```typescript
import { obtenerDiasGracia } from "@/lib/config/config-service";

const diasGracia = await obtenerDiasGracia(); // 0
```

#### `obtenerHorariosPermitidosCobranza()`
Obtiene los horarios permitidos para cobranza.

```typescript
import { obtenerHorariosPermitidosCobranza } from "@/lib/config/config-service";

const horarios = await obtenerHorariosPermitidosCobranza();
// {
//   horaInicio: "08:00",
//   horaFin: "18:00",
//   diasPermitidos: [1, 2, 3, 4, 5]
// }
```

#### `esHorarioPermitidoCobranza(fechaHora?)`
Valida si la hora actual está dentro del horario permitido.

```typescript
import { esHorarioPermitidoCobranza } from "@/lib/config/config-service";

const permitido = await esHorarioPermitidoCobranza();
if (!permitido) {
  throw new Error("No se puede realizar cobranza fuera del horario permitido");
}
```

#### `obtenerMaximoReestructuraciones()`
Obtiene el máximo número de reestructuraciones.

```typescript
import { obtenerMaximoReestructuraciones } from "@/lib/config/config-service";

const maximo = await obtenerMaximoReestructuraciones(); // 2
```

#### `obtenerLimiteMontoPrestamo()`
Obtiene el límite máximo de monto para préstamos.

```typescript
import { obtenerLimiteMontoPrestamo } from "@/lib/config/config-service";

const limite = await obtenerLimiteMontoPrestamo(); // 1000000
```

#### `obtenerMetodosPagoHabilitados()`
Obtiene los métodos de pago habilitados.

```typescript
import { obtenerMetodosPagoHabilitados } from "@/lib/config/config-service";

const metodos = await obtenerMetodosPagoHabilitados();
// ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "CHEQUE"]
```

#### `esMetodoPagoHabilitado(metodoPago)`
Valida si un método de pago está habilitado.

```typescript
import { esMetodoPagoHabilitado } from "@/lib/config/config-service";

const habilitado = await esMetodoPagoHabilitado("EFECTIVO");
if (!habilitado) {
  throw new Error("Método de pago no habilitado");
}
```

### Gestión de Caché

El servicio utiliza caché en memoria con TTL de 5 minutos. Para limpiar el caché:

```typescript
import { limpiarCacheConfiguracion } from "@/lib/config/config-service";

// Limpiar una configuración específica
limpiarCacheConfiguracion("TASA_MORA");

// Limpiar todo el caché
limpiarCacheConfiguracion();
```

---

## GraphQL API

### Queries

#### `configuracionesSistema(categoria?)`
Obtiene todas las configuraciones del sistema, opcionalmente filtradas por categoría.

```graphql
query {
  configuracionesSistema(categoria: "mora") {
    idconfiguracion
    clave
    valor
    tipo
    descripcion
    categoria
  }
}
```

#### `configuracionSistema(clave)`
Obtiene una configuración específica por clave.

```graphql
query {
  configuracionSistema(clave: "TASA_MORA") {
    idconfiguracion
    clave
    valor
    tipo
    descripcion
    categoria
  }
}
```

### Mutations

#### `updateConfiguracionSistema(input)`
Actualiza una configuración (solo ADMIN).

```graphql
mutation {
  updateConfiguracionSistema(
    input: {
      clave: "TASA_MORA"
      valor: "0.40"
      idusuarioMod: 1
    }
  ) {
    idconfiguracion
    clave
    valor
  }
}
```

#### `bulkUpdateConfiguracionSistema(input)`
Actualiza múltiples configuraciones a la vez (solo ADMIN).

```graphql
mutation {
  bulkUpdateConfiguracionSistema(
    input: {
      idusuarioMod: 1
      configuraciones: [
        { clave: "TASA_MORA", valor: "0.40" }
        { clave: "DIAS_GRACIA", valor: "5" }
      ]
    }
  ) {
    idconfiguracion
    clave
    valor
  }
}
```

---

## Uso en Módulos

### Ejemplo: Validar Horario de Cobranza

```typescript
import { esHorarioPermitidoCobranza } from "@/lib/config/config-service";

export async function crearGestionCobro(data: any) {
  // Validar horario
  const permitido = await esHorarioPermitidoCobranza();
  if (!permitido) {
    throw new Error("No se puede realizar cobranza fuera del horario permitido");
  }

  // Continuar con la creación...
}
```

### Ejemplo: Validar Método de Pago

```typescript
import { esMetodoPagoHabilitado } from "@/lib/config/config-service";

export async function registrarPago(metodoPago: string) {
  // Validar método de pago
  const habilitado = await esMetodoPagoHabilitado(metodoPago);
  if (!habilitado) {
    throw new Error(`Método de pago ${metodoPago} no está habilitado`);
  }

  // Continuar con el registro...
}
```

### Ejemplo: Calcular Mora

```typescript
import { obtenerTasaMora, obtenerDiasGracia } from "@/lib/config/config-service";

export async function calcularMora(diasAtraso: number, monto: number) {
  const tasaMora = await obtenerTasaMora();
  const diasGracia = await obtenerDiasGracia();

  if (diasAtraso <= diasGracia) {
    return 0; // No hay mora dentro del período de gracia
  }

  const diasMora = diasAtraso - diasGracia;
  const moraDiaria = (monto * tasaMora) / 365;
  return moraDiaria * diasMora;
}
```

### Ejemplo: Validar Límite de Préstamo

```typescript
import { obtenerLimiteMontoPrestamo } from "@/lib/config/config-service";

export async function crearPrestamo(monto: number) {
  const limite = await obtenerLimiteMontoPrestamo();
  
  if (monto > limite) {
    throw new Error(`El monto excede el límite máximo de ${limite}`);
  }

  // Continuar con la creación...
}
```

---

## Seguridad y Permisos

### Acceso de Lectura

- **Global**: Cualquier módulo puede leer configuraciones usando el servicio
- **Sin autenticación requerida**: Las configuraciones son parámetros del sistema, no datos sensibles

### Acceso de Escritura

- **Solo ADMIN**: Solo usuarios con permiso `CONFIG_SYSTEM` pueden modificar configuraciones
- **Validación automática**: Las mutations validan el permiso antes de ejecutar
- **Auditoría**: Todas las modificaciones se registran en `tbl_auditoria`

### Validación de Permisos

Las mutations validan automáticamente el permiso:

```typescript
// En updateConfiguracionSistema
const esAdmin = await validarRolAdmin(ctx, input.idusuarioMod);
if (!esAdmin) {
  throw new Error("Solo usuarios con rol ADMINISTRADOR pueden modificar la configuración");
}
```

---

## Inicialización

### Script de Seed

Para inicializar las configuraciones por defecto:

```bash
npx tsx prisma/seed-configuracion.ts
```

Este script:
1. Crea todas las configuraciones base si no existen
2. Actualiza valores por defecto si han cambiado
3. Mantiene configuraciones personalizadas intactas

### Inicialización Programática

También se puede inicializar desde código:

```typescript
import { inicializarConfiguracionesPorDefecto } from "@/lib/graphql/resolvers/finanzas/configuracion";

await inicializarConfiguracionesPorDefecto(ctx);
```

---

## Mejores Prácticas

1. **Usar funciones helper específicas**
   - Preferir `obtenerTasaMora()` sobre `obtenerConfiguracion("TASA_MORA")`
   - Mejor tipado y valores por defecto seguros

2. **Validar antes de usar**
   - Siempre validar horarios, métodos de pago, etc. antes de ejecutar operaciones

3. **Limpiar caché después de actualizar**
   - Si se actualiza una configuración, limpiar el caché para reflejar cambios

4. **Usar valores por defecto seguros**
   - Las funciones helper incluyen valores por defecto razonables

5. **Documentar nuevas configuraciones**
   - Agregar descripción clara al crear nuevas configuraciones

---

## Resumen

El módulo de configuración del sistema proporciona:

✅ **Acceso global** desde cualquier módulo
✅ **Caché en memoria** para mejor rendimiento
✅ **Funciones helper tipadas** para cada parámetro
✅ **Validación automática** de permisos para escritura
✅ **Auditoría completa** de cambios
✅ **Fácil extensión** para nuevos parámetros

El sistema está listo para usar y puede extenderse fácilmente con nuevos parámetros según las necesidades del negocio.




