# Bounded contexts — FlowPay (I005)

Límites suaves sin mover ~309 archivos de `src/lib/`. Los barrels reexportan servicios existentes.

| Contexto | Barrel | Carpetas / servicios actuales |
|----------|--------|-------------------------------|
| **Cartera** | `src/lib/contexts/cartera` | import, asignación, mora, castigo |
| **Gestión** | `src/lib/contexts/gestion` | bandeja, mi-día, horario, compliance, prioridad |
| **Liquidación** | `src/lib/contexts/liquidacion` | liquidación, pagos, comisiones, comprobante |

Nuevo código de dominio debería importar desde el barrel del contexto cuando sea práctico.

**Consumidores iniciales (H22):** resolvers de liquidación, asignación-cartera, pago (aplicar/revertir), inteligencia (mi-día / mora), horario-cobranza.
