# MÓDULO DE REESTRUCTURACIÓN DE PRÉSTAMOS

Este documento describe el módulo completo de reestructuración de préstamos de FlowPay, que permite crear un nuevo préstamo basado en uno vencido, cancelar cuotas pendientes, trasladar saldo y mantener trazabilidad completa.

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Proceso de Reestructuración](#proceso-de-reestructuración)
3. [Cálculo de Saldo Pendiente](#cálculo-de-saldo-pendiente)
4. [Traslado de Saldo](#traslado-de-saldo)
5. [Generación de Cuadro de Amortización](#generación-de-cuadro-de-amortización)
6. [Trazabilidad y Auditoría](#trazabilidad-y-auditoría)
7. [API GraphQL](#api-graphql)
8. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Resumen Ejecutivo

El módulo de **Reestructuración** permite:

- ✅ **Crear préstamo nuevo** basado en uno vencido
- ✅ **Cancelar cuotas pendientes** del préstamo original
- ✅ **Trasladar saldo pendiente** (capital, interés, mora)
- ✅ **Generar nuevo cuadro de amortización** automáticamente
- ✅ **Registrar motivo, usuario y evidencia**
- ✅ **Mantener histórico 100% trazable**

**Requisitos:**
- Préstamo original debe estar en estado `EN_CURSO` o `EN_MORA`
- Usuario debe tener permiso `RESTRUCTURE_LOAN`
- El monto del nuevo préstamo debe cubrir el saldo pendiente

---

## Proceso de Reestructuración

### Flujo Completo

```
1. VALIDACIÓN
   ├─ Verificar préstamo original existe y no está eliminado
   ├─ Verificar estado (EN_CURSO o EN_MORA)
   ├─ Verificar permiso del usuario
   └─ Adquirir lock sobre el préstamo

2. CÁLCULO DE SALDO
   ├─ Obtener cuotas pendientes/parciales/vencidas
   ├─ Calcular capital pendiente
   ├─ Calcular interés pendiente
   └─ Calcular mora pendiente

3. CREACIÓN DE NUEVO PRÉSTAMO
   ├─ Crear préstamo nuevo con datos proporcionados
   ├─ Trasladar saldo pendiente al nuevo préstamo
   └─ Generar cuadro de amortización completo

4. CANCELACIÓN DE CUOTAS
   ├─ Marcar cuotas pendientes como ANULADA
   ├─ Registrar motivo en observaciones
   └─ Registrar auditoría por cada cuota

5. ACTUALIZACIÓN DE ESTADOS
   ├─ Cambiar préstamo original a REFINANCIADO
   └─ Actualizar observaciones con detalles

6. REGISTRO DE REESTRUCTURACIÓN
   ├─ Crear registro en tbl_reestructuracion
   ├─ Registrar motivo, usuario solicitante y autorizador
   └─ Registrar evidencia (ruta a documento)

7. AUDITORÍA COMPLETA
   ├─ Auditoría de reestructuración
   ├─ Auditoría del préstamo original
   ├─ Auditoría del nuevo préstamo
   └─ Auditoría por cada cuota cancelada
```

---

## Cálculo de Saldo Pendiente

### Fórmula

```typescript
Saldo Pendiente = Capital Pendiente + Interés Pendiente + Mora Pendiente

Donde:
- Capital Pendiente = Σ(Capital Programado - Capital Pagado) de cuotas pendientes
- Interés Pendiente = Σ(Interés Programado - Interés Pagado) de cuotas pendientes
- Mora Pendiente = Σ(Mora Programada - Mora Pagada) de cuotas pendientes
```

### Cuotas Consideradas

Se incluyen cuotas en estado:
- `PENDIENTE`: Cuotas no vencidas o no pagadas
- `PARCIAL`: Cuotas con pago parcial
- `VENCIDA`: Cuotas vencidas con saldo pendiente

### Ejemplo

**Préstamo con 3 cuotas pendientes:**

| Cuota | Capital Prog | Capital Pag | Interés Prog | Interés Pag | Mora Prog | Mora Pag |
|-------|--------------|-------------|--------------|-------------|-----------|----------|
| 1     | $1,000       | $0          | $50          | $0          | $20       | $0       |
| 2     | $1,000       | $500        | $50          | $25         | $0        | $0       |
| 3     | $1,000       | $0          | $50          | $0          | $0        | $0       |

**Cálculo:**
- Capital Pendiente: $1,000 + $500 + $1,000 = $2,500
- Interés Pendiente: $50 + $25 + $50 = $125
- Mora Pendiente: $20 + $0 + $0 = $20
- **Total Pendiente: $2,645**

---

## Traslado de Saldo

### Validación

El monto del nuevo préstamo debe ser **al menos igual** al saldo pendiente:

```typescript
if (montoNuevoPrestamo < saldoPendiente.totalPendiente) {
  throw new Error("El monto del nuevo préstamo debe cubrir el saldo pendiente");
}
```

### Asignación de Monto

Si no se especifica `montoDesembolsado` en el nuevo préstamo, se usa el saldo pendiente:

```typescript
const montoNuevoPrestamo =
  datos.nuevoPrestamo.montoDesembolsado ||
  datos.nuevoPrestamo.montoAprobado ||
  datos.nuevoPrestamo.montoSolicitado ||
  saldoPendiente.totalPendiente;
```

### Observaciones

El saldo trasladado se registra en las observaciones del nuevo préstamo:

```
Reestructuración de préstamo PRE-001. 
Saldo trasladado: $2,645.00. 
Desglose: Capital: $2,500.00, Interés: $125.00, Mora: $20.00. 
Motivo: Cliente con dificultades temporales de pago.
```

---

## Generación de Cuadro de Amortización

### Proceso Automático

El nuevo préstamo genera automáticamente su cuadro de amortización usando:

- **Monto:** Saldo trasladado (o monto especificado)
- **Tasa de Interés:** Tasa especificada o tasa del préstamo original
- **Plazo:** Plazo especificado o plazo del préstamo original
- **Día de Pago:** Día especificado (default: día 1 del mes)
- **Método:** Amortización francesa

### Ejemplo de Generación

**Datos:**
- Saldo trasladado: $2,645.00
- Tasa anual: 24% (0.24)
- Plazo: 6 meses
- Día de pago: 5

**Resultado:**
- Se generan 6 cuotas
- Cada cuota incluye capital e interés calculados
- Fechas de vencimiento según día de pago especificado

---

## Trazabilidad y Auditoría

### Registros de Auditoría

El sistema registra **múltiples eventos** en `tbl_auditoria`:

#### 1. Reestructuración Principal

```typescript
{
  entidad: "tbl_reestructuracion",
  accion: "CREAR_REESTRUCTURACION",
  detalle: "Reestructuración de préstamo PRE-001 a PRE-002. 
           Motivo: Cliente con dificultades temporales. 
           Saldo trasladado: Capital: $2,500.00, Interés: $125.00, Mora: $20.00, Total: $2,645.00. 
           Cuotas canceladas: 3. Cuotas generadas: 6. 
           Evidencia: /documentos/reestructuracion-001.pdf"
}
```

#### 2. Préstamo Original

```typescript
{
  entidad: "tbl_prestamo",
  entidadId: idprestamoOriginal,
  accion: "REESTRUCTURAR_PRESTAMO",
  detalle: "Préstamo reestructurado. Nuevo préstamo: PRE-002. 
           Estado cambiado a REFINANCIADO. 
           Saldo pendiente trasladado: $2,645.00. 
           Motivo: Cliente con dificultades temporales. 
           Usuario solicitante: 1. Usuario autorizador: 2"
}
```

#### 3. Nuevo Préstamo

```typescript
{
  entidad: "tbl_prestamo",
  entidadId: idprestamoNuevo,
  accion: "CREAR_PRESTAMO_REESTRUCTURACION",
  detalle: "Nuevo préstamo creado por reestructuración de PRE-001. 
           Saldo trasladado: $2,645.00. 
           Desglose: Capital: $2,500.00, Interés: $125.00, Mora: $20.00. 
           Cuotas generadas: 6. Motivo: Cliente con dificultades temporales"
}
```

#### 4. Por Cada Cuota Cancelada

```typescript
{
  entidad: "tbl_cuota",
  entidadId: idcuota,
  accion: "CANCELAR_CUOTA_REESTRUCTURACION",
  detalle: "Cuota 1 cancelada por reestructuración. Nuevo préstamo: PRE-002"
}
```

### Consulta de Historial

Para consultar el historial completo de una reestructuración:

```graphql
query {
  reestructuracion(id: 1) {
    idreestructuracion
    prestamoOriginal {
      codigo
      estado
    }
    prestamoNuevo {
      codigo
      estado
    }
    motivo
    observaciones
    fechaReestructuracion
    usuarioSolicitante {
      nombre
    }
    usuarioAutorizador {
      nombre
    }
  }
}
```

---

## API GraphQL

### Mutation: `reestructurarPrestamo`

```graphql
mutation {
  reestructurarPrestamo(
    input: {
      idprestamoOriginal: 1
      idusuarioSolicitante: 5
      idusuarioAutorizador: 2
      motivo: "Cliente con dificultades temporales de pago"
      observaciones: "Reestructuración aprobada por gerencia"
      evidencia: "/documentos/reestructuracion-001.pdf"
      diaPago: 5
      nuevoPrestamo: {
        codigo: "PRE-002"
        referencia: "REF-002"
        tipoprestamo: PROPIO
        montoSolicitado: 3000
        montoAprobado: 3000
        montoDesembolsado: 2645
        tasaInteresAnual: 0.24
        plazoMeses: 6
        fechaSolicitud: "2024-01-20T00:00:00Z"
        fechaAprobacion: "2024-01-20T00:00:00Z"
        fechaDesembolso: "2024-01-20T00:00:00Z"
        observaciones: "Nuevo préstamo con mejores condiciones"
      }
    }
  ) {
    idreestructuracion
    prestamoOriginal {
      idprestamo
      codigo
      estado
    }
    prestamoNuevo {
      idprestamo
      codigo
      estado
    }
    motivo
    fechaReestructuracion
  }
}
```

### Query: `reestructuracion`

```graphql
query {
  reestructuracion(id: 1) {
    idreestructuracion
    prestamoOriginal {
      codigo
      estado
    }
    prestamoNuevo {
      codigo
      estado
      cuotas {
        numero
        estado
        capitalProgramado
        interesProgramado
      }
    }
    motivo
    observaciones
    fechaReestructuracion
  }
}
```

### Query: `reestructuracionesPorPrestamo`

```graphql
query {
  reestructuracionesPorPrestamo(idprestamo: 1) {
    idreestructuracion
    prestamoNuevo {
      codigo
      estado
    }
    motivo
    fechaReestructuracion
  }
}
```

---

## Ejemplos de Uso

### Ejemplo 1: Reestructuración Básica

```typescript
import { reestructurarPrestamo } from "@/lib/services/reestructuracion-service";

const resultado = await prisma.$transaction(async (tx) => {
  return await reestructurarPrestamo(tx, {
    idprestamoOriginal: 1,
    idusuarioSolicitante: 5,
    idusuarioAutorizador: 2,
    motivo: "Cliente con dificultades temporales",
    nuevoPrestamo: {
      codigo: "PRE-002",
      tipoprestamo: TipoPrestamoEnum.PROPIO,
      montoSolicitado: 3000,
      tasaInteresAnual: 0.24,
      plazoMeses: 6,
      diaPago: 5,
    },
  });
});

console.log(`Saldo trasladado: $${resultado.saldoTrasladado.totalPendiente}`);
console.log(`Cuotas canceladas: ${resultado.cuotasCanceladas}`);
console.log(`Cuotas generadas: ${resultado.cuotasGeneradas}`);
```

### Ejemplo 2: Con Evidencia

```typescript
const resultado = await reestructurarPrestamo(tx, {
  idprestamoOriginal: 1,
  motivo: "Reestructuración por acuerdo de pago",
  evidencia: "/documentos/acuerdo-pago-001.pdf",
  nuevoPrestamo: {
    // ... datos del préstamo
  },
});
```

### Ejemplo 3: Consultar Historial

```graphql
query {
  reestructuracionesPorPrestamo(idprestamo: 1) {
    idreestructuracion
    prestamoNuevo {
      codigo
      estado
      montoDesembolsado
    }
    motivo
    fechaReestructuracion
  }
}
```

---

## Validaciones y Restricciones

### Validaciones de Entrada

1. **Préstamo Original:**
   - Debe existir y no estar eliminado
   - Debe estar en estado `EN_CURSO` o `EN_MORA`
   - No debe tener una reestructuración previa como nuevo préstamo

2. **Nuevo Préstamo:**
   - El monto debe cubrir el saldo pendiente
   - Debe tener código único
   - Debe tener plazo y tasa válidos

3. **Permisos:**
   - Usuario debe tener permiso `RESTRUCTURE_LOAN`

4. **Concurrencia:**
   - Se adquiere lock sobre el préstamo original
   - Timeout de 10 minutos para la operación

### Restricciones de Negocio

1. **Límite de Reestructuraciones:**
   - Configurable desde `MAXIMO_REESTRUCTURACIONES`
   - Default: 2 reestructuraciones por préstamo

2. **Días de Mora:**
   - Configurable desde `LIMITE_REESTRUCTURACION_DIAS_MORA`
   - Default: 90 días máximo

3. **Monto:**
   - Configurable desde `LIMITE_REESTRUCTURACION_MONTO`
   - Default: $100,000 máximo

---

## Características del Módulo

### ✅ Atomicidad

- Toda la operación se ejecuta en una **transacción única**
- Si falla cualquier paso, se revierte todo
- Garantiza consistencia de datos

### ✅ Trazabilidad Completa

- **Registro de reestructuración** en `tbl_reestructuracion`
- **Auditoría detallada** de todos los eventos
- **Observaciones** en préstamos y cuotas con detalles
- **Historial consultable** mediante queries GraphQL

### ✅ Integración con Otros Módulos

- **Control de Concurrencia:** Usa locks para evitar conflictos
- **Permisos:** Valida permiso `RESTRUCTURE_LOAN`
- **Documentos:** Soporte para evidencia (ruta a documento)
- **Configuración:** Respeta límites configurados

---

## Resumen

El módulo de reestructuración proporciona:

✅ **Proceso completo** de reestructuración en una sola operación
✅ **Cálculo automático** de saldo pendiente
✅ **Traslado de saldo** al nuevo préstamo
✅ **Generación automática** de cuadro de amortización
✅ **Cancelación de cuotas** con auditoría
✅ **Registro de motivo, usuario y evidencia**
✅ **Trazabilidad 100%** mediante auditoría completa
✅ **Transacciones atómicas** para garantizar consistencia
✅ **Control de concurrencia** mediante locks

El sistema está listo para usar y garantiza que todas las reestructuraciones sean completamente trazables y auditables.




