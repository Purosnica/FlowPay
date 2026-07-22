-- Ejecutar si `prisma migrate deploy` no alcanza el servidor (I015).
-- Si la columna/índice ya existen, omitir el statement correspondiente.

ALTER TABLE `tbl_liquidacion`
  ADD COLUMN `idempotencyKey` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `tbl_liquidacion_idmandante_idempotencyKey_key`
  ON `tbl_liquidacion` (`idmandante`, `idempotencyKey`);
