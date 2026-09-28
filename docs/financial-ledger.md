# Ledger financiero

`tbl_movimiento_financiero` es append-only y registra el efecto firmado sobre el saldo: un pago tiene impacto negativo y su reverso positivo. `saldoTotal` continúa materializado por compatibilidad y rendimiento; el backfill crea `SALDO_INICIAL_MIGRADO` para cada préstamo sin movimientos y los nuevos eventos reducen/aumentan desde ese punto.

No se debe editar ni borrar un movimiento. Las correcciones se realizan con otro movimiento explícito. Ejecute primero `npx tsx scripts/backfill-ledger.ts --dry-run` y, tras respaldo y revisión, sin el flag.
