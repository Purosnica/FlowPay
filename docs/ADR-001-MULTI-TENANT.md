# ADR-001 — Multi-tenant isolation

**Estado:** Aceptado  
**Fecha:** 2026-07-22  
**IDs audit:** I008 / roadmap SC-3 / H21

## Contexto

FlowPay opera multi-mandante con filtros runtime por `idmandante` ([mandante-scope.ts](../src/lib/cobranza/mandante-scope.ts)). A escala Enterprise existe riesgo de fuga si un resolver omite el scope.

## Decisión

Mantener **aislamiento row-level** (`TENANT_ISOLATION_POLICY = ROW_LEVEL`) como política vigente.

API de tenancy: `src/lib/tenancy/tenant-isolation.ts` (`assertTenantAccess`, `listTenantIdsForUser`, `assertClienteTenantAccess`).

**No** provisionar schema-per-tenant ni bases separadas en esta oleada (costo operativo y migración de datos).

## Consecuencias

- Pros: sin cambio de despliegue; reutiliza controles RBAC existentes.
- Contras: la seguridad depende de disciplina en resolvers/services.
- Futuro (SC-3): schema isolation o DB-per-tenant cuando haya clientes Enterprise que lo exijan y presupuesto de ops.

## Alcance entidad (H21 — cerrado por decisión)

| Entidad | Política |
|---------|----------|
| `tbl_prestamo`, `tbl_gestion`, `tbl_pago`, … | `idmandante` obligatorio |
| `tbl_agencia` | **Tenant-scoped** (`idmandante` + unique `[idmandante, codigo]`) |
| `tbl_cliente` | Master **compartido** (persona natural); acceso vía préstamos del mandante (`assertClienteTenantAccess` / `filtroClientePorMandante`) |

No se parte `tbl_cliente` por mandante: el mismo documento puede tener cartera con varios acreedores. Reabrir solo si un mandante Enterprise exige aislamiento físico de personas.
