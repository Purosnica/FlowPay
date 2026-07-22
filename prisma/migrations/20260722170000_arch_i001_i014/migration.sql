-- ARCH I007 / I012 / I014 — domain events, feature flags, plantilla versioning

ALTER TABLE `tbl_plantilla_importacion`
  ADD COLUMN `contratoId` VARCHAR(36) NULL,
  ADD COLUMN `version` INT NOT NULL DEFAULT 1,
  ADD COLUMN `mapeoHash` VARCHAR(64) NULL;

CREATE INDEX `tbl_plantilla_importacion_contratoId_version_idx`
  ON `tbl_plantilla_importacion` (`contratoId`, `version`);

CREATE TABLE `tbl_feature_flag` (
  `idflag` INT NOT NULL AUTO_INCREMENT,
  `clave` VARCHAR(64) NOT NULL,
  `idmandante` INT NOT NULL DEFAULT 0,
  `activo` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`idflag`),
  UNIQUE INDEX `tbl_feature_flag_clave_idmandante_key` (`clave`, `idmandante`),
  INDEX `tbl_feature_flag_clave_idx` (`clave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tbl_domain_event` (
  `idevento` INT NOT NULL AUTO_INCREMENT,
  `tipo` VARCHAR(64) NOT NULL,
  `payload` TEXT NOT NULL,
  `idmandante` INT NULL,
  `estado` VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  `intentos` INT NOT NULL DEFAULT 0,
  `error` TEXT NULL,
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`idevento`),
  INDEX `tbl_domain_event_estado_createdAt_idx` (`estado`, `createdAt`),
  INDEX `tbl_domain_event_tipo_createdAt_idx` (`tipo`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
