-- I072: folio comprobante FP único (app-level; MariaDB no permite GENERATED sobre AUTO_INCREMENT).
ALTER TABLE `tbl_pago`
  ADD COLUMN `folio` VARCHAR(16) NULL;

UPDATE `tbl_pago`
SET `folio` = CONCAT('FP-', LPAD(`idpago`, 8, '0'))
WHERE `folio` IS NULL;

CREATE UNIQUE INDEX `tbl_pago_folio_key` ON `tbl_pago` (`folio`);
