-- Precheck obligatorio: resolver líneas con más de una conciliación antes de aplicar.
ALTER TABLE `tbl_conciliacion_pago`
  ADD UNIQUE INDEX `tbl_conciliacion_pago_idlinea_key` (`idlinea`);

-- Normaliza el scope nullable del cierre para que UNIQUE sea efectivo en MySQL.
ALTER TABLE `tbl_cierre_diario`
  ADD COLUMN `scopeAgencia` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `scopeUsuarioCaja` INTEGER NOT NULL DEFAULT 0;
UPDATE `tbl_cierre_diario`
  SET `scopeAgencia` = COALESCE(`idagencia`, 0),
      `scopeUsuarioCaja` = COALESCE(`idusuarioCaja`, 0);
CREATE UNIQUE INDEX `tbl_cierre_diario_scope_normalizado_key`
  ON `tbl_cierre_diario` (`idmandante`, `fechaNegocio`, `scopeAgencia`, `scopeUsuarioCaja`);
