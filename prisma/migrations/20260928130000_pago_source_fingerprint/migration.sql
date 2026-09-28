-- Migración aditiva: pagos históricos existentes permanecen sin fingerprint.
ALTER TABLE `tbl_pago`
  ADD COLUMN `sourceFingerprint` CHAR(64) NULL,
  ADD COLUMN `origenPago` VARCHAR(32) NULL;

CREATE UNIQUE INDEX `tbl_pago_idmandante_sourceFingerprint_key`
  ON `tbl_pago`(`idmandante`, `sourceFingerprint`);
