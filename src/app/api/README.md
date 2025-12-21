# API Routes - Sistema de Préstamos y Cobranza

Este directorio contiene todas las API Routes del sistema, organizadas por módulos.

## Estructura

```
api/
├── prestamos/
│   ├── route.ts                    # POST: Crear, GET: Listar
│   ├── [id]/
│   │   ├── route.ts                # GET: Obtener, PUT: Modificar, DELETE: Cancelar
│   │   └── refinanciar/
│   │       └── route.ts            # POST: Refinanciar
├── pagos/
│   ├── route.ts                    # POST: Registrar, GET: Listar
│   ├── aplicar-mora/
│   │   └── route.ts               # POST: Aplicar mora
│   └── saldo/
│       └── route.ts               # GET: Consultar saldo
├── acuerdos/
│   ├── route.ts                    # POST: Crear, GET: Listar
│   └── [id]/
│       └── route.ts               # GET: Obtener, PUT: Actualizar, DELETE: Cancelar
├── cobradores/
│   ├── asignar/
│   │   └── route.ts               # POST: Asignar préstamo a cobrador
│   └── reasignar/
│       └── route.ts               # POST: Reasignar cartera
└── reportes/
    ├── cobranza/
    │   └── route.ts               # GET: Reporte de cobranza
    ├── mora/
    │   └── route.ts               # GET: Reporte de mora
    ├── saldos/
    │   └── route.ts               # GET: Reporte de saldos
    └── recuperacion/
        └── route.ts               # GET: Reporte de recuperación
```

## Características

### ✅ Seguridad
- Autenticación requerida en todos los endpoints
- Validación de permisos específicos por operación
- Captura de IP y User-Agent para auditoría

### ✅ Validaciones
- Validación de datos con Zod
- Validaciones de negocio en servicios
- Optimistic locking para prevenir conflictos

### ✅ Transacciones
- Todas las operaciones críticas son transaccionales
- Rollback automático en caso de error
- Timeouts configurados

### ✅ Manejo de Errores
- Errores tipados y consistentes
- Mensajes claros para el frontend
- Códigos de estado HTTP apropiados

## Endpoints Disponibles

### Préstamos

#### `POST /api/prestamos`
Crear un nuevo préstamo con cuotas.

**Permiso requerido:** `CREATE_LOAN`

**Body:**
```json
{
  "idcliente": 1,
  "tipoprestamo": "PROPIO",
  "codigo": "PREST-2024-001",
  "montoSolicitado": 10000,
  "tasaInteresAnual": 12.5,
  "plazoMeses": 12,
  "generarCuotas": true,
  "diaPago": 1
}
```

#### `GET /api/prestamos?page=1&pageSize=10&estado=EN_CURSO`
Listar préstamos con filtros y paginación.

**Permiso requerido:** `VIEW_LOAN`

#### `GET /api/prestamos/[id]`
Obtener un préstamo por ID con todas sus relaciones.

**Permiso requerido:** `VIEW_LOAN`

#### `PUT /api/prestamos/[id]`
Modificar un préstamo.

**Permiso requerido:** `EDIT_LOAN`

#### `DELETE /api/prestamos/[id]`
Cancelar un préstamo (soft delete).

**Permiso requerido:** `DELETE_LOAN`

#### `POST /api/prestamos/[id]/refinanciar`
Refinanciar un préstamo creando uno nuevo.

**Permiso requerido:** `RESTRUCTURE_LOAN`

### Pagos

#### `POST /api/pagos`
Registrar un nuevo pago.

**Permiso requerido:** `APPLY_PAYMENT`

**Body:**
```json
{
  "idprestamo": 123,
  "idcuota": 5,
  "montoCapital": 1000,
  "montoInteres": 200,
  "montoMora": 50,
  "metodoPago": "EFECTIVO",
  "tipoCobro": "PARCIAL",
  "updatedAtPrestamo": "2024-01-15T10:00:00Z"
}
```

#### `GET /api/pagos?page=1&pageSize=10&idprestamo=123`
Listar pagos con filtros.

**Permiso requerido:** `VIEW_PAYMENT`

