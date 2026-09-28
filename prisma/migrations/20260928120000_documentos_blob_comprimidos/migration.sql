ALTER TABLE `tbl_documento`
  ADD COLUMN `nombreArchivo` VARCHAR(255) NULL,
  ADD COLUMN `archivoMime` VARCHAR(100) NULL,
  ADD COLUMN `archivoBlob` LONGBLOB NULL,
  ADD COLUMN `archivoComprimido` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `tamanioOriginal` INT NULL;
