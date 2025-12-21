# CONTROL DE CONCURRENCIA - LOCKS LÓGICOS

Este documento describe el sistema de control de concurrencia implementado en FlowPay para prevenir operaciones simultáneas sobre los mismos recursos.

## 📋 Índice

1. [Problema Resuelto](#problema-resuelto)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Lógica de Bloqueo y Liberación](#lógica-de-bloqueo-y-liberación)
4. [Implementación](#implementación)
5. [Casos de Uso](#casos-de-uso)
6. [Mantenimiento](#mantenimiento)

---

## Problema Resuelto

El sistema de locks lógicos previene los siguientes problemas:

### 1. **Doble Registro de Pago Simultáneo**
**Problema:** Dos usuarios intentan registrar un pago para el mismo préstamo al mismo tiempo, causando:
- Duplicación de pagos
- Aplicación incorrecta de montos a cuotas
- Estados inconsistentes

**Solución:** Lock sobre el préstamo durante el registro de pago.

### 2. **Modificación Simultánea de Préstamo**
**Problema:** Dos gestores intentan modificar el mismo préstamo simultáneamente, causando:
- Pérdida de datos (última escritura gana)
- Estados inconsistentes
- Conflictos en asignación de gestores

**Solución:** Lock sobre el préstamo durante cualquier modificación.

### 3. **Reestructuración Simultánea**
**Problema:** Múltiples intentos de reestructurar el mismo préstamo, causando:
- Múltiples préstamos nuevos
- Cuotas canceladas incorrectamente
- Historial corrupto

**Solución:** Lock sobre el préstamo durante la reestructuración.

---

## Arquitectura del Sistema

### Modelo de Datos: `tbl_lock`

```prisma
model tbl_lock {
  idlock          Int      @id @default(autoincrement())
  tipoRecurso     String   // "PRESTAMO", "PAGO", "REESTRUCTURACION"
  idrecurso       Int      // ID del recurso bloqueado (ej: idprestamo)
  idusuario       Int?     // Usuario que adquirió el lock
  descripcion     String?  // Descripción de la operación
  activo          Boolean  @default(true)
  fechaCreacion    DateTime @default(now())
  fechaExpiracion DateTime // Fecha de expiración del lock
  fechaLiberacion DateTime? // Fecha en que se liberó el lock

  usuario tbl_usuario? @relation("usuario_lock", fields: [idusuario], references: [idusuario])

  @@index([tipoRecurso, idrecurso, activo])
  @@index([fechaExpiracion, activo])
}
```

### Componentes del Sistema

1. **Servicio de Locks** (`src/lib/locks/lock-service.ts`)
   - Funciones para adquirir, liberar y verificar locks
   - Wrappers para ejecutar operaciones con locks automáticos

2. **Integración en Mutations**
   - Mutations críticas envuelven operaciones con locks
   - Liberación automática en caso de error

3. **Limpieza Automática**
   - Locks expirados se limpian automáticamente
   - Función para limpiar locks expirados del sistema

---

## Lógica de Bloqueo y Liberación

### Flujo de Adquisición de Lock

```
1. Usuario intenta operación crítica (ej: registrar pago)
   ↓
2. Sistema verifica si existe lock activo para el recurso
   ↓
3a. Si NO existe lock activo:
    - Crea nuevo lock con fecha de expiración
    - Ejecuta la operación
    - Libera el lock al finalizar
   
3b. Si EXISTE lock activo:
    - Verifica si está expirado
    - Si NO está expirado: Rechaza la operación con mensaje
    - Si está expirado: Limpia el lock y crea uno nuevo
```

### Características del Lock

1. **Expiración Automática**
   - Cada lock tiene una fecha de expiración
   - Por defecto: 5 minutos (300 segundos)
   - Reestructuración: 10 minutos (600 segundos)
   - Configurable por operación

2. **Liberación Automática**
   - El lock se libera automáticamente al finalizar la operación
   - Se libera incluso si hay error (usando `finally`)
   - Previene deadlocks

3. **Limpieza de Locks Expirados**
   - Los locks expirados se marcan como inactivos automáticamente
   - Función `limpiarLocksExpirados()` para limpieza masiva
   - Recomendado ejecutar periódicamente (cron job)

### Ejemplo de Flujo Completo

```typescript
// 1. Usuario A intenta registrar pago para préstamo 123
adquirirLock("PRESTAMO", 123, { idusuario: 1, timeoutSegundos: 300 })
// ✅ Lock adquirido (idlock: 1)

// 2. Usuario B intenta registrar pago para préstamo 123 (mismo tiempo)
adquirirLock("PRESTAMO", 123, { idusuario: 2, timeoutSegundos: 300 })
// ❌ Lock rechazado: "El recurso está bloqueado por otra operación. Tiempo restante: 285 segundos. Usuario: 1"

// 3. Usuario A completa el pago
liberarLock(1, 1)
// ✅ Lock liberado

// 4. Usuario B intenta nuevamente
adquirirLock("PRESTAMO", 123, { idusuario: 2, timeoutSegundos: 300 })
// ✅ Lock adquirido (idlock: 2)
```

---

## Implementación

### Funciones Principales

#### 1. `adquirirLock()`
Intenta adquirir un lock sobre un recurso.

```typescript
const lockResult = await adquirirLock(
  "PRESTAMO",
  idprestamo,
  {
    idusuario: 1,
    descripcion: "Registro de pago",
    timeoutSegundos: 300,
  }
);

if (!lockResult.adquirido) {
  throw new Error(lockResult.mensaje);
}
```

#### 2. `liberarLock()`
Libera un lock específico.

```typescript
await liberarLock(idlock, idusuario);
```

#### 3. `conLock()`
Wrapper que adquiere y libera el lock automáticamente.

```typescript
const resultado = await conLock(
  "PRESTAMO",
  idprestamo,
  async () => {
    // Operación crítica aquí
    return await registrarPago(...);
  },
  {
    idusuario: 1,
    descripcion: "Registro de pago",
    timeoutSegundos: 300,
  }
);
```

#### 4. `verificarLock()`
Verifica si un recurso está bloqueado.

```typescript
const estado = await verificarLock("PRESTAMO", idprestamo);
if (estado?.bloqueado) {
  console.log(`Bloqueado por usuario ${estado.idusuario}`);
}
```

### Integración en Mutations

#### Ejemplo: Registrar Pago con Aplicación

```typescript
builder.mutationField("registrarPagoConAplicacion", (t) =>
  t.field({
    type: Pago,
    args: {
      input: t.arg({ type: CreatePagoInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      const input = CreatePagoInputSchema.parse(args.input);
      const prestamo = await ensurePrestamoActivo(ctx, input.idprestamo);

      // Ejecutar con lock sobre el préstamo
      const resultado = await conLock(
        "PRESTAMO",
        input.idprestamo,
        async () => {
          // Ejecutar en transacción
          return await ctx.prisma.$transaction(async (tx) => {
            const { pago } = await registrarPagoConAplicacion(tx, {
              idprestamo: input.idprestamo,
              // ... otros datos
            });
            return pago;
          });
        },
        {
          idusuario: input.idusuario || null,
          descripcion: `Registro de pago para préstamo ${prestamo.codigo}`,
          timeoutSegundos: 300,
        }
      );

      return resultado;
    },
  })
);
```

#### Ejemplo: Reestructuración con Lock Manual

```typescript
builder.mutationField("reestructurarPrestamo", (t) =>
  t.field({
    type: Reestructuracion,
    resolve: async (_parent, args, ctx) => {
      const input = CreateReestructuracionInputSchema.parse(args.input);
      const prestamoOriginal = await ensurePrestamoActivo(ctx, input.idprestamoOriginal);

      // Adquirir lock manualmente
      const lockResult = await adquirirLock("PRESTAMO", input.idprestamoOriginal, {
        idusuario: input.idusuarioSolicitante,
        descripcion: `Reestructuración de préstamo ${prestamoOriginal.codigo}`,
        timeoutSegundos: 600,
      });

      if (!lockResult.adquirido) {
        throw new Error(lockResult.mensaje);
      }

      const idlock = lockResult.idlock!;

      try {
        // Ejecutar reestructuración en transacción
        const resultado = await ctx.prisma.$transaction(async (tx) => {
          // ... operaciones de reestructuración
          return reestructuracion;
        });

        return resultado;
      } finally {
        // Siempre liberar el lock
        await liberarLock(idlock, input.idusuarioSolicitante).catch(console.error);
      }
    },
  })
);
```

---

## Casos de Uso

### 1. Registro de Pago

**Operación:** `registrarPagoConAplicacion`

**Lock:** `PRESTAMO` sobre `idprestamo`

**Timeout:** 5 minutos

**Protección:**
- Evita doble registro de pago simultáneo
- Previene aplicación incorrecta de montos
- Garantiza estados consistentes de cuotas

### 2. Actualización de Préstamo

**Operación:** `updatePrestamo`

**Lock:** `PRESTAMO` sobre `idprestamo`

**Timeout:** 5 minutos

**Protección:**
- Evita que dos gestores modifiquen el préstamo simultáneamente
- Previene pérdida de datos
- Garantiza consistencia en asignación de gestores

### 3. Asignación de Gestor

**Operación:** `asignarGestor`

**Lock:** `PRESTAMO` sobre `idprestamo`

**Timeout:** 5 minutos

**Protección:**
- Evita conflictos al asignar gestores
- Previene asignaciones simultáneas

### 4. Reestructuración

**Operación:** `reestructurarPrestamo`

**Lock:** `PRESTAMO` sobre `idprestamoOriginal`

**Timeout:** 10 minutos

**Protección:**
- Evita múltiples reestructuraciones simultáneas
- Previene creación de múltiples préstamos nuevos
- Garantiza historial correcto

---

## Mantenimiento

### Limpieza de Locks Expirados

Ejecutar periódicamente (recomendado: cada hora):

```typescript
import { limpiarLocksExpirados } from "@/lib/locks/lock-service";

// En un cron job o tarea programada
const locksLimpiados = await limpiarLocksExpirados();
console.log(`Locks limpiados: ${locksLimpiados}`);
```

### Monitoreo

Verificar locks activos:

```typescript
import { verificarLock } from "@/lib/locks/lock-service";

const estado = await verificarLock("PRESTAMO", idprestamo);
if (estado?.bloqueado) {
  console.log(`Préstamo bloqueado por usuario ${estado.idusuario}`);
  console.log(`Expira en: ${estado.fechaExpiracion}`);
}
```

### Configuración de Timeouts

Ajustar timeouts según el tipo de operación:

- **Operaciones rápidas** (pagos simples): 300 segundos (5 minutos)
- **Operaciones complejas** (reestructuración): 600 segundos (10 minutos)
- **Operaciones muy complejas**: 900 segundos (15 minutos)

---

## Mejores Prácticas

1. **Siempre usar `conLock()` cuando sea posible**
   - Liberación automática del lock
   - Manejo de errores simplificado

2. **Usar lock manual solo cuando sea necesario**
   - Para operaciones muy complejas
   - Cuando necesites control fino del lock

3. **Configurar timeouts apropiados**
   - No muy cortos (causan errores innecesarios)
   - No muy largos (causan bloqueos prolongados)

4. **Limpiar locks expirados periódicamente**
   - Ejecutar `limpiarLocksExpirados()` en cron job
   - Mantener la tabla `tbl_lock` limpia

5. **Monitorear locks activos**
   - Verificar locks que no se liberaron correctamente
   - Investigar locks con tiempos de expiración muy largos

---

## Resumen

El sistema de locks lógicos garantiza:

✅ **Prevención de doble registro de pagos simultáneos**
✅ **Prevención de modificaciones simultáneas de préstamos**
✅ **Prevención de reestructuraciones simultáneas**
✅ **Expiración automática de locks para evitar deadlocks**
✅ **Liberación automática incluso en caso de error**
✅ **Trazabilidad completa (usuario, descripción, fechas)**

El sistema es robusto, automático y no requiere intervención manual en la mayoría de los casos.




