-- MFA TOTP para ADMIN/GERENTE (y usuarios que lo activen).
ALTER TABLE `tbl_usuario`
  ADD COLUMN `mfaEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `mfaSecret` VARCHAR(512) NULL,
  ADD COLUMN `mfaEnabledAt` DATETIME(3) NULL;
