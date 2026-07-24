-- Descripción libre al registrar/editar pago.
ALTER TABLE `tbl_pago`
  ADD COLUMN `descripcion` VARCHAR(500) NULL
  AFTER `medio`;