#### `POST /api/pagos/aplicar-mora`
Aplicar mora automáticamente a un préstamo.

**Permiso requerido:** `APPLY_PAYMENT`

**Body:**
```json
{
  "idprestamo": 123,
  "configuracion": {
    "tasaMoraDiaria": 0.1,
    "diasGracia": 5,
    "montoMinimoMora": 10
  }
}
```

#### `GET /api/pagos/saldo?idprestamo=123`
Consultar saldo pendiente de un préstamo.

**Permiso requerido:** `VIEW_LOAN`

### Acuerdos

#### `POST /api/acuerdos`
Crear un nuevo acuerdo de pago.

**Permiso requerido:** `CREAR_ACUERDO`

**Body:**
```json
{
  "idprestamo": 123,
  "tipoAcuerdo": "CONVENIO_PARCIAL",
  "montoAcordado": 5000,
  "numeroCuotas": 3,
  "fechaInicio": "2024-01-15T00:00:00Z",
  "fechaFin": "2024-04-15T00:00:00Z"
}
```

#### `GET /api/acuerdos?page=1&pageSize=10&estado=ACTIVO`
Listar acuerdos con filtros.

**Permiso requerido:** `VER_CARTERA`

#### `GET /api/acuerdos/[id]`
Obtener un acuerdo por ID.

**Permiso requerido:** `VER_CARTERA`

#### `PUT /api/acuerdos/[id]`
Actualizar un acuerdo.

**Permiso requerido:** `EDITAR_ACUERDO`

#### `DELETE /api/acuerdos/[id]`
Cancelar un acuerdo.

**Permiso requerido:** `ELIMINAR_ACUERDO`

### Cobradores

#### `POST /api/cobradores/asignar`
Asignar un préstamo a un cobrador.

**Permiso requerido:** `ASIGNAR_CUENTAS`

**Body:**
```json
{
  "idprestamo": 123,
  "idusuario": 5,
  "motivo": "Nueva asignación"
}
```

#### `POST /api/cobradores/reasignar`
Reasignar un préstamo de un cobrador a otro.

**Permiso requerido:** `ASIGNAR_CUENTAS`

**Body:**
```json
{
  "idasignacion": 10,
  "idusuarioNuevo": 6,
  "motivo": "Reasignación por carga de trabajo"
}
```

### Reportes

#### `GET /api/reportes/cobranza?fechaDesde=2024-01-01&fechaHasta=2024-01-31`
Reporte de cobranza con estadísticas y agrupaciones.

**Permiso requerido:** `VER_REPORTES`

#### `GET /api/reportes/mora?fecha=2024-01-15`
Reporte de mora diaria.

**Permiso requerido:** `VER_REPORTES`

#### `GET /api/reportes/saldos?estado=EN_MORA&idcobrador=5`
Reporte de saldos totales.

**Permiso requerido:** `VER_REPORTES`

#### `GET /api/reportes/recuperacion?tipo=cobrador&fechaDesde=2024-01-01`
Reporte de recuperación por cliente o por cobrador.

**Permiso requerido:** `VER_REPORTES`

## Autenticación

Todos los endpoints requieren autenticación. El token debe enviarse en el header:

```
Authorization: Bearer <token>
```

## Respuestas

### Éxito
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": "Mensaje de error",
  "code": "CODIGO_ERROR",
  "detalles": { ... }
}
```

## Códigos de Estado HTTP

- `200` - Éxito
- `400` - Error de validación
- `401` - No autenticado
- `403` - Permiso denegado
- `404` - Recurso no encontrado
- `409` - Conflicto (concurrencia, duplicado)
- `500` - Error del servidor

## Ejemplo de Uso

```typescript
// Registrar un pago
const response = await fetch("/api/pagos", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({
    idprestamo: 123,
    montoCapital: 1000,
    montoInteres: 200,
    montoMora: 50,
    metodoPago: "EFECTIVO",
    tipoCobro: "PARCIAL",
  }),
});

const result = await response.json();
if (result.success) {
  console.log("Pago registrado:", result.data);
} else {
  console.error("Error:", result.error);
}
```



