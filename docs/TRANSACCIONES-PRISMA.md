# TRANSACCIONES PRISMA - OPERACIONES CRÍTICAS

Este documento describe las transacciones Prisma implementadas para garantizar atomicidad en operaciones críticas de FlowPay.

## 📋 Índice

1. [Crear Préstamo + Generar Cuotas](#1-crear-préstamo--generar-cuotas)
2. [Registrar Pago + Aplicar a Cuotas](#2-registrar-pago--aplicar-a-cuotas)
3. [Reestructuración de Préstamo](#3-reestructuración-de-préstamo)
4. [Castigo de Cartera](#4-castigo-de-cartera)
5. [Liquidación de Terceros](#5-liquidación-de-terceros)

---

## 1. Crear Préstamo + Generar Cuotas

### Función: `crearPrestamoConCuotas`

**Garantías:**
- Si falla la creación del préstamo, no se crean cuotas
- Si falla la creación de alguna cuota, se revierte todo (incluyendo el préstamo)
- La auditoría se registra solo si todo es exitoso

### Ejemplo de Uso en GraphQL:

```graphql
mutation CreatePrestamoConCuotas {
  createPrestamoConCuotas(
    input: {
      idcliente: 1
      idusuarioCreador: 1
      tipoprestamo: PROPIO
      codigo: "PREST-2024-001"
      montoSolicitado: 100000
      montoAprobado: 100000
      montoDesembolsado: 100000
      tasaInteresAnual: 24.0
      plazoMeses: 12
      fechaSolicitud: "2024-01-01T00:00:00Z"
      fechaAprobacion: "2024-01-02T00:00:00Z"
      fechaDesembolso: "2024-01-03T00:00:00Z"
    }
    generarCuotas: true
    diaPago: 5
  ) {
    idprestamo
    codigo
    estado
    plazoMeses
  }
}
```

### Ejemplo de Uso Directo (TypeScript):

```typescript
import { prisma } from "@/lib/prisma";
import { crearPrestamoConCuotas } from "@/lib/graphql/resolvers/finanzas/transactions";

// Ejecutar en transacción
const resultado = await prisma.$transaction(async (tx) => {
  const { prestamo, cuotas } = await crearPrestamoConCuotas(
    tx,
    {
      idcliente: 1,
      idusuarioCreador: 1,
      tipoprestamo: TipoPrestamoEnum.PROPIO,
      codigo: "PREST-2024-001",
      montoSolicitado: 100000,
      montoAprobado: 100000,
      montoDesembolsado: 100000,
      tasaInteresAnual: 24.0,
      plazoMeses: 12,
      fechaSolicitud: new Date("2024-01-01"),
      fechaAprobacion: new Date("2024-01-02"),
      fechaDesembolso: new Date("2024-01-03"),
    },
    {
      generarCuotas: true,
      diaPago: 5, // Día 5 de cada mes
    }
  );

  console.log(`Préstamo ${prestamo.codigo} creado con ${cuotas.length} cuotas`);
  return { prestamo, cuotas };
});
```

### Cálculo de Cuotas:

- **Amortización Francesa**: Se calcula el monto de cada cuota usando la fórmula de amortización francesa
- **Distribución**: Cada cuota incluye capital e interés proporcional
- **Fechas**: Se calculan automáticamente según el día de pago especificado

---

## 2. Registrar Pago + Aplicar a Cuotas

### Función: `registrarPagoConAplicacion`

**Garantías:**
- El pago se registra correctamente
- Los montos se aplican a las cuotas en orden (mora → interés → capital)
- Los estados de cuotas se actualizan automáticamente
- El estado del préstamo se actualiza si todas las cuotas están pagadas
- Todo se revierte si algo falla

### Ejemplo de Uso en GraphQL:

```graphql
mutation RegistrarPagoConAplicacion {
  registrarPagoConAplicacion(
    input: {
      idprestamo: 1
      montoCapital: 5000
      montoInteres: 2000
      montoMora: 500
      metodoPago: EFECTIVO
      fechaPago: "2024-02-05T00:00:00Z"
      referencia: "REF-001"
    }
  ) {
    idpago
    montoTotal
    fechaPago
  }
}
```

### Ejemplo de Uso Directo (TypeScript):

```typescript
import { prisma } from "@/lib/prisma";
import { registrarPagoConAplicacion } from "@/lib/graphql/resolvers/finanzas/transactions";
import { MetodoPagoEnum } from "@prisma/client";

// Ejecutar en transacción
const resultado = await prisma.$transaction(async (tx) => {
  const { pago, cuotasActualizadas, prestamoActualizado } = await registrarPagoConAplicacion(
    tx,
    {
      idprestamo: 1,
      idcuota: null, // null = aplicar a cuotas en orden
      montoCapital: 5000,
      montoInteres: 2000,
      montoMora: 500,
      metodoPago: MetodoPagoEnum.EFECTIVO,
      fechaPago: new Date("2024-02-05"),
      referencia: "REF-001",
      observaciones: "Pago parcial",
      idusuario: 1,
    }
  );

  console.log(`Pago ${pago.idpago} registrado y aplicado a ${cuotasActualizadas.length} cuotas`);
  return { pago, cuotasActualizadas, prestamoActualizado };
});
```

### Orden de Aplicación:

1. **Mora**: Se aplica primero a las cuotas vencidas
2. **Interés**: Se aplica después del pago de mora
3. **Capital**: Se aplica al final

### Actualización de Estados:

- **Cuota PAGADA**: Cuando capital + interés + mora están completamente pagados
- **Cuota PARCIAL**: Cuando hay algún pago pero no está completo
- **Préstamo PAGADO**: Cuando todas las cuotas están pagadas

---

## 3. Reestructuración de Préstamo

### Mutation: `reestructurarPrestamo`

**Ya implementada con transacción** en `mutations.ts` (línea 417+)

**Garantías:**
- Se crea el nuevo préstamo
- Se cancelan las cuotas pendientes del préstamo original
- Se actualiza el estado del préstamo original a REFINANCIADO
- Se crea el registro de reestructuración
- Todo se revierte si algo falla

### Ejemplo de Uso en GraphQL:

```graphql
mutation ReestructurarPrestamo {
  reestructurarPrestamo(
    input: {
      idprestamoOriginal: 1
      idusuarioSolicitante: 1
      idusuarioAutorizador: 2
      motivo: "Cliente solicita reestructuración por dificultades económicas"
      nuevoPrestamo: {
        codigo: "PREST-2024-002"
        tipoprestamo: PROPIO
        montoSolicitado: 120000
        montoAprobado: 120000
        montoDesembolsado: 120000
        tasaInteresAnual: 20.0
        plazoMeses: 18
        fechaSolicitud: "2024-02-01T00:00:00Z"
      }
    }
  ) {
    idreestructuracion
    prestamoOriginal {
      codigo
      estado
    }
    prestamoNuevo {
      codigo
      estado
    }
  }
}
```

---

## 4. Castigo de Cartera

### Función: `castigarCartera`

**Garantías:**
- Se marcan los préstamos como CASTIGADO
- Se cancelan todas las cuotas pendientes
- Se registra auditoría por cada préstamo
- Todo se revierte si falla el castigo de algún préstamo

### Ejemplo de Uso en GraphQL:

```graphql
mutation CastigarCartera {
  castigarCartera(
    idprestamos: [1, 2, 3]
    fechaCastigo: "2024-02-01T00:00:00Z"
    motivo: "Préstamos en mora por más de 90 días"
    observaciones: "Castigo aprobado por comité de crédito"
    idusuario: 1
  ) {
    prestamosCastigados
    cuotasCanceladas
  }
}
```

### Ejemplo de Uso Directo (TypeScript):

```typescript
import { prisma } from "@/lib/prisma";
import { castigarCartera } from "@/lib/graphql/resolvers/finanzas/transactions";

// Ejecutar en transacción
const resultado = await prisma.$transaction(async (tx) => {
  const { prestamosCastigados, cuotasCanceladas } = await castigarCartera(tx, {
    idprestamos: [1, 2, 3],
    fechaCastigo: new Date("2024-02-01"),
    motivo: "Préstamos en mora por más de 90 días",
    observaciones: "Castigo aprobado por comité de crédito",
    idusuario: 1,
  });

  console.log(`${prestamosCastigados.length} préstamos castigados, ${cuotasCanceladas} cuotas canceladas`);
  return { prestamosCastigados, cuotasCanceladas };
});
```

---

## 5. Liquidación de Terceros

### Mutation: `createLiquidacionTercero`

**Ya implementada con transacción** en `liquidacion.ts` (línea 126+)

**Garantías:**
- Se crea la liquidación
- Se marcan las comisiones como liquidadas
- Se asocian las comisiones a la liquidación
- Se registra auditoría
- Todo se revierte si algo falla

### Ejemplo de Uso en GraphQL:

```graphql
mutation CreateLiquidacionTercero {
  createLiquidacionTercero(
    input: {
      idempresa: 1
      codigo: "LIQ-2024-01"
      periodoDesde: "2024-01-01T00:00:00Z"
      periodoHasta: "2024-01-31T23:59:59Z"
      idusuarioCreador: 1
      observaciones: "Liquidación mensual enero 2024"
    }
  ) {
    idliquidacion
    codigo
    montoTotalComisiones
    numeroComisiones
    estado
  }
}
```

---

## 🔒 Garantías de Atomicidad

Todas las transacciones implementadas garantizan:

1. **ACID Compliance**: 
   - **Atomicity**: Todo o nada
   - **Consistency**: Los datos siempre están en un estado válido
   - **Isolation**: Las transacciones no interfieren entre sí
   - **Durability**: Los cambios se persisten permanentemente

2. **Rollback Automático**: Si cualquier operación falla dentro de la transacción, todas las operaciones se revierten automáticamente.

3. **Validaciones**: Todas las validaciones se realizan antes de iniciar la transacción para evitar rollbacks innecesarios.

4. **Auditoría**: Los registros de auditoría se crean dentro de la transacción, garantizando que se registren solo si la operación es exitosa.

---

## 📝 Notas Importantes

1. **Uso de `tx` (Transaction Client)**: Dentro de las funciones de transacción, siempre usar `tx` en lugar de `ctx.prisma` para garantizar que todas las operaciones estén en la misma transacción.

2. **Errores**: Cualquier error lanzado dentro de la transacción causará un rollback automático.

3. **Timeout**: Las transacciones tienen un timeout por defecto. Para transacciones muy largas, considerar dividirlas en múltiples transacciones más pequeñas.

4. **Locking**: Prisma maneja automáticamente el locking de filas durante las transacciones para evitar condiciones de carrera.

---

## 🚀 Mejores Prácticas

1. **Validar antes de transaccionar**: Realizar todas las validaciones posibles antes de iniciar la transacción.

2. **Mantener transacciones cortas**: Evitar operaciones costosas dentro de transacciones.

3. **Manejar errores específicos**: Capturar y manejar errores específicos para proporcionar mensajes claros al usuario.

4. **Logging**: Registrar información relevante antes y después de las transacciones para debugging.

5. **Testing**: Probar escenarios de fallo para asegurar que los rollbacks funcionan correctamente.




