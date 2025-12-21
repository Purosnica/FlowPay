# Servicios Seguros de Préstamos y Cobranza

Este directorio contiene servicios robustos y transaccionales para operaciones críticas del sistema de préstamos y cobranza.

## Características de Seguridad

Todos los servicios implementan:

✅ **Transacciones Atómicas** - Rollback completo en caso de error  
✅ **Control de Concurrencia** - Locks lógicos para prevenir operaciones simultáneas  
✅ **Optimistic Locking** - Validación de `updatedAt` para detectar cambios concurrentes  
✅ **Validaciones Backend** - Todas las reglas de negocio validadas en el servidor  
✅ **Manejo de Errores** - Errores tipados y mensajes claros  
✅ **Auditoría Completa** - Registro de quién, qué, cuándo y desde dónde  

## Servicios Disponibles

### 1. `pago-service.ts` - Registro de Pagos

```typescript
import { registrarPago } from "@/lib/services/pago-service";

const resultado = await registrarPago({
  idprestamo: 123,
  idcuota: 5, // Opcional
  idacuerdo: 10, // Opcional
  idusuario: 1,
  montoCapital: 1000,
  montoInteres: 200,
  montoMora: 50,
  metodoPago: "EFECTIVO",
  tipoCobro: "PARCIAL",
  fechaPago: new Date(),
  referencia: "REF-001",
  observacion: "Pago parcial",
  updatedAtPrestamo: prestamo.updatedAt, // Para optimistic locking
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

// El resultado incluye:
// - pago: Registro del pago creado
// - cuotasActualizadas: Cuotas afectadas
// - prestamoActualizado: Préstamo con saldos actualizados
// - saldoAnterior: Saldos antes del pago
// - saldoNuevo: Saldos después del pago
```

**Validaciones:**
- ✅ Préstamo existe y no ha cambiado (optimistic locking)
- ✅ Acuerdo está activo (si se especifica)
- ✅ Cobrador tiene asignado el préstamo
- ✅ Montos no exceden saldo pendiente
- ✅ Permisos del usuario

### 2. `cuota-service.ts` - Generación de Cuotas

```typescript
import { generarCuotas } from "@/lib/services/cuota-service";

const resultado = await generarCuotas({
  idprestamo: 123,
  idusuario: 1,
  diaPago: 1, // Opcional, default: 1
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

// El resultado incluye:
// - cuotasCreadas: Cuotas generadas
// - cuotasExistentes: Cuotas que ya existían
// - totalCuotas: Total de cuotas del préstamo
```

**Validaciones:**
- ✅ Préstamo tiene plazo y tasa válidos
- ✅ No genera cuotas duplicadas
- ✅ Solo genera cuotas faltantes si ya existen algunas

### 3. `mora-service.ts` - Aplicación de Mora

```typescript
import { aplicarMora } from "@/lib/services/mora-service";

const resultado = await aplicarMora({
  idprestamo: 123,
  configuracion: {
    tasaMoraDiaria: 0.1, // 0.1% por día
    diasGracia: 5, // 5 días de gracia
    montoMinimoMora: 10, // Mínimo 10 unidades
  },
  fechaCalculo: new Date(),
  idusuario: null, // Sistema
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

// El resultado incluye:
// - cuotasActualizadas: Cuotas con mora aplicada
// - moraTotalAplicada: Total de mora aplicada
// - prestamoActualizado: Préstamo con estado actualizado
```

**Validaciones:**
- ✅ Solo aplica a cuotas vencidas
- ✅ Respeta días de gracia
- ✅ Actualiza estados correctamente

### 4. `acuerdo-service.ts` - Creación de Acuerdos

```typescript
import { crearAcuerdo } from "@/lib/services/acuerdo-service";

const resultado = await crearAcuerdo({
  idprestamo: 123,
  idusuario: 1,
  tipoAcuerdo: "CONVENIO_PARCIAL",
  montoAcordado: 5000,
  numeroCuotas: 3,
  fechaInicio: new Date(),
  fechaFin: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 días
  fechasPagoProgramadas: [
    "2024-01-15",
    "2024-02-15",
    "2024-03-15",
  ],
  observacion: "Acuerdo de pago parcial",
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

// El resultado incluye:
// - acuerdo: Acuerdo creado
// - prestamo: Préstamo relacionado
```

**Validaciones:**
- ✅ Préstamo puede tener acuerdos
- ✅ No hay acuerdos activos conflictivos
- ✅ Monto no excede saldo pendiente
- ✅ Fechas válidas

### 5. `refinanciamiento-service.ts` - Refinanciamiento

