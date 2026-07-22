-- I015: idempotencyKey en liquidaciones (único por mandante)
ALTER TABLE `tbl_liquidacion`
  ADD COLUMN `idempotencyKey` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `tbl_liquidacion_idmandante_idempotencyKey_key`
  ON `tbl_liquidacion` (`idmandante`, `idempotencyKey`);
