-- I106: resumen diario materializado
CREATE TABLE `tbl_resumen_diario_cobranza` (
    `idresumen` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `fecha` DATE NOT NULL,
    `totalPrestamos` INTEGER NOT NULL DEFAULT 0,
    `prestamosEnMora` INTEGER NOT NULL DEFAULT 0,
    `saldoCartera` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `saldoMora` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `gestionesDia` INTEGER NOT NULL DEFAULT 0,
    `pagosDia` INTEGER NOT NULL DEFAULT 0,
    `montoRecuperadoDia` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `promesasVencidas` INTEGER NOT NULL DEFAULT 0,
    `acuerdosEnRiesgo` INTEGER NOT NULL DEFAULT 0,
    `reclamosFueraSla` INTEGER NOT NULL DEFAULT 0,
    `recuperacionMesActual` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `recuperacionMesAnterior` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `calculatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tbl_resumen_diario_cobranza_idmandante_fecha_key`(`idmandante`, `fecha`),
    INDEX `tbl_resumen_diario_cobranza_fecha_idx`(`fecha`),
    PRIMARY KEY (`idresumen`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tbl_resumen_diario_cobranza`
  ADD CONSTRAINT `tbl_resumen_diario_cobranza_idmandante_fkey`
  FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- I113: exports async
CREATE TABLE `tbl_exportacion_job` (
    `idexport` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NULL,
    `idusuario` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'PENDIENTE',
    `parametros` TEXT NULL,
    `filasEstimadas` INTEGER NOT NULL DEFAULT 0,
    `progresoPct` INTEGER NOT NULL DEFAULT 0,
    `rutaArchivo` VARCHAR(191) NULL,
    `nombreArchivo` VARCHAR(191) NULL,
    `error` TEXT NULL,
    `iniciadoEn` DATETIME(3) NULL,
    `finalizadoEn` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_exportacion_job_estado_createdAt_idx`(`estado`, `createdAt`),
    INDEX `tbl_exportacion_job_idusuario_createdAt_idx`(`idusuario`, `createdAt`),
    PRIMARY KEY (`idexport`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tbl_exportacion_job`
  ADD CONSTRAINT `tbl_exportacion_job_idmandante_fkey`
  FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tbl_exportacion_job`
  ADD CONSTRAINT `tbl_exportacion_job_idusuario_fkey`
  FOREIGN KEY (`idusuario`) REFERENCES `tbl_usuario`(`idusuario`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
