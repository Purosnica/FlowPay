# A. RESUMEN DE REMEDIACIÓN

Se implementó una primera entrega segura y aditiva de los P0. No se aplicaron migraciones contra una base real porque el entorno no dispone de `DATABASE_URL`; las migraciones y el backfill quedan listos para desplegar tras backup y dry-run.

# B. HALLAZGOS CORREGIDOS

| ID | Estado | Corrección | Evidencia |
|---|---|---|---|
| AUD-001 | PARCIAL | Cancelar préstamo ya no escribe saldo; rechaza saldo pendiente y transiciona solo una obligación liquidada | `asignacion-cartera-service.ts:cancelarPrestamo` |
| AUD-002 | RESUELTO (política temporal) | Bloqueo backend de moneda distinta; no se descuenta nominal cross-currency | `pago-politica-service.ts:validarPoliticaPago` |
| AUD-003 | RESUELTO | Mora usa días de calendario en `America/Managua` | `timezone.ts`, `dias-mora-service.ts` |
| AUD-004 | RESUELTO | Huella SHA-256 e índice único por mandante para importaciones | migración `20260928130000_pago_source_fingerprint` |
| AUD-005 | PARCIAL | Se valida escala de pago/FX antes de persistir; GraphQL financiero aún usa Float en contratos heredados | `pago-politica-service.ts` |
| AUD-006–010 | PARCIAL | Ledger y lint corregido; constraints compuestos, auditoría archivada y conciliación persistente requieren fase siguiente | ver riesgos residuales |

# C. ARCHIVOS MODIFICADOS

- `pago-politica-service.ts`: fecha futura, escala y política monetaria en backend.
- `pago-aplicacion-service.ts` y `acuerdo-condonacion-service.ts`: escriben movimientos append-only junto con saldo materializado.
- `dias-mora-service.ts` y `timezone.ts`: calendario de negocio independiente del host.
- `pagos-import-service.ts`: fingerprint determinista y tratamiento de carrera de unicidad.
- `asignacion-cartera-service.ts`: elimina la escritura destructiva de saldo.
- `ledger-financiero-service.ts`: registro de movimiento y saldo al corte.

# D. MIGRACIONES

- `20260928130000_pago_source_fingerprint`: columnas de origen y unique `(idmandante, sourceFingerprint)`.
- `20260928140000_financial_ledger`: tabla append-only `tbl_movimiento_financiero` con FK `RESTRICT` al préstamo.

# E. CAMBIOS EN BASE DE DATOS

El ledger conserva importe, moneda, impacto firmado, saldos antes/después, fecha, referencias a pago/acuerdo, actor, aprobador previsto y metadata. No se eliminó ninguna columna ni tabla existente.

# F. PRUEBAS EJECUTADAS

| Prueba | Resultado |
|---|---|
| `npx prisma generate` | Correcto |
| `npx tsc --noEmit` | Correcto |
| `npm run lint` | Correcto: 0 errores; 10 advertencias no bloqueantes existentes |
| `npm run test:unit` | Bloqueado por `tsx`/Node `uv_os_get_passwd ENOMEM` antes de ejecutar pruebas |

# G. INTEGRIDAD FINANCIERA

Para eventos nuevos, PAGO registra `-monto`, REVERSO_PAGO `+monto`, y CONDONACION `-monto`; sus saldos antes/después se crean dentro de la misma transacción que la mutación materializada. El backfill crea un `SALDO_INICIAL_MIGRADO` por préstamo sin ledger; ejecutar y contrastar contra MySQL es condición antes de afirmar cuadratura histórica.

# H. RIESGOS RESIDUALES

- Falta probar migrations/backfill/concurrencia contra MySQL representativo.
- El ledger aún debe extenderse a castigo, ajuste, refinanciamiento y descuentos manuales con solicitud/aprobación segregada.
- Contratos GraphQL heredados aún exponen otros importes con `Float`.
- Conciliación bancaria persistente, archivo inmutable de auditoría, cierre diario y constraints FK compuestos no están implementados.

# I. DESPLIEGUE RECOMENDADO

1. Backup verificable. 2. `prisma migrate deploy`. 3. `ledger:backfill -- --dry-run`. 4. Revisar resultados. 5. Backfill real. 6. Integrity-check SQL. 7. Ejecutar tests en un runner Node sano. 8. Activar monitoreo. 9. Continuar P1 antes de retirar flujos legados.
