ALTER TABLE `tbl_pago`
  ADD COLUMN `referenciaBancaria` VARCHAR(160) NULL;

CREATE INDEX `tbl_pago_idmandante_referenciaBancaria_idx`
  ON `tbl_pago`(`idmandante`, `referenciaBancaria`);
