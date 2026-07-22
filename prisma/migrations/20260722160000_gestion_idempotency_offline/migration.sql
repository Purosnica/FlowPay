-- I036: idempotency gestiones (cola offline PWA)
ALTER TABLE `tbl_gestion`
  ADD COLUMN `idempotencyKey` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `tbl_gestion_idgestor_idempotencyKey_key`
  ON `tbl_gestion` (`idgestor`, `idempotencyKey`);
