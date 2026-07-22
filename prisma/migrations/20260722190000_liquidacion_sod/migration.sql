-- H07: maker-checker liquidación (quién generó / quién emitió).
ALTER TABLE `tbl_liquidacion`
  ADD COLUMN `idusuarioCreacion` INT NULL,
  ADD COLUMN `idusuarioEmision` INT NULL;

ALTER TABLE `tbl_liquidacion`
  ADD CONSTRAINT `tbl_liquidacion_idusuarioCreacion_fkey`
    FOREIGN KEY (`idusuarioCreacion`) REFERENCES `tbl_usuario`(`idusuario`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tbl_liquidacion`
  ADD CONSTRAINT `tbl_liquidacion_idusuarioEmision_fkey`
    FOREIGN KEY (`idusuarioEmision`) REFERENCES `tbl_usuario`(`idusuario`)
    ON DELETE SET NULL ON UPDATE CASCADE;
