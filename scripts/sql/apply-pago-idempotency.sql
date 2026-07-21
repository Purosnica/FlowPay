-- Ejecutar en phpMyAdmin / MySQL del host si `prisma migrate deploy` no alcanza el servidor.
-- Idempotencia de pagos (FlowPay 1.2.3)

-- Si la columna ya existe, omitir el ALTER.
ALTER TABLE `tbl_pago`
  ADD COLUMN `idempotencyKey` VARCHAR(64) NULL;

-- Si el índice ya existe, omitir el CREATE.
CREATE UNIQUE INDEX `tbl_pago_idgestor_idempotencyKey_key`
  ON `tbl_pago`(`idgestor`, `idempotencyKey`);
