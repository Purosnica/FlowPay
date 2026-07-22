-- H16: backfill estadoPromesa desde tags legacy en nota
UPDATE `tbl_gestion`
SET `estadoPromesa` = 'CUMPLIDA'
WHERE `deletedAt` IS NULL
  AND `montoPromesa` IS NOT NULL
  AND `fechaPromesa` IS NOT NULL
  AND (`estadoPromesa` IS NULL OR `estadoPromesa` = 'PENDIENTE')
  AND `nota` LIKE '%[PROMESA_CUMPLIDA]%';

UPDATE `tbl_gestion`
SET `estadoPromesa` = 'VENCIDA'
WHERE `deletedAt` IS NULL
  AND `montoPromesa` IS NOT NULL
  AND `fechaPromesa` IS NOT NULL
  AND (`estadoPromesa` IS NULL OR `estadoPromesa` = 'PENDIENTE')
  AND `nota` LIKE '%[PROMESA_VENCIDA]%'
  AND `nota` NOT LIKE '%[PROMESA_CUMPLIDA]%';

UPDATE `tbl_gestion`
SET `estadoPromesa` = 'PENDIENTE'
WHERE `deletedAt` IS NULL
  AND `montoPromesa` IS NOT NULL
  AND `fechaPromesa` IS NOT NULL
  AND `estadoPromesa` IS NULL;
