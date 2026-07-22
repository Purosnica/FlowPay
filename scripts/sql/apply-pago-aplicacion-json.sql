-- H04: snapshot waterfall de aplicación de pago (reverso exacto).
-- Idempotente para entornos que aún no tienen la columna.

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_pago'
    AND COLUMN_NAME = 'aplicacionJson'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `tbl_pago` ADD COLUMN `aplicacionJson` VARCHAR(512) NULL AFTER `folio`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
