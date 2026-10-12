ALTER TABLE `tbl_prestamo`
  ADD COLUMN `gestionActiva` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `bajaMandanteAt` DATETIME(3) NULL,
  ADD COLUMN `bajaMandanteEfectiva` DATETIME(3) NULL,
  ADD COLUMN `bajaMandanteMotivo` TEXT NULL,
  ADD COLUMN `bajaMandanteLoteId` INTEGER NULL;

CREATE TABLE `tbl_baja_mandante_lote` (
  `idlote` INTEGER NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(40) NOT NULL,
  `idmandante` INTEGER NOT NULL,
  `idcampana` INTEGER NULL,
  `idusuario` INTEGER NOT NULL,
  `estado` VARCHAR(24) NOT NULL DEFAULT 'VALIDADO',
  `motivo` VARCHAR(100) NOT NULL,
  `observaciones` TEXT NULL,
  `referenciaMandante` VARCHAR(150) NULL,
  `fechaEfectiva` DATETIME(3) NOT NULL,
  `nombreArchivo` VARCHAR(255) NOT NULL,
  `archivoHash` CHAR(64) NOT NULL,
  `archivoContenido` LONGBLOB NULL,
  `idempotencyKey` VARCHAR(128) NULL,
  `totalRecibidos` INTEGER NOT NULL DEFAULT 0,
  `totalElegibles` INTEGER NOT NULL DEFAULT 0,
  `totalExitosos` INTEGER NOT NULL DEFAULT 0,
  `totalRechazados` INTEGER NOT NULL DEFAULT 0,
  `saldoRetirado` DECIMAL(16,2) NOT NULL DEFAULT 0,
  `ejecutadoAt` DATETIME(3) NULL,
  `revertidoAt` DATETIME(3) NULL,
  `motivoReversion` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `tbl_baja_mandante_lote_codigo_key` (`codigo`),
  UNIQUE INDEX `tbl_baja_mandante_lote_idempotencyKey_key` (`idempotencyKey`),
  INDEX `tbl_baja_mandante_lote_idmandante_createdAt_idx` (`idmandante`, `createdAt`),
  INDEX `tbl_baja_mandante_lote_estado_createdAt_idx` (`estado`, `createdAt`),
  INDEX `tbl_baja_mandante_lote_archivoHash_idx` (`archivoHash`),
  PRIMARY KEY (`idlote`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tbl_baja_mandante_detalle` (
  `iddetalle` INTEGER NOT NULL AUTO_INCREMENT,
  `idlote` INTEGER NOT NULL,
  `fila` INTEGER NOT NULL,
  `numeroPtmo` VARCHAR(191) NOT NULL,
  `idprestamo` INTEGER NULL,
  `idgestorAnterior` INTEGER NULL,
  `estadoAnterior` VARCHAR(50) NULL,
  `resultado` VARCHAR(32) NOT NULL,
  `mensaje` TEXT NULL,
  `saldoSnapshot` DECIMAL(14,2) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `tbl_baja_mandante_detalle_idlote_fila_key` (`idlote`, `fila`),
  INDEX `tbl_baja_mandante_detalle_idlote_resultado_idx` (`idlote`, `resultado`),
  INDEX `tbl_baja_mandante_detalle_numeroPtmo_idx` (`numeroPtmo`),
  INDEX `tbl_baja_mandante_detalle_idprestamo_idx` (`idprestamo`),
  PRIMARY KEY (`iddetalle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `tbl_prestamo_idmandante_gestionActiva_deletedAt_idx`
  ON `tbl_prestamo`(`idmandante`, `gestionActiva`, `deletedAt`);
CREATE INDEX `tbl_prestamo_bajaMandanteLoteId_idx`
  ON `tbl_prestamo`(`bajaMandanteLoteId`);

ALTER TABLE `tbl_prestamo`
  ADD CONSTRAINT `tbl_prestamo_bajaMandanteLoteId_fkey`
  FOREIGN KEY (`bajaMandanteLoteId`) REFERENCES `tbl_baja_mandante_lote`(`idlote`)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `tbl_baja_mandante_lote`
  ADD CONSTRAINT `tbl_baja_mandante_lote_idmandante_fkey`
  FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_baja_mandante_lote_idusuario_fkey`
  FOREIGN KEY (`idusuario`) REFERENCES `tbl_usuario`(`idusuario`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tbl_baja_mandante_detalle`
  ADD CONSTRAINT `tbl_baja_mandante_detalle_idlote_fkey`
  FOREIGN KEY (`idlote`) REFERENCES `tbl_baja_mandante_lote`(`idlote`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_baja_mandante_detalle_idprestamo_fkey`
  FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`)
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `tbl_permiso`
  (`codigo`, `nombre`, `descripcion`, `categoria`, `estado`, `createdAt`, `updatedAt`)
VALUES
  ('BAJA_MANDANTE_EXECUTE', 'Ejecutar bajas por mandante', 'Validar, ejecutar y revertir bajas masivas de préstamos solicitadas por un mandante', 'COBRANZA', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `descripcion` = VALUES(`descripcion`), `estado` = true;

INSERT IGNORE INTO `tbl_rol_permiso` (`idrol`, `idpermiso`, `createdAt`, `updatedAt`)
SELECT r.`idrol`, p.`idpermiso`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `tbl_rol` r CROSS JOIN `tbl_permiso` p
WHERE r.`codigo` = 'ADMIN' AND p.`codigo` = 'BAJA_MANDANTE_EXECUTE';
