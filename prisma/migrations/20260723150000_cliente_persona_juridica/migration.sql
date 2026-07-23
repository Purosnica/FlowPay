-- Persona jurídica: columnas propias + apellido nullable.
-- Backfill desde el mapeo temporal (razón social en primer_nombres, apellido '-').

ALTER TABLE `tbl_cliente`
  ADD COLUMN `razon_social` VARCHAR(191) NULL,
  ADD COLUMN `nombre_comercial` VARCHAR(191) NULL,
  ADD COLUMN `contacto_nombre` VARCHAR(191) NULL,
  ADD COLUMN `contacto_cargo` VARCHAR(191) NULL,
  ADD COLUMN `contacto_telefono` VARCHAR(191) NULL,
  ADD COLUMN `contacto_email` VARCHAR(191) NULL;

ALTER TABLE `tbl_cliente`
  MODIFY `primer_apellido` VARCHAR(191) NULL;

-- Jurídica: promover primer_nombres → razon_social; nombre comercial desde segundo_nombres.
UPDATE `tbl_cliente` c
INNER JOIN `tbl_tipopersona` tp ON tp.`idtipopersona` = c.`idtipopersona`
SET
  c.`razon_social` = c.`primer_nombres`,
  c.`nombre_comercial` = NULLIF(TRIM(c.`segundo_nombres`), ''),
  c.`primer_apellido` = NULL,
  c.`segundo_apellido` = NULL,
  c.`fechanacimiento` = NULL,
  c.`idgenero` = NULL,
  c.`idestadocivil` = NULL,
  c.`idocupacion` = NULL,
  c.`espep` = FALSE
WHERE
  tp.`descripcion` LIKE '%Jur%'
  OR tp.`descripcion` LIKE '%jur%';

-- Placeholder legacy de apellido jurídica.
UPDATE `tbl_cliente`
SET `primer_apellido` = NULL
WHERE `primer_apellido` = '-';
