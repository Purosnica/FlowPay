-- H04: snapshot waterfall de aplicación de pago (reverso exacto).
ALTER TABLE `tbl_pago`
  ADD COLUMN `aplicacionJson` VARCHAR(512) NULL
  AFTER `folio`;
