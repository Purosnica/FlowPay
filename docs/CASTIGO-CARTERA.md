# MÓDULO DE CASTIGO DE CARTERA

Este documento describe el módulo completo de castigo de cartera de FlowPay, que permite marcar préstamos como castigados, registrar motivos y restringir operaciones sobre estos préstamos.

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Modelo de Datos](#modelo-de-datos)
3. [Proceso de Castigo](#proceso-de-castigo)
4. [Restricciones de Pago](#restricciones-de-pago)
5. [Reportes y KPI](#reportes-y-kpi)
6. [API GraphQL](#api-graphql)
7. [Permisos](#permisos)
8. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Resumen Ejecutivo

El módulo de **Castigo de Cartera** permite:

- ✅ **Marcar préstamos como CASTIGADO** cuando son irrecuperables
- ✅ **Registrar motivo** del castigo
- ✅ **Cancelar cuotas pendientes** automáticamente
- ✅ **Evitar acciones de pago normales** (validación en mutations)
- ✅ **Permitir solo pagos judiciales** (embargos, órdenes judiciales)
- ✅ **Mostrar aparte en reportes** (filtrado específico)
- ✅ **Afectar KPI globales** (excluidos de cálculos normales)

**Requisitos:**
- Préstamo debe estar en estado `EN_CURSO` o `EN_MORA`
- Usuario debe tener permiso `CASTIGAR_CARTERA`
- Los préstamos castigados solo permiten pagos con métodos judiciales

---

## Modelo de Datos

### Tabla `tbl_castigo`

```prisma
model tbl_castigo {
  idcastigo      Int       @id @default(autoincrement())
  idprestamo     Int
  motivo         String    @db.Text
  observaciones  String?   @db.Text
  fechaCastigo   DateTime  @default(now())
  idusuario      Int?
  deletedAt      DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  prestamo tbl_prestamo @relation("prestamo_castigo", fields: [idprestamo], references: [idprestamo])
  usuario  tbl_usuario? @relation("usuario_castigo", fields: [idusuario], references: [idusuario])

  @@map("tbl_castigo")
  @@index([idprestamo, deletedAt])
  @@index([idusuario, deletedAt])
  @@index([fechaCastigo, deletedAt])
}
```

### Relaciones

- **`tbl_prestamo`**: Un préstamo puede tener múltiples registros de castigo (historial)
- **`tbl_usuario`**: Usuario que realizó el castigo

### Estado del Préstamo

Al castigar un préstamo, su estado cambia a `EstadoPrestamoEnum.CASTIGADO`.

---

## Proceso de Castigo

### Flujo Completo

```
1. VALIDACIÓN
   ├─ Verificar préstamo existe y no está eliminado
   ├─ Verificar estado (EN_CURSO o EN_MORA)
   ├─ Verificar permiso CASTIGAR_CARTERA
   └─ Validar que hay al menos un préstamo

2. PROCESO POR PRÉSTAMO
   ├─ Si ya está castigado → crear nuevo registro (recastigar)
   ├─ Si no está castigado:
   │   ├─ Cancelar cuotas pendientes (ANULADA)
   │   ├─ Registrar auditoría por cuotas canceladas
   │   └─ Actualizar estado a CASTIGADO
   ├─ Crear registro en tbl_castigo
   └─ Registrar auditoría completa

3. RESULTADO
   ├─ Número de préstamos castigados
   └─ Número de cuotas canceladas
```

### Cancelación de Cuotas

Al castigar un préstamo, todas las cuotas en estado:
- `PENDIENTE`
- `PARCIAL`
- `VENCIDA`

Se marcan como `ANULADA` con observaciones indicando el motivo del castigo.

### Auditoría

Se registran múltiples eventos en `tbl_auditoria`:

1. **Por cuotas canceladas:**
   ```typescript
   {
     entidad: "tbl_cuota",
     accion: "CANCELAR_CUOTAS_CASTIGO",
     detalle: "X cuotas canceladas por castigo del préstamo PRE-001. Motivo: ..."
   }
   ```

2. **Por préstamo:**
   ```typescript
   {
     entidad: "tbl_prestamo",
     entidadId: idprestamo,
     accion: "CASTIGAR_CARTERA",
     detalle: "Préstamo PRE-001 castigado. Motivo: ..."
   }
   ```

3. **Por castigo:**
   ```typescript
   {
     entidad: "tbl_castigo",
     entidadId: idcastigo,
     accion: "CREAR_CASTIGO",
     detalle: "Castigo creado para préstamo PRE-001. Motivo: ..."
   }
   ```

---

## Restricciones de Pago

### Validación en Mutations

Los préstamos castigados **solo permiten pagos con métodos judiciales**:

#### Métodos de Pago Judiciales

```typescript
const metodosJudiciales = [
  "JUDICIAL",
  "EMBARGOS",
  "ORDEN_JUDICIAL"
];
```

#### Validación en `createPago` y `registrarPagoConAplicacion`

```typescript
// Verificar si el préstamo está castigado
const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
  where: { idprestamo: input.idprestamo, deletedAt: null },
  select: { estado: true },
});

const estaCastigado = prestamo?.estado === EstadoPrestamoEnum.CASTIGADO;

// Validar que solo se permiten pagos judiciales para préstamos castigados
if (estaCastigado) {
  validarPagoPrestamoCastigado(input.metodoPago, true);
}
```

#### Error si se Intenta Pago Normal

Si se intenta registrar un pago normal en un préstamo castigado:

```
Error: Los préstamos castigados solo permiten pagos judiciales. 
Métodos permitidos: JUDICIAL, EMBARGOS, ORDEN_JUDICIAL. 
Método proporcionado: EFECTIVO. 
Para registrar pagos normales, el préstamo debe estar en estado activo.
```

---

## Reportes y KPI

### Exclusión de Castigados

Los préstamos castigados **se excluyen automáticamente** de los reportes normales:

#### 1. Query `cartera`

- Si `tipo === "castigada"`: Muestra solo castigados
- Si `tipo === "activa"` o `"mora"`: Solo muestra ese tipo
- Si no se especifica tipo: **Excluye castigados por defecto**

```typescript
if (filters.tipo === "castigada") {
  where.estado = EstadoPrestamoEnum.CASTIGADO;
} else {
  // Por defecto, excluir castigados
  where.estado = {
    not: EstadoPrestamoEnum.CASTIGADO,
  };
}
```

#### 2. Reportes de KPI

Todos los reportes **excluyen castigados** automáticamente:

- **Aging de Cartera**: Solo incluye `EN_CURSO` y `EN_MORA`
- **Recuperación Real vs Esperada**: Solo incluye `EN_CURSO`, `EN_MORA`, `PAGADO`
- **Ranking de Gestores**: Solo incluye `EN_CURSO`, `EN_MORA`, `PAGADO`
- **Mora Promedio**: Solo incluye `EN_CURSO` y `EN_MORA`

### Consulta de Castigados

Para consultar préstamos castigados:

```graphql
query {
  cartera(filters: { tipo: "castigada" }) {
    items {
      prestamo {
        codigo
        estado
        montoDesembolsado
      }
      saldoPendiente
    }
  }
}
```

---

## API GraphQL

### Mutation: `castigarCartera`

```graphql
mutation {
  castigarCartera(
    idprestamos: [1, 2, 3]
    motivo: "Cliente en quiebra, imposible recuperación"
    observaciones: "Castigo aprobado por gerencia"
    idusuario: 5
    fechaCastigo: "2024-01-20T00:00:00Z"
  ) {
    prestamosCastigados
    cuotasCanceladas
  }
}
```

**Argumentos:**
- `idprestamos` (requerido): Array de IDs de préstamos a castigar
- `motivo` (requerido): Motivo del castigo
- `observaciones` (opcional): Observaciones adicionales
- `idusuario` (requerido): ID del usuario que realiza el castigo
- `fechaCastigo` (opcional): Fecha del castigo (default: ahora)

**Respuesta:**
```typescript
{
  prestamosCastigados: number;  // Número de préstamos castigados
  cuotasCanceladas: number;     // Número de cuotas canceladas
}
```

---

## Permisos

### Permiso Requerido

**`CASTIGAR_CARTERA`**: Permite marcar préstamos como castigados

### Validación

```typescript
await requerirPermiso(args.idusuario, "CASTIGAR_CARTERA");
```

### Seed de Permisos

Asegúrate de que el permiso `CASTIGAR_CARTERA` esté creado y asignado a los roles apropiados (ej: ADMIN, GESTOR_COBRANZA).

---

## Ejemplos de Uso

### Ejemplo 1: Castigar un Préstamo

```graphql
mutation {
  castigarCartera(
    idprestamos: [10]
    motivo: "Cliente desaparecido, imposible localizar"
    observaciones: "Castigo autorizado después de 180 días en mora"
    idusuario: 2
  ) {
    prestamosCastigados
    cuotasCanceladas
  }
}
```

### Ejemplo 2: Castigar Múltiples Préstamos

```graphql
mutation {
  castigarCartera(
    idprestamos: [10, 11, 12, 13]
    motivo: "Corte masivo de cartera vencida más de 180 días"
    observaciones: "Corte trimestral de cartera vencida"
    idusuario: 1
  ) {
    prestamosCastigados
    cuotasCanceladas
  }
}
```

### Ejemplo 3: Intentar Pago Normal en Préstamo Castigado

```graphql
# ❌ ERROR: Este pago fallará
mutation {
  createPago(input: {
    idprestamo: 10  # Préstamo castigado
    metodoPago: EFECTIVO  # Método normal
    montoCapital: 1000
    idusuario: 5
  }) {
    idpago
  }
}

# ✅ CORRECTO: Usar método judicial
mutation {
  createPago(input: {
    idprestamo: 10  # Préstamo castigado
    metodoPago: JUDICIAL  # Método judicial permitido
    montoCapital: 1000
    idusuario: 5
  }) {
    idpago
  }
}
```

### Ejemplo 4: Consultar Cartera Castigada

```graphql
query {
  cartera(
    filters: {
      tipo: "castigada"
      page: 1
      pageSize: 20
    }
    idusuario: 1
  ) {
    items {
      prestamo {
        codigo
        estado
        montoDesembolsado
        observaciones
      }
      saldoPendiente
    }
    total
  }
}
```

### Ejemplo 5: Consultar Historial de Castigos

```graphql
query {
  prestamo(id: 10) {
    codigo
    estado
    castigos {
      idcastigo
      motivo
      observaciones
      fechaCastigo
      usuario {
        nombre
      }
    }
  }
}
```

---

## Características del Módulo

### ✅ Atomicidad

- Toda la operación se ejecuta en una **transacción única**
- Si falla cualquier paso, se revierte todo
- Garantiza consistencia de datos

### ✅ Historial Completo

- **Registro de castigo** en `tbl_castigo`
- **Auditoría detallada** de todos los eventos
- **Observaciones** en préstamos y cuotas con detalles
- **Permite recastigar** (múltiples registros de castigo)

### ✅ Restricciones Estrictas

- **Validación automática** en mutations de pago
- **Solo pagos judiciales** permitidos para castigados
- **Mensajes de error claros** cuando se viola la restricción

### ✅ Integración con Otros Módulos

- **Reportes**: Excluyen castigados automáticamente
- **KPI**: No afectan métricas normales
- **Cartera**: Mostrados aparte con filtro específico
- **Permisos**: Validación de `CASTIGAR_CARTERA`

---

## Resumen

El módulo de castigo de cartera proporciona:

✅ **Proceso completo** de castigo en una sola operación
✅ **Cancelación automática** de cuotas pendientes
✅ **Registro de motivo** y usuario
✅ **Restricciones de pago** (solo judiciales)
✅ **Exclusión de reportes** normales
✅ **Historial completo** mediante auditoría
✅ **Transacciones atómicas** para garantizar consistencia
✅ **Permisos** para control de acceso

El sistema está listo para usar y garantiza que los préstamos castigados sean manejados de forma separada y controlada, afectando mínimamente los KPI operativos normales.




