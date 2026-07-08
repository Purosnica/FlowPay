# Manual del Cobrador — FlowPay

Guía operativa para el rol **COBRADOR**.

**Permisos:** `CARTERA_READ`, `MANDANTE_READ`, `GESTION_READ/WRITE`, `ACUERDO_READ/WRITE`, `PAGO_READ/WRITE`, `REPORTE_READ`

---

## 1. Inicio de sesión

1. Ir a `/login`
2. Ingresar credenciales (demo: `cobrador@flowpay.com` / `cobrador123`)
3. El menú lateral muestra solo módulos autorizados

---

## 2. Rutina diaria recomendada

```
Mi día → Bandeja → Gestión → Pago/Acuerdo → Siguiente caso
```

### 2.1 Mi día (`/cobranza/mi-dia`)

Vista de inicio del cobrador:

| Elemento | Uso |
|----------|-----|
| Casos prioritarios | Top casos del día por score |
| Promesas hoy | Compromisos a cumplir hoy |
| Promesas vencidas | Seguimiento urgente |
| Gestiones / pagos hoy | Actividad del día |
| Monto recuperado hoy | Meta diaria informal |

### 2.2 Mi bandeja (`/cobranza/bandeja`)

Cola de trabajo priorizada. Filtros por mandante, mora, estado.

**Acción:** abrir préstamo → registrar gestión o pago.

### 2.3 Registrar gestión

Desde el detalle del préstamo (`/cobranza/prestamos/[id]`):

1. Seleccionar tipificación y resultado
2. Indicar próxima gestión o promesa (fecha + monto)
3. Guardar — respeta horarios de contacto del mandante

### 2.4 Registrar pago

1. Ir a formulario de pago en el préstamo
2. Ingresar monto, fecha, referencia
3. El sistema aplica al saldo según configuración del mandante

### 2.5 Acuerdos

- Consultar acuerdos vigentes
- Crear acuerdo con simulador de cuotas
- Descuentos altos requieren aprobación de supervisor

---

## 3. Consultas frecuentes

| Necesidad | Ruta |
|-----------|------|
| Buscar cliente | `/clientes` |
| Ver mis gestiones | `/cobranza/gestiones` |
| Ver cartera asignada | `/cobranza/cartera` (filtro por gestor) |
| Reportes básicos | `/cobranza/reportes` |
| Historial del préstamo | Detalle préstamo → Timeline |

---

## 4. Restricciones del rol

| Acción | ¿Permitido? |
|--------|-------------|
| Importar cartera | No |
| Asignar cobradores | No |
| Centro de inteligencia | No |
| Ver equipo / gamificación | No |
| Liquidaciones | No |
| Configuración | No |

---

## 5. Buenas prácticas

- Atender primero promesas vencidas y casos de Mi día
- Registrar gestión en cada contacto (aunque no conteste)
- No prometer montos sin registrar promesa formal
- Respetar alertas de horario de cobranza

---

## 6. Validación

Escenarios UAT: sección **Cobrador** en [UAT-COBRANZA.md](../UAT-COBRANZA.md).
