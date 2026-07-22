-- Ejecutar si `prisma migrate deploy` no alcanza el servidor (I072).
-- Si la columna/índice ya existen, omitir el statement correspondiente.

ALTER TABLE `tbl_pago`
  ADD COLUMN `folio` VARCHAR(16)
    GENERATED ALWAYS AS (CONCAT('FP-', LPAD(`idpago`, 8, '0'))) STORED NOT NULL;

CREATE UNIQUE INDEX `tbl_pago_folio_key` ON `tbl_pago` (`folio`);
