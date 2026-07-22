-- H16: estado tipado de promesa (legacy tags en nota siguen como respaldo).

ALTER TABLE `tbl_gestion`
  ADD COLUMN `estadoPromesa` VARCHAR(16) NULL AFTER `fechaPromesa`;

UPDATE `tbl_gestion`
SET `estadoPromesa` = 'CUMPLIDA'
WHERE `deletedAt` IS NULL
  AND `montoPromesa` IS NOT NULL
  AND `fechaPromesa` IS NOT NULL
  AND `nota` LIKE '%[PROMESA_CUMPLIDA]%';

UPDATE `tbl_gestion`
SET `estadoPromesa` = 'VENCIDA'
WHERE `deletedAt` IS NULL
  AND `montoPromesa` IS NOT NULL
  AND `fechaPromesa` IS NOT NULL
  AND (`estadoPromesa` IS NULL OR `estadoPromesa` = '')
  AND `nota` LIKE '%[PROMESA_VENCIDA]%';

UPDATE `tbl_gestion`
SET `estadoPromesa` = 'PENDIENTE'
WHERE `deletedAt` IS NULL
  AND `montoPromesa` IS NOT NULL
  AND `fechaPromesa` IS NOT NULL
  AND (`estadoPromesa` IS NULL OR `estadoPromesa` = '');

CREATE INDEX `tbl_gestion_estadoPromesa_fechaPromesa_idx`
  ON `tbl_gestion`(`estadoPromesa`, `fechaPromesa`);
