-- Backend improvements I016–I035 (additive).

-- I019: optimistic lock
ALTER TABLE `tbl_prestamo` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `tbl_acuerdo` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;

-- I024: soft-delete cliente
ALTER TABLE `tbl_cliente` ADD COLUMN `deletedAt` DATETIME(3) NULL;
CREATE INDEX `tbl_cliente_deletedAt_idx` ON `tbl_cliente`(`deletedAt`);

-- I025 / I032: vigencia políticas y comisiones
ALTER TABLE `tbl_politica_descuento` ADD COLUMN `vigenteDesde` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
ALTER TABLE `tbl_politica_descuento` ADD COLUMN `vigenteHasta` DATETIME(3) NULL;
CREATE INDEX `tbl_politica_descuento_idmandante_vigenteDesde_vigenteHasta_idx`
  ON `tbl_politica_descuento`(`idmandante`, `vigenteDesde`, `vigenteHasta`);

ALTER TABLE `tbl_comision_cobro` ADD COLUMN `vigenteDesde` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
ALTER TABLE `tbl_comision_cobro` ADD COLUMN `vigenteHasta` DATETIME(3) NULL;
CREATE INDEX `tbl_comision_cobro_idmandante_vigenteDesde_vigenteHasta_idx`
  ON `tbl_comision_cobro`(`idmandante`, `vigenteDesde`, `vigenteHasta`);

-- I022: DLQ imports
ALTER TABLE `tbl_importacion_job` ADD COLUMN `intentos` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `tbl_importacion_job` ADD COLUMN `deadLetterAt` DATETIME(3) NULL;
CREATE INDEX `tbl_importacion_job_estado_deadLetterAt_idx`
  ON `tbl_importacion_job`(`estado`, `deadLetterAt`);

-- I029: feriados multi-país
ALTER TABLE `tbl_dia_feriado` ADD COLUMN `idpais` INTEGER NULL;
CREATE INDEX `tbl_dia_feriado_idpais_fecha_idx` ON `tbl_dia_feriado`(`idpais`, `fecha`);
ALTER TABLE `tbl_dia_feriado`
  ADD CONSTRAINT `tbl_dia_feriado_idpais_fkey`
  FOREIGN KEY (`idpais`) REFERENCES `tbl_pais`(`idpais`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- I027: acotar medio pago
ALTER TABLE `tbl_pago` MODIFY `medio` VARCHAR(32) NULL;

-- I033: outbox email en notificaciones
ALTER TABLE `tbl_notificacion` ADD COLUMN `emailEstado` VARCHAR(191) NULL;
ALTER TABLE `tbl_notificacion` ADD COLUMN `emailIntentos` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `tbl_notificacion` ADD COLUMN `emailError` TEXT NULL;
CREATE INDEX `tbl_notificacion_emailEstado_createdAt_idx`
  ON `tbl_notificacion`(`emailEstado`, `createdAt`);

-- I031: cuotas de crédito (distintas de acuerdo)
CREATE TABLE `tbl_prestamo_cuota` (
  `idcuota` INTEGER NOT NULL AUTO_INCREMENT,
  `idprestamo` INTEGER NOT NULL,
  `numero` INTEGER NOT NULL,
  `fechaVencimiento` DATETIME(3) NOT NULL,
  `monto` DECIMAL(14, 2) NOT NULL,
  `saldo` DECIMAL(14, 2) NOT NULL,
  `estado` VARCHAR(191) NOT NULL DEFAULT 'PENDIENTE',
  `deletedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`idcuota`),
  UNIQUE INDEX `tbl_prestamo_cuota_idprestamo_numero_key`(`idprestamo`, `numero`),
  INDEX `tbl_prestamo_cuota_idprestamo_estado_idx`(`idprestamo`, `estado`),
  INDEX `tbl_prestamo_cuota_fechaVencimiento_estado_idx`(`fechaVencimiento`, `estado`),
  CONSTRAINT `tbl_prestamo_cuota_idprestamo_fkey`
    FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- I030: refinanciamiento
CREATE TABLE `tbl_refinanciamiento` (
  `idrefinanciamiento` INTEGER NOT NULL AUTO_INCREMENT,
  `idmandante` INTEGER NOT NULL,
  `idprestamoOrigen` INTEGER NOT NULL,
  `idprestamoNuevo` INTEGER NULL,
  `montoRefinanciado` DECIMAL(14, 2) NOT NULL,
  `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `estado` VARCHAR(191) NOT NULL DEFAULT 'APLICADO',
  `motivo` TEXT NULL,
  `idusuario` INTEGER NULL,
  `deletedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`idrefinanciamiento`),
  INDEX `tbl_refinanciamiento_idmandante_idx`(`idmandante`),
  INDEX `tbl_refinanciamiento_idprestamoOrigen_idx`(`idprestamoOrigen`),
  INDEX `tbl_refinanciamiento_estado_deletedAt_idx`(`estado`, `deletedAt`),
  CONSTRAINT `tbl_refinanciamiento_idmandante_fkey`
    FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tbl_refinanciamiento_idprestamoOrigen_fkey`
    FOREIGN KEY (`idprestamoOrigen`) REFERENCES `tbl_prestamo`(`idprestamo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tbl_refinanciamiento_idprestamoNuevo_fkey`
    FOREIGN KEY (`idprestamoNuevo`) REFERENCES `tbl_prestamo`(`idprestamo`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