```typescript
import { refinanciarPrestamo } from "@/lib/services/refinanciamiento-service";

const resultado = await refinanciarPrestamo({
  idprestamoOriginal: 123,
  idusuarioSolicitante: 1,
  idusuarioAutorizador: 2,
  motivo: "Cliente solicita refinanciamiento por dificultades económicas",
  observaciones: "Aprobado por supervisor",
  evidencia: "/documentos/evidencia.pdf",
  nuevoPrestamo: {
    codigo: "PREST-2024-002",
    tipoprestamo: "PROPIO",
    montoSolicitado: 10000,
    montoAprobado: 10000,
    montoDesembolsado: 10000,
    tasaInteresAnual: 12.5,
    plazoMeses: 12,
    fechaDesembolso: new Date(),
    diaPago: 1,
  },
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

// El resultado incluye:
// - reestructuracion: Registro de reestructuración
// - prestamoOriginal: Préstamo original actualizado
// - nuevoPrestamo: Nuevo préstamo creado
// - cuotasCanceladas: Cuotas canceladas del original
// - cuotasGeneradas: Cuotas generadas para el nuevo
// - saldoTrasladado: Saldo trasladado
```

**Validaciones:**
- ✅ Préstamo original puede ser refinanciado
- ✅ Monto nuevo cubre saldo pendiente
- ✅ Permisos de ambos usuarios

### 6. `castigo-service.ts` - Castigo de Cartera

```typescript
import { castigarPrestamo } from "@/lib/services/castigo-service";

const resultado = await castigarPrestamo({
  idprestamo: 123,
  motivo: "Cliente desaparecido, imposible contacto",
  observaciones: "Múltiples intentos de contacto sin éxito",
  idusuario: 1,
  fechaCastigo: new Date(),
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

// El resultado incluye:
// - castigo: Registro de castigo
// - prestamoCastigado: Préstamo actualizado
// - cuotasCanceladas: Cuotas canceladas
```

**Validaciones:**
- ✅ Préstamo puede ser castigado
- ✅ Motivo obligatorio
- ✅ Permisos de administrador

## Manejo de Errores

Todos los servicios lanzan errores tipados:

```typescript
import { ServicioError, ErrorCode } from "@/lib/services/error-types";

try {
  await registrarPago(datos);
} catch (error) {
  if (error instanceof ServicioError) {
    switch (error.code) {
      case ErrorCode.MONTO_EXCEDE_SALDO:
        // Manejar error de monto
        break;
      case ErrorCode.CONCURRENCIA_ERROR:
        // Manejar error de concurrencia
        break;
      case ErrorCode.PERMISO_DENEGADO:
        // Manejar error de permisos
        break;
    }
  }
  throw error;
}
```

## Control de Concurrencia

Todos los servicios usan locks lógicos automáticos:

- **Lock automático**: Se adquiere antes de la operación
- **Timeout**: 5 minutos por defecto (configurable)
- **Liberación automática**: Se libera incluso si hay error
- **Optimistic locking**: Validación de `updatedAt` para detectar cambios

## Ejemplo Completo de Uso

```typescript
import { registrarPago } from "@/lib/services/pago-service";
import { notificationToast } from "@/lib/notifications/notification-toast";

// En un resolver GraphQL o API route
export async function POST(req: Request) {
  try {
    const datos = await req.json();
    
    // Obtener información del usuario desde el contexto de autenticación
    const idusuario = req.user?.id || null;
    const ip = req.ip || req.headers.get("x-forwarded-for");
    const userAgent = req.headers.get("user-agent");

    // Obtener updatedAt del préstamo desde el frontend (optimistic locking)
    const prestamo = await prisma.tbl_prestamo.findUnique({
      where: { idprestamo: datos.idprestamo },
      select: { updatedAt: true },
    });

    const resultado = await registrarPago({
      ...datos,
      idusuario,
      updatedAtPrestamo: prestamo?.updatedAt,
      ip,
      userAgent,
    });

    notificationToast.success("Pago registrado exitosamente");
    
    return Response.json({
      success: true,
      data: resultado,
    });
  } catch (error: any) {
    console.error("Error al registrar pago:", error);
    
    return Response.json(
      {
        success: false,
        error: error.message || "Error al registrar el pago",
        code: error.code,
      },
      { status: 400 }
    );
  }
}
```

## Mejores Prácticas

1. **Siempre usar los servicios** en lugar de operaciones directas de Prisma
2. **Pasar `updatedAt`** del préstamo para optimistic locking
3. **Incluir `ip` y `userAgent`** para auditoría completa
4. **Manejar errores** específicamente según el código de error
5. **Validar permisos** antes de llamar al servicio (aunque el servicio también valida)

## Notas Importantes

- ⚠️ Los servicios usan locks que expiran automáticamente
- ⚠️ Las transacciones tienen timeouts configurados
- ⚠️ Todos los errores son transaccionales (rollback completo)
- ⚠️ La auditoría se registra dentro de la transacción

