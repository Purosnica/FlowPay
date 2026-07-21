-- Idempotencia de pagos: evita duplicados en reintentos de cliente.
ALTER TABLE `tbl_pago` ADD COLUMN `idempotencyKey` VARCHAR(64) NULL;
CREATE UNIQUE INDEX `tbl_pago_idgestor_idempotencyKey_key` ON `tbl_pago`(`idgestor`, `idempotencyKey`);
