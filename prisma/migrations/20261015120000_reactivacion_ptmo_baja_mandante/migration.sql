ALTER TABLE `tbl_baja_mandante_detalle`
  ADD COLUMN `reactivadoAt` DATETIME(3) NULL,
  ADD COLUMN `idusuarioReactivacion` INTEGER NULL,
  ADD COLUMN `motivoReactivacion` TEXT NULL;

CREATE INDEX `tbl_baja_mandante_detalle_idlote_reactivadoAt_idx`
  ON `tbl_baja_mandante_detalle`(`idlote`, `reactivadoAt`);
