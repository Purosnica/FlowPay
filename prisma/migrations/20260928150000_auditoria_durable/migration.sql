-- Aditiva: bloquea purga de auditoría hasta que un archivador externo confirme copia durable.
ALTER TABLE `tbl_auditoria`
  ADD COLUMN `motivo` TEXT NULL,
  ADD COLUMN `idaprobador` INTEGER NULL,
  ADD COLUMN `requestId` VARCHAR(64) NULL,
  ADD COLUMN `correlationId` VARCHAR(64) NULL,
  ADD COLUMN `previousHash` CHAR(64) NULL,
  ADD COLUMN `recordHash` CHAR(64) NULL,
  ADD COLUMN `archivoEstado` VARCHAR(24) NOT NULL DEFAULT 'HOT',
  ADD COLUMN `archivoUri` VARCHAR(500) NULL,
  ADD COLUMN `archivedAt` DATETIME(3) NULL;
CREATE INDEX `tbl_auditoria_archivoEstado_createdAt_idx` ON `tbl_auditoria`(`archivoEstado`, `createdAt`);
