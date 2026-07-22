-- H21: agencia por mandante (tenant).
-- H25: FX en liquidación.
-- Idempotente: permite recuperar tras fallo parcial (P3018).

-- === Agencia: idmandante ===
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_agencia'
    AND COLUMN_NAME = 'idmandante'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `tbl_agencia` ADD COLUMN `idmandante` INT NULL AFTER `idagencia`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `tbl_agencia` a
SET `idmandante` = (
  SELECT p.`idmandante`
  FROM `tbl_prestamo` p
  WHERE p.`idagencia` = a.`idagencia`
    AND p.`deletedAt` IS NULL
  GROUP BY p.`idmandante`
  ORDER BY COUNT(*) DESC
  LIMIT 1
)
WHERE a.`idmandante` IS NULL;

UPDATE `tbl_agencia` a
SET `idmandante` = (
  SELECT MIN(m.`idmandante`) FROM `tbl_mandante` m WHERE m.`deletedAt` IS NULL
)
WHERE a.`idmandante` IS NULL;

SET @nullable := (
  SELECT IS_NULLABLE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_agencia'
    AND COLUMN_NAME = 'idmandante'
  LIMIT 1
);

SET @sql := IF(
  @nullable = 'YES',
  'ALTER TABLE `tbl_agencia` MODIFY COLUMN `idmandante` INT NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Unique global histórico: baseline usa `tbl_agencia_codigo_key`
SET @idx := (
  SELECT INDEX_NAME
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_agencia'
    AND INDEX_NAME IN ('codigo', 'tbl_agencia_codigo_key')
    AND NON_UNIQUE = 0
  LIMIT 1
);

SET @sql := IF(
  @idx IS NOT NULL,
  CONCAT('ALTER TABLE `tbl_agencia` DROP INDEX `', @idx, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_agencia'
    AND CONSTRAINT_NAME = 'tbl_agencia_idmandante_fkey'
);

SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE `tbl_agencia` ADD CONSTRAINT `tbl_agencia_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @uq_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_agencia'
    AND INDEX_NAME = 'tbl_agencia_idmandante_codigo_key'
);

SET @sql := IF(
  @uq_exists = 0,
  'ALTER TABLE `tbl_agencia` ADD UNIQUE INDEX `tbl_agencia_idmandante_codigo_key` (`idmandante`, `codigo`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ix_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_agencia'
    AND INDEX_NAME = 'tbl_agencia_idmandante_idx'
);

SET @sql := IF(
  @ix_exists = 0,
  'ALTER TABLE `tbl_agencia` ADD INDEX `tbl_agencia_idmandante_idx` (`idmandante`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- === Liquidación FX ===
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_liquidacion'
    AND COLUMN_NAME = 'moneda'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `tbl_liquidacion` ADD COLUMN `moneda` VARCHAR(3) NOT NULL DEFAULT ''NIO'' AFTER `periodoActivo`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_liquidacion_detalle'
    AND COLUMN_NAME = 'monedaOriginal'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `tbl_liquidacion_detalle` ADD COLUMN `monedaOriginal` VARCHAR(3) NOT NULL DEFAULT ''NIO'' AFTER `monto`, ADD COLUMN `montoOriginal` DECIMAL(14, 2) NOT NULL DEFAULT 0 AFTER `monedaOriginal`, ADD COLUMN `tipoCambioAplicado` DECIMAL(10, 4) NOT NULL DEFAULT 1 AFTER `montoOriginal`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `tbl_liquidacion_detalle`
SET `montoOriginal` = `monto`
WHERE `montoOriginal` = 0;
