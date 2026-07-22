-- H07: maker-checker liquidación (idempotente).

SET @col_creacion := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_liquidacion'
    AND COLUMN_NAME = 'idusuarioCreacion'
);

SET @sql1 := IF(
  @col_creacion = 0,
  'ALTER TABLE `tbl_liquidacion` ADD COLUMN `idusuarioCreacion` INT NULL, ADD COLUMN `idusuarioEmision` INT NULL',
  'SELECT 1'
);
PREPARE s1 FROM @sql1; EXECUTE s1; DEALLOCATE PREPARE s1;
