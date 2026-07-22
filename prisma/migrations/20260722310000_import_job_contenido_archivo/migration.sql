-- Import async en Vercel: el filesystem /tmp no persiste entre instancias.
-- El payload vive en BD hasta COMPLETADO/ERROR (DEAD_LETTER lo conserva para reencolar).

ALTER TABLE `tbl_importacion_job`
  ADD COLUMN `contenidoArchivo` LONGBLOB NULL;
