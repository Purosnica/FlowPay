# Guía de migración de remediación

1. Respaldar MySQL y verificar la restauración.
2. Ejecutar `npm run financial:precheck`; cualquier valor distinto de cero bloquea la migración de constraints.
3. Ejecutar `npx prisma migrate deploy` (migraciones aditivas de fingerprint, ledger, auditoría, conciliación y cierre).
3. Ejecutar `npx tsx scripts/backfill-ledger.ts --dry-run`; revisar cantidad y excepciones.
4. Ejecutar el backfill sin `--dry-run` en una ventana controlada.
5. Validar que el saldo materializado coincide con la suma del ledger desde el movimiento inicial migrado.
6. Ejecutar `npx tsc --noEmit`, `npm run lint` y las suites de pruebas.

Rollback: no eliminar las columnas/tablas nuevas. Desactive la nueva lógica de escritura y restaure desde el respaldo si se requiere; los movimientos ya creados preservan evidencia.
