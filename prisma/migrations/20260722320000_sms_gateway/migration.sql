-- Cola / log de SMS vía SMSGateway Android + SMS entrantes

CREATE TABLE `tbl_envio_sms` (
    `idsms` INTEGER NOT NULL AUTO_INCREMENT,
    `dispositivoId` INTEGER NOT NULL DEFAULT 1,
    `idprestamo` INTEGER NOT NULL,
    `idmandante` INTEGER NOT NULL,
    `idusuario` INTEGER NOT NULL,
    `idplantilla` INTEGER NULL,
    `telefono` VARCHAR(32) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    `errorDetalle` TEXT NULL,
    `campanaNombre` VARCHAR(120) NULL,
    `claimedAt` DATETIME(3) NULL,
    `enviadoAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idsms`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tbl_sms_recibido` (
    `idrecibido` INTEGER NOT NULL AUTO_INCREMENT,
    `dispositivoId` INTEGER NOT NULL DEFAULT 1,
    `telefono` VARCHAR(32) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`idrecibido`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `tbl_envio_sms_dispositivoId_estado_createdAt_idx` ON `tbl_envio_sms`(`dispositivoId`, `estado`, `createdAt`);
CREATE INDEX `tbl_envio_sms_idprestamo_idx` ON `tbl_envio_sms`(`idprestamo`);
CREATE INDEX `tbl_envio_sms_idmandante_idx` ON `tbl_envio_sms`(`idmandante`);
CREATE INDEX `tbl_envio_sms_estado_claimedAt_idx` ON `tbl_envio_sms`(`estado`, `claimedAt`);
CREATE INDEX `tbl_sms_recibido_createdAt_idx` ON `tbl_sms_recibido`(`createdAt`);
CREATE INDEX `tbl_sms_recibido_telefono_idx` ON `tbl_sms_recibido`(`telefono`);

ALTER TABLE `tbl_envio_sms` ADD CONSTRAINT `tbl_envio_sms_idprestamo_fkey` FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_envio_sms` ADD CONSTRAINT `tbl_envio_sms_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_envio_sms` ADD CONSTRAINT `tbl_envio_sms_idusuario_fkey` FOREIGN KEY (`idusuario`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_envio_sms` ADD CONSTRAINT `tbl_envio_sms_idplantilla_fkey` FOREIGN KEY (`idplantilla`) REFERENCES `tbl_plantilla_mensaje`(`idplantilla`) ON DELETE SET NULL ON UPDATE CASCADE;
